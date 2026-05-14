const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UserModel = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    // unique: true,
    allowNull: false,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    // unique:true
  },
  userType: {// regSource
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
    // 1 -> admin, 2 -> website user, 3 -> mobile user, 4 -> vendor
  },
  subscription_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // signupType: {
  //   type: DataTypes.INTEGER,
  //   allowNull: false,
  //   defaultValue: 1, // 1 -> Email, 2 -> phoneNumber, 3 -> Google
  // },
  // create contact number details
  //for subscription  daily routine  ,free delivery , discount by user, barish , mobile dischare , orders value mange by history ,supply chain (as a vendore 1,2,3,4 then decide privority )  billing all the process  
  status: {
    type: DataTypes.INTEGER,
    defaultValue: 1, // 1 -> Active 2 -> In-active
    allowNull: true,

  }
}, {
  tableName: 'users',
  timestamps: true
});

module.exports = UserModel;
