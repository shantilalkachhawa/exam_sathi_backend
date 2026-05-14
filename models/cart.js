const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Product = require('./product');

const CartModel = sequelize.define('Cart',{
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        // references: {
        //   model: 'users', 
        //   key: 'id',
        // },
      },
      productId: {
        type: DataTypes.UUID, 
        allowNull: false,
        // references: { 
        //   model: Product,
        //   key: 'id',
        // },
      },
      quantity:{
        type:DataTypes.INTEGER,
        allowNull:false,
      }
},{tableName:'cart'})

module.exports = CartModel;