const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Payment = sequelize.define(
  "Payment",
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
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM(
        "razorpay",
        "stripe",
        "upi",
        "card",
        "cash",
        "manual"
      ),
      allowNull: false,
      defaultValue: "manual",
    },
    payment_status: {
      type: DataTypes.ENUM("pending", "success", "failed", "refunded"),
      defaultValue: "pending",
    },
    transaction_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    gateway_response: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "payments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Payment;
