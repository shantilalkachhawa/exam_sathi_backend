const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AddressModel = sequelize.define('Address', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', 
      key: 'id',
    },
  },
  addressLine: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING,
  },
  state: {
    type: DataTypes.STRING,
  },
  country: {
    type: DataTypes.STRING,
  },
  pinCode: {
    type: DataTypes.STRING,
  },
  // isDefault:{
  //  // user by default 
  // }
}, {
  tableName: 'addresses',
});
// sequelize.sync({ force: true }) 

module.exports = AddressModel;
