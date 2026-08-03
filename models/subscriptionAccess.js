const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SubscriptionAccess = sequelize.define(
    "SubscriptionAccess",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        subscription_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "subscriptions",
                key: "id",
            },
            onDelete: "CASCADE",
        },

        access_level: {
            type: DataTypes.ENUM("category", "sub_category"),
            allowNull: false,
        },

        access_id: {
            // Category / sub-category ids stored as string (integer ids supported)
            type: DataTypes.STRING(64),
            allowNull: false,
        },

        status: {
            type: DataTypes.ENUM("active", "inactive"),
            defaultValue: "active",
        },
    },
    {
        tableName: "subscription_access",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
            {
                unique: true,
                fields: ["subscription_id", "access_level", "access_id"],
            },
        ],
    }
);

module.exports = SubscriptionAccess;