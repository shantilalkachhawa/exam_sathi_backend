const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TestRanking = sequelize.define(
  "TestRanking",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    test_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    score: DataTypes.FLOAT,
    rank_position: DataTypes.INTEGER,
    percentile: DataTypes.FLOAT,
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
  },
  {
    tableName: "test_rankings",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = TestRanking;