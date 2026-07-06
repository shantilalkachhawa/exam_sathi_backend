const {DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const userRoles = sequelize.define('user_roles', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    status :{
        type:DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
        allowNull: false
    },
    
        tableName: 'user_roles',
        timestamps:true
    });

    module.exports = userRoles;