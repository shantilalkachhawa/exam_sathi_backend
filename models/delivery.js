const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DeliveryBoy = sequelize.define('DeliveryBoy', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },

    deliveryBoyName: {
        type: DataTypes.STRING,
        allowNull: false
    },

    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },

    vehicleNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },

    // FK → users table
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },

    dutyStatus: {
        type: DataTypes.INTEGER,
        defaultValue: 1 // 1 = available, 2 = unavailable
    },

    status: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
}, {
    tableName: 'delivery_boys',
    timestamps: true
});

module.exports = DeliveryBoy;
