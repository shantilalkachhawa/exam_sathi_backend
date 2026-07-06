const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const SubscriptionModel = sequelize.define('Subscription', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    total_test: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    validity_days, status,
    name: {

    }

})