const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SubscriptionModel = sequelize.define(
  "Subscription",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    total_test: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    validity_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    plan_type: {
      type: DataTypes.ENUM(
        "monthly",
        "quarterly",
        "half_yearly",
        "yearly",
        "lifetime",
        "trial",
        "custom"
      ),
      allowNull: false,
      defaultValue: "monthly",
    },
    access_type: {
      type: DataTypes.ENUM("free", "paid", "trial"),
      allowNull: false,
      defaultValue: "paid",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    tableName: "subscriptions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = SubscriptionModel;
