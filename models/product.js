const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define('Product', {

  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },

  productName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  categoryId: {
    type: DataTypes.UUID,
    allowNull: true,
  },

  imgUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  sellPriceWithWeight: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },

  markPriceWithWeight: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },

  storeId: {
    type: DataTypes.UUID,
    allowNull: true,
  },

  mainStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },

  backupStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },

  lowStockThreshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
  },

  isFlashDeal: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },

  discount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },

  isStock: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },

  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },

  status: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
}, {
  tableName: 'products',
  timestamps: true,
});

module.exports = Product;
