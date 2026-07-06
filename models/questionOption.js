const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const QuestionOption = sequelize.define(
  "QuestionOption",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    question_id: DataTypes.INTEGER,
    option_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_correct: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "question_options",
    timestamps: false,
  }
);

module.exports = QuestionOption;