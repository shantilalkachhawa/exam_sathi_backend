const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");

const RefreshToken = sequelize.define(
    "RefreshToken",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "users",
                key: "id",
            },
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        },

        token: {
            type: DataTypes.TEXT,
            allowNull: false,
        },

        expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },

        revoked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    },
    {
        tableName: "refresh_tokens",
        timestamps: true,
        underscored: true,
    }
);

User.hasMany(RefreshToken, {
    foreignKey: "user_id",
});

RefreshToken.belongsTo(User, {
    foreignKey: "user_id",
});

module.exports = RefreshToken;