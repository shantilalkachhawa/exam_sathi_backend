// models/store.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StoreModel = sequelize.define('Store', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },

    storeName: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    // vendor contact number for notifications
    storeNumber: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    vendorId: {
        type: DataTypes.UUID,
        allowNull: false,
    },

    address: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    status: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    }
}, {
    tableName: 'stores',
    timestamps: true,
});

module.exports = StoreModel;
