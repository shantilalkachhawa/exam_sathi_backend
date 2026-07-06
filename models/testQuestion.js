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
  },
  {
    tableName: "test_questions",
    timestamps: false,
  }
);

module.exports = TestQuestion;