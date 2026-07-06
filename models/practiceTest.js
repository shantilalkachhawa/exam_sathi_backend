const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const PracticeTest = sequelize.define(
  "PracticeTest",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    category_id: DataTypes.INTEGER,
    sub_category_id: DataTypes.INTEGER,
    title: DataTypes.STRING(150),
    description: DataTypes.TEXT,
    total_questions: DataTypes.INTEGER,
    total_marks: DataTypes.INTEGER,
    positive_marks: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    negative_marks: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    duration_minutes: DataTypes.INTEGER,
    is_paid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_by: DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
  },
  {
    tableName: "practice_tests",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = PracticeTest;