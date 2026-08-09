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
const Subscription = require("./subscription");
const SubscriptionAccess = require("./subscriptionAccess");
const UserSubscription = require("./userSubscription");
const Payment = require("./payment");
const CurrentAffair = require("./currentAffair");
const PreviousYearPaper = require("./previousYearPaper");
const Subject = require("./subject");
const PracticeTestSection = require("./practiceTestSection");

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
  Subscription,
  SubscriptionAccess,
  UserSubscription,
  Payment,
  CurrentAffair,
  PreviousYearPaper,
  Subject,
  PracticeTestSection,
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
  Subscription,
  SubscriptionAccess,
  UserSubscription,
  Payment,
  CurrentAffair,
  PreviousYearPaper,
  Subject,
  PracticeTestSection,
};
