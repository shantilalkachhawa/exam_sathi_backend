const { Op } = require('sequelize');
const { Product,Cart} = require('../models');
const { getUserIdFromToken } = require('../middlewares/http');

const cartController = {
  // Add Product to Cart
  async addToCart(req, res) {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
      }

      const { productId, quantity } = req.body;

      const findProduct = await Product.findOne({ where: { id: productId } });
      if (!findProduct) {
        return res.status(400).json({ error: 'Product ID is not valid' });
      }

      const cartItem = await Cart.create({ userId, productId, quantity });
      res.status(201).json({ message: 'Cart added successfully', cartItem });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Get All Cart Items
  async getAllCarts(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'createdAt';
      const order = req.query.order === 'ASC' ? 'ASC' : 'DESC';

      const whereCondition = search
        ? {
            [Op.or]: [
              { '$User.fullName$': { [Op.like]: `%${search}%` } },
              { '$User.email$': { [Op.like]: `%${search}%` } },
              { '$User.phoneNumber$': { [Op.like]: `%${search}%` } },
            ],
          }
        : {};

      const { count, rows: carts } = await Cart.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [[sortBy, order]],
        include: [
          {
            model: Product,
            attributes: ['id', 'productName', 'imgUrl','categoryId','markPriceWithWeight','sellPriceWithWeight','isFlashDeal','discount','isStock','rating','status'],
          },
        ],
      });
      let totalSellPrice = 0;
      let totalMarkPrice = 0;
      let deliveryFee = 10;
      let platformFee = 5;
      
      carts.forEach((cart) => {
        const sellPrice = cart.Product?.sellPriceWithWeight?.price || 0;
        const markPrice = cart.Product?.markPriceWithWeight?.price || 0;
        const quantity = cart?.quantity || 1;
        totalSellPrice += sellPrice * quantity;
        totalMarkPrice += markPrice * quantity;
      });
      if(totalSellPrice > 150){
        deliveryFee=0;
      }
      
      const totalDiscount = totalMarkPrice - totalSellPrice;

      



      res.status(200).json({
        message: 'Cart list',
        pagination: {
          totalCount: count,
          limit,
          offset,
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(count / limit),
        },
        carts,
        totalSellPrice,
        totalMarkPrice,
        totalDiscount,
        platformFee,
        deliveryFee,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = cartController;
