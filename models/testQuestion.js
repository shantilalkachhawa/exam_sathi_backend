const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TestQuestion = sequelize.define(
  "TestQuestion",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    pt_id: DataTypes.INTEGER,
    question_id: DataTypes.INTEGER,
    section_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    question_order: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    tableName: "test_questions",
    timestamps: false,
  }
);

module.exports = TestQuestion;