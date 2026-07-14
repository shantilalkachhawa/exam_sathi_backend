const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Category = sequelize.define('Category', {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },

  category_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  img_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  status: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },

}, {
  tableName: "categories",
  timestamps: true,
});

module.exports = Category;
