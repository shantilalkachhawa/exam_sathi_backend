    const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TestAttempt = sequelize.define(
  "TestAttempt",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: DataTypes.INTEGER,
    pt_id: DataTypes.INTEGER,
    started_at: DataTypes.DATE,
    submitted_at: DataTypes.DATE,
    total_questions: DataTypes.INTEGER,
    attempted_questions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    correct_answers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    wrong_answers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    skipped_answers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    score: DataTypes.FLOAT,
    accuracy: DataTypes.FLOAT,
    percentage: DataTypes.FLOAT,
    rank_position: DataTypes.INTEGER,
    time_taken: DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM("in_progress", "completed"),
      defaultValue: "in_progress",
    },
  },
  {
    tableName: "test_attempts",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = TestAttempt;