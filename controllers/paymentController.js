const sequelize = require("../config/db");
const { User, Subscription, Payment } = require("../models");
const {
  canPurchaseSubscription,
  getSubscriptionWithAccess,
  findExpiredSubscription,
  createUserSubscription,
  renewUserSubscription,
} = require("../services/subscription.service");
const {
  createPendingPayment,
  markPaymentSuccess,
  markPaymentFailed,
  getUserPayments,
  findByTransactionId,
  createSuccessPayment,
} = require("../services/payment.service");

async function activateAfterPayment({
  userId,
  subscription,
  amountPaid,
  transaction,
}) {
  const expired = await findExpiredSubscription(userId, subscription.id);

  let userSubscription;

  if (expired) {
    userSubscription = await renewUserSubscription(
      expired,
      {
        planType: subscription.plan_type,
        validityDays: subscription.validity_days,
        amountPaid,
      },
      transaction
    );
  } else {
    userSubscription = await createUserSubscription(
      {
        userId,
        subscriptionId: subscription.id,
        amountPaid,
        planType: subscription.plan_type,
        validityDays: subscription.validity_days,
      },
      transaction
    );
  }

  await User.update(
    { subscription_id: subscription.id },
    { where: { id: userId }, transaction }
  );

  return userSubscription;
}

/**
 * Create payment order (pending) before gateway checkout
 * Body: { subscription_id, payment_method? }
 */
exports.createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { subscription_id, payment_method = "razorpay" } = req.body;

    if (!subscription_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "subscription_id is required",
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const subscription = await getSubscriptionWithAccess(subscription_id);
    if (!subscription || subscription.status !== "active") {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (subscription.access_type !== "paid") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Only paid plans create payment orders",
      });
    }

    const canPurchase = await canPurchaseSubscription(userId, subscription_id);
    if (!canPurchase.allowed) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: canPurchase.message,
      });
    }

    const payment = await createPendingPayment(
      {
        userId,
        subscriptionId: subscription.id,
        amount: subscription.price,
        paymentMethod: payment_method,
      },
      transaction
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Payment order created",
      data: {
        payment,
        subscription: {
          id: subscription.id,
          name: subscription.name,
          price: subscription.price,
          plan_type: subscription.plan_type,
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Verify gateway payment → success → activate subscription
 * Body: { payment_id, transaction_id, gateway_response? }
 */
exports.verifyPayment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { payment_id, transaction_id, gateway_response = null } = req.body;

    if (!payment_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "payment_id is required",
      });
    }

    const payment = await Payment.findOne({
      where: { id: payment_id, user_id: userId },
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.payment_status === "success") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment already verified",
      });
    }

    if (payment.payment_status === "failed") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment already marked failed",
      });
    }

    if (transaction_id) {
      const duplicate = await findByTransactionId(transaction_id);
      if (duplicate && Number(duplicate.id) !== Number(payment.id)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "transaction_id already used",
        });
      }
    }

    const subscription = await getSubscriptionWithAccess(payment.subscription_id);
    if (!subscription) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    const canPurchase = await canPurchaseSubscription(
      userId,
      payment.subscription_id
    );
    if (!canPurchase.allowed) {
      await markPaymentFailed(payment, { reason: canPurchase.message }, transaction);
      await transaction.commit();
      return res.status(400).json({
        success: false,
        message: canPurchase.message,
      });
    }

    await markPaymentSuccess(
      payment,
      {
        transactionId: transaction_id,
        gatewayResponse: gateway_response,
      },
      transaction
    );

    const userSubscription = await activateAfterPayment({
      userId,
      subscription,
      amountPaid: payment.amount,
      transaction,
    });

    await transaction.commit();

    return res.json({
      success: true,
      message: "Payment verified and subscription activated",
      data: {
        payment,
        userSubscription,
      },
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Mark payment failed
 * Body: { payment_id, gateway_response? }
 */
exports.failPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { payment_id, gateway_response = null } = req.body;

    const payment = await Payment.findOne({
      where: { id: payment_id, user_id: userId },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    await markPaymentFailed(payment, gateway_response);

    return res.json({
      success: true,
      message: "Payment marked as failed",
      data: payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Manual / offline success payment + activate (admin/support style)
 * Body: { subscription_id, payment_method?, transaction_id? }
 */
exports.manualCapture = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const {
      subscription_id,
      payment_method = "manual",
      transaction_id = null,
    } = req.body;

    if (!subscription_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "subscription_id is required",
      });
    }

    const subscription = await getSubscriptionWithAccess(subscription_id);
    if (!subscription || subscription.access_type !== "paid") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Valid paid subscription required",
      });
    }

    const canPurchase = await canPurchaseSubscription(userId, subscription_id);
    if (!canPurchase.allowed) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: canPurchase.message,
      });
    }

    const payment = await createSuccessPayment(
      {
        userId,
        subscriptionId: subscription.id,
        amount: subscription.price,
        paymentMethod: payment_method,
        transactionId: transaction_id,
      },
      transaction
    );

    const userSubscription = await activateAfterPayment({
      userId,
      subscription,
      amountPaid: subscription.price,
      transaction,
    });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Payment captured and subscription activated",
      data: { payment, userSubscription },
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Logged-in user payment history
 */
exports.getMyPayments = async (req, res) => {
  try {
    const payments = await getUserPayments(req.user.id);

    return res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get single payment
 */
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id,
      },
      include: [
        {
          model: Subscription,
          as: "subscription",
        },
      ],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Admin: list all payments (optional filters: status, search, page, limit)
 */
exports.getAllPayments = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const search = (req.query.search || "").trim();

    const where = {};
    if (status) where.payment_status = status;

    const { Op } = require("sequelize");
    const userWhere = search
      ? {
          [Op.or]: [
            { full_name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
          ],
        }
      : undefined;

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email", "phone_number"],
          where: userWhere,
          required: !!search,
        },
        {
          model: Subscription,
          as: "subscription",
          attributes: ["id", "name", "price", "plan_type"],
        },
      ],
      order: [["id", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return res.json({
      success: true,
      total: count,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(count / limit)),
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
