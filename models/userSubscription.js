const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const UserSubscription = sequelize.define(
  "UserSubscription",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    subscription_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount_paid: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    purchased_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expiry_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    test_used: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    status: {
      type: DataTypes.ENUM("active", "expired", "cancelled"),
      defaultValue: "active",
    },
  },
  {
    tableName: "user_subscriptions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = UserSubscription;
