const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const SubscriptionModel = sequelize.define('Subscription', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    name, price, description, total_test,
    validity_days, status,
    name: {

    }

})