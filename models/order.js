const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OrderModel = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID, 
    allowNull: false,
  },
  cartItems: {
    type: DataTypes.JSON, 
    allowNull: false,
  },
  shippingAddress: {
    type: DataTypes.JSON,
    allowNull: false,
  },
   razorpayOshippingAddressrderId: {
    type: DataTypes.STRING,

  },
   razorpayPaymentId: {
    type: DataTypes.STRING,

  },
  paymentStatus: {
    type: DataTypes.INTEGER,
    defaultValue: 1, // 1-Pending, 2-Completed , 3-Failed 
  },
  totalAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  deliveredTime: {
    type: DataTypes.TIME,
    defaultValue: null,
  },
  deliveredDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.INTEGER,
    defaultValue: 1, // 1-Active 2 - In-active
  }
}, {
  tableName: 'orders',
  timestamps: true,
});
// create  order price item table for jis din order kiya h
// OrderModel.sync({ alter: true });
module.exports = OrderModel;
