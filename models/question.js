const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Question = sequelize.define(
  "Question",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    category_id: DataTypes.INTEGER,
    sub_category_id: DataTypes.INTEGER,
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    language :{
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "en"
    },
    type: DataTypes.SMALLINT,
    level: {
      type: DataTypes.SMALLINT,
      defaultValue: 1,
    },  
    created_by: DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
  },
  {
    tableName: "questions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Question;