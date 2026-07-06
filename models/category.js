const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Category = sequelize.define('Category', {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },

  categoryName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  imgUrl: {
    type: DataTypes.STRING,
    allowNull: false,
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
