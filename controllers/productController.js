const { Op } = require('sequelize');
const Product = require('../models/product');
const Category = require('../models/category');

const productController = {
  async createProduct(req, res) {
    try {
      const { categoryId, markPriceWithWeight, sellPriceWithWeight, ...data } = req.body;

      if (!categoryId) {
        return res.status(400).json({ error: 'Category is required' });
      }

      const findCategory = await Category.findByPk(categoryId);
      if (!findCategory) {
        return res.status(400).json({ error: 'Category id not found' });
      }

      if (
        !markPriceWithWeight || typeof markPriceWithWeight.price !== 'number' ||
        !sellPriceWithWeight || typeof sellPriceWithWeight.price !== 'number'
      ) {
        return res.status(400).json({
          error: 'Both markPriceWithWeight.price and sellPriceWithWeight.price must be numbers'
        });
      }

      if (markPriceWithWeight.price < sellPriceWithWeight.price) {
        return res.status(400).json({
          error: 'Mark price should be greater than selling price'
        });
      }

      const markedPrice = markPriceWithWeight.price;
      const sellingPrice = sellPriceWithWeight.price;
      const discount = Number((((markedPrice - sellingPrice) / markedPrice) * 100).toFixed(2));

      const product = await Product.create({
        categoryId,
        markPriceWithWeight,
        sellPriceWithWeight,
        discount,
        ...data
      });

      return res.status(201).json({ message: 'Product created successfully', product });

    } catch (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Get All Products
  async getAllProducts(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'createdAt';
      const order = req.query.order === 'ASC' ? 'ASC' : 'DESC';
      const isFlashDealParam = req.query.isFlashDeal;
      const includeFlashDeal = isFlashDealParam === '0' || isFlashDealParam === '1';

      const whereCondition = {
        ...(search && {
          [Op.or]: [
            { productName: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } }
          ]
        }),
        ...(includeFlashDeal && {
          isFlashDeal: Number(isFlashDealParam)
        })
      };

      const { count, rows } = await Product.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [[sortBy, order]],
        // include: [{ model: Category, as: 'category' }]
      });

      return res.status(200).json({
        message: 'Products list',
        pagination: {
          totalCount: count,
          limit,
          offset,
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(count / limit)
        },
        rows
      });

    } catch (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({ message: 'Error fetching products', error });
    }
  },

  // Get Product By ID
  async getProductById(req, res) {
    try {
      const product = await Product.findByPk(req.params.id);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching product', error });
    }
  },

  // Update Product
  async updateProduct(req, res) {
    try {
      const [updated] = await Product.update(req.body, {
        where: { id: req.params.id },
      });
      if (!updated) return res.status(404).json({ message: 'Product not found' });
      const updatedProduct = await Product.findByPk(req.params.id);
      res.json(updatedProduct);
    } catch (error) {
      res.status(400).json({ message: 'Error updating product', error });
    }
  },
  async bulkUpdatePrices(req, res) {
    try {
      const { percentage } = req.body; // Example: 5, 10, -10 etc.
      console.log(percentage, 'percentage')

      if (!percentage)
        return res.status(400).json({ message: "Percentage is required" });

      const multiplier = 1 + percentage / 100;

      // Fetch all products
      const products = await Product.findAll();
      console.log(products, 'products')

      const updatedProducts = [];

      for (let product of products) {
        const updatedSell = {
          ...product.sellPriceWithWeight,
          price: Math.round(product.sellPriceWithWeight.price * multiplier),
        };

        const updatedMark = {
          ...product.markPriceWithWeight,
          price: Math.round(product.markPriceWithWeight.price * multiplier),
        };

        await product.update({
          sellPriceWithWeight: updatedSell,
          markPriceWithWeight: updatedMark,
        });
        console.log(product, 'product')

        updatedProducts.push(product);
      }

      res.json({
        message: `All prices updated by ${percentage}%`,
        updatedCount: updatedProducts.length,
      });

    } catch (error) {
      res.status(400).json({ message: "Error updating prices", error });
    }
  },


  // Delete Product
  async deleteProduct(req, res) {
    try {
      const deleted = await Product.destroy({ where: { id: req.params.id } });
      if (!deleted) return res.status(404).json({ message: 'Product not found' });
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting product', error });
    }
  }
}

module.exports = productController

