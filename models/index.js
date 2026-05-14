const sequelize = require('../config/db');

const User = require('./user');
const Address = require('./address');
const Category = require('./category');
const Product = require('./product');
const Cart = require('./cart');
const Order = require('./order');
const Store = require('./store');

const applyAssociations = require('../middlewares/associations');

applyAssociations({ User, Address, Category, Product, Cart, Order, Store });

module.exports = {
  sequelize,
  User,
  Address,
  Category,
  Product,
  Cart,
  Order,
  Store,
};
