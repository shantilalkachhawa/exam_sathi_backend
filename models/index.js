const sequelize = require("../config/db");

const User = require("./user");
const Address = require("./address");
const Category = require("./category");
const SubCategory = require("./subCategory");
const Question = require("./question");
const QuestionOption = require("./questionOption");
const PracticeTest = require("./practiceTest");
const TestQuestion = require("./testQuestion");
const TestAttempt = require("./testAttempt");
const UserAnswer = require("./userAnswer");
const TestRanking = require("./testRanking");
const Roles = require("./role");
const UserRoles = require("./userRole");

const applyAssociations = require("../middlewares/associations");

applyAssociations({
  sequelize,
  User,
  Address,
  Category,
  SubCategory,
  Question,
  QuestionOption,
  PracticeTest,
  TestQuestion,
  TestAttempt,
  UserAnswer,
  TestRanking,
  Roles,
  UserRoles,
});

module.exports = {
  sequelize,
  User,
  Address,
  Category,
  SubCategory,
  Question,
  QuestionOption,
  PracticeTest,
  TestQuestion,
  TestAttempt,
  UserAnswer,
  TestRanking,
  Roles,
  UserRoles,
};