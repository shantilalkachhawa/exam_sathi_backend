// controllers/orderController.js
const sequelize = require('../config/db');
const { Product, Order, Store, Cart } = require('../models'); // adjust paths to your models
const { getUserIdFromToken } = require('../middlewares/http');
const { createRazorpayOrder, verifyRazorpayPayment } = require('../utils/index');
const { sendVendorNotification } = require('../utils/index'); // simple stub -> integrate Twilio here

/**
 * Assumptions:
 * - Product model has: mainStock, backupStock, lowStockThreshold (default if not present, fallback to 10)
 * - Order.cartItems is a JSON array. We'll store enriched items:
 *   { productId, quantity, takenFromMain, takenFromBackup, unitPrice (optional) }
 * - If req.body.cartItems not provided, fallback to Cart table entries for the user.
 */

/* -------------------------
   CREATE ORDER (reserve stock + create order + create razorpay order)
   ------------------------- */
async function createOrder(req, res) {
  // userId extraction (you were hardcoding; keep same behaviour)
  // const userId = getUserIdFromToken(req);
  const userId = '43f0c243-7d4a-4bbf-9377-6e619eb8e447';

  if (!userId) return res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });

  // Accept cartItems from request OR fallback to Cart table
  let cartItems = req.body.cartItems;
  try {
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      // fallback: read user's cart stored in DB
      const cartRows = await Cart.findAll({ where: { userId } });
      if (!cartRows || cartRows.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
      }
      cartItems = cartRows.map(c => ({ productId: c.productId, quantity: c.quantity }));
    }

    // Basic validation
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty or invalid' });
    }

    const t = await sequelize.transaction();

    try {
      // 1) Fetch and lock all products involved
      const productIds = cartItems.map(ci => ci.productId);
      const products = await Product.findAll({
        where: { id: productIds },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      const prodMap = new Map(products.map(p => [p.id, p]));

      // stores to notify (storeId -> { storeNumber, messages: [] })
      const storesToNotify = new Map();

      // enrichedCartItems will hold how much we deducted from main/backup for each item
      const enrichedCartItems = [];

      // 2) Validate availability and reserve stock
      for (const item of cartItems) {
        const prod = prodMap.get(item.productId);
        if (!prod) {
          await t.rollback();
          return res.status(404).json({ message: `Product ${item.productId} not found` });
        }

        const need = Number(item.quantity || 0);
        const mainStock = Number(prod.mainStock || 0);
        const backupStock = Number(prod.backupStock || 0);
        const totalAvailable = mainStock + backupStock;

        if (totalAvailable < need) {
          // Not enough ANYWHERE => notify vendor and abort
          const store = prod.storeId ? await Store.findByPk(prod.storeId, { transaction: t }) : null;
          if (store) {
            storesToNotify.set(store.id, {
              storeNumber: store.storeNumber,
              messages: [`Order attempt failed: ${prod.productName} available ${totalAvailable}, requested ${need}`]
            });
          }
          await t.rollback();
          return res.status(400).json({
            message: `Not enough stock for ${prod.productName}. Available: ${totalAvailable}, requested: ${need}`
          });
        }

        // Deduct from main first, then backup
        let takenFromMain = 0;
        let takenFromBackup = 0;
        let remainingNeed = need;

        if (prod.mainStock >= remainingNeed) {
          takenFromMain = remainingNeed;
          prod.mainStock = prod.mainStock - remainingNeed;
          remainingNeed = 0;
        } else {
          // take all main
          takenFromMain = prod.mainStock;
          remainingNeed = remainingNeed - prod.mainStock;
          prod.mainStock = 0;

          // take remainder from backup
          takenFromBackup = remainingNeed;
          prod.backupStock = prod.backupStock - remainingNeed;
          remainingNeed = 0;
        }

        // Save product update within transaction
        await prod.save({ transaction: t });

        // prepare low-stock notification if mainStock below threshold
        const lowThreshold = prod.lowStockThreshold ?? prod.lowStockLimit ?? 10;
        if (prod.mainStock < lowThreshold) {
          const store = prod.storeId ? await Store.findByPk(prod.storeId, { transaction: t }) : null;
          if (store) {
            const msg = `Low Stock Alert: ${prod.productName} mainStock is ${prod.mainStock}. Backup: ${prod.backupStock}`;
            if (!storesToNotify.has(store.id)) {
              storesToNotify.set(store.id, { storeNumber: store.storeNumber, messages: [msg] });
            } else {
              storesToNotify.get(store.id).messages.push(msg);
            }
          }
        }

        // push enriched item snapshot so we can restore later if needed
        enrichedCartItems.push({
          productId: prod.id,
          productName: prod.productName,
          quantity: need,
          takenFromMain,
          takenFromBackup,
          unitPrice: deriveUnitPrice(prod, item) // helper below
        });
      } // end for each item

      // 3) Create Order record with reserved stock snapshot
      const orderPayload = {
        userId,
        cartItems: enrichedCartItems,   // snapshot including reserved breakdown
        shippingAddress: req.body.shippingAddress || {},
        paymentStatus: 1, // Pending
        totalAmount: req.body.totalAmount || calculateTotal(enrichedCartItems),
        // store any razorpay ids later in confirmPayment
      };

      const newOrder = await Order.create(orderPayload, { transaction: t });

      // 4) Commit reservation transaction
      await t.commit();

      // 5) After commit -> send low-stock and insufficient notifications (async)
      for (const [, value] of storesToNotify) {
        const combinedMessage = value.messages.join(' | ');
        sendVendorNotification(value.storeNumber, combinedMessage).catch(err => console.error('Notify error', err));
      }

      // 6) Create Razorpay order (outside transaction)
      const razorpayOrder = await createRazorpayOrder(newOrder.totalAmount);

      // Store razorpayOrderId on order (optional)
      await newOrder.update({ razorpayOrderId: razorpayOrder.id });

      return res.status(201).json({
        message: 'Order created successfully (stock reserved). Complete payment to confirm.',
        order: newOrder,
        razorpayOrder
      });

    } catch (err) {
      console.error('createOrder txn err', err);
      try { await t.rollback(); } catch (e) { }
      return res.status(500).json({ message: 'Error creating order', error: err.message });
    }

  } catch (err) {
    console.error('createOrder error', err);
    return res.status(500).json({ message: 'Internal error', error: err.message });
  }
}

/* -------------------------
   CONFIRM PAYMENT (verify razorpay payload; on failure restore stock)
   ------------------------- */
async function confirmPayment(req, res) {
  // const userId = getUserIdFromToken(req);
  const userId = '43f0c243-7d4a-4bbf-9377-6e619eb8e447';
  if (!userId) return res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });

  try {
    const { id, ...payload } = req.body;
    if (!id) return res.status(400).json({ message: 'Order id missing' });

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isValid = await verifyRazorpayPayment(payload);

    if (isValid) {
      await order.update({
        razorpayOrderId: payload?.razorpay_order_id,
        razorpayPaymentId: payload?.razorpay_payment_id,
        paymentStatus: 3 // success
      });

      return res.status(200).json({ message: 'Payment successful', razorpayOrder: true });
    } else {
      // Payment verification failed -> restore reserved stock
      const t = await sequelize.transaction();
      try {
        const reservedItems = order.cartItems || [];
        for (const it of reservedItems) {
          const prod = await Product.findByPk(it.productId, { transaction: t, lock: t.LOCK.UPDATE });
          if (!prod) continue;

          // restore main and backup amounts that were taken
          prod.mainStock = (Number(prod.mainStock || 0) + Number(it.takenFromMain || 0));
          prod.backupStock = (Number(prod.backupStock || 0) + Number(it.takenFromBackup || 0));

          await prod.save({ transaction: t });

          // optionally notify vendor that payment failed and stock restored
          const store = prod.storeId ? await Store.findByPk(prod.storeId, { transaction: t }) : null;
          if (store) {
            const msg = `Payment failed for order ${order.id} - restored ${it.takenFromMain} main, ${it.takenFromBackup} backup for ${prod.productName}`;
            sendVendorNotification(store.storeNumber, msg).catch(e => console.error('notify error', e));
          }
        }

        await order.update({
          razorpayOrderId: payload?.razorpay_order_id,
          razorpayPaymentId: payload?.razorpay_payment_id,
          paymentStatus: 2 // failed
        }, { transaction: t });

        await t.commit();
      } catch (err) {
        console.error('Error restoring stock on failed payment', err);
        try { await t.rollback(); } catch (e) { }
      }

      return res.status(400).json({ message: 'Payment verification failed', razorpayOrder: false });
    }

  } catch (err) {
    console.error('confirmPayment error', err);
    return res.status(500).json({ message: 'Internal error', error: err.message });
  }
}

/* -------------------------
   Helper: calculateTotal (fallback)
   ------------------------- */
function calculateTotal(enrichedCartItems) {
  let total = 0;
  for (const it of enrichedCartItems) {
    const unit = Number(it.unitPrice || 0);
    total += unit * (it.quantity || 1);
  }
  return total;
}

/* -------------------------
   Helper: deriveUnitPrice
   - Tries to extract a sane unit price from product.sellPriceWithWeight
   - Fallback to 0 when unknown
   ------------------------- */
function deriveUnitPrice(prod, item) {
  // If your sellPriceWithWeight uses weight keys, choose the best match
  // For now: pick first numeric value inside sellPriceWithWeight object
  try {
    const sp = prod.sellPriceWithWeight || prod.sellPrice || {};
    if (typeof sp === 'object') {
      const vals = Object.values(sp).map(v => Number(v)).filter(v => !isNaN(v));
      return vals.length ? vals[0] : 0;
    }
    if (!isNaN(Number(sp))) return Number(sp);
  } catch (e) { }
  return 0;
}

module.exports = {
  createOrder,
  confirmPayment,
};
