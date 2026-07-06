const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UserModel = sequelize.define('Users', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    // unique: true,
    allowNull: false,
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: true,
    // unique:true
  },
  gender:{
    type: DataTypes.STRING,
    allowNull: true
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true   
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true
  },
  user_type: {// regSource
    type: DataTypes.ENUM('admin', 'web', 'mobile', 'vendor'),
    allowNull: false,
    defaultValue: 'web',
   
  },
  subscription_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended','locked'),
    defaultValue: 'active', // 1 -> Active 2 -> In-active
    allowNull: true,

  }
}, {
  tableName: 'users',
  timestamps: true
});

module.exports = UserModel;
