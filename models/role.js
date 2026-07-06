const {DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Roles = sequelize.define('Roles', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING, 
        allowNull: false,
    },
    status :{
        type:DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
        allowNull: false
    },
    
        tableName: 'roles',
        timestamps:true
    });

    module.exports = Roles;