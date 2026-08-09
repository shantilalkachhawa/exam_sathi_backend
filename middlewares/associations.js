module.exports = ({
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
}) => {

  /* ===========================
      User & Address
  =========================== */

  User.hasOne(Address, {
    foreignKey: "user_id",
    as: "address",
  });

  Address.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });

  /* ===========================
   User <-> Roles (Many-to-Many)
=========================== */

User.belongsToMany(Roles, {
  through: UserRoles,
  foreignKey: "user_id",
  otherKey: "role_id",
  as: "roles",
});

Roles.belongsToMany(User, {
  through: UserRoles,
  foreignKey: "role_id",
  otherKey: "user_id",
  as: "users",
});

/* ===========================
   UserRoles -> User
=========================== */

UserRoles.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(UserRoles, {
  foreignKey: "user_id",
  as: "userRoles",
});

/* ===========================
   Subscription -> User
=========================== */

Subscription.hasMany(User, {
  foreignKey: "subscription_id",
  as: "users",
});

User.belongsTo(Subscription, {
  foreignKey: "subscription_id",
  as: "subscription",
});

/* ===========================
   UserRoles -> Role
=========================== */

UserRoles.belongsTo(Roles, {
  foreignKey: "role_id",
  as: "role",
});

Roles.hasMany(UserRoles, {
  foreignKey: "role_id",
  as: "userRoles",
});

  /* ===========================
      Category -> SubCategory
  =========================== */

  Category.hasMany(SubCategory, {
    foreignKey: "category_id",
    as: "subCategories",
  });

  SubCategory.belongsTo(Category, {
    foreignKey: "category_id",
    as: "category",
  });

  /* ===========================
      Category -> Questions
  =========================== */

  Category.hasMany(Question, {
    foreignKey: "category_id",
    as: "questions",
  });

  Question.belongsTo(Category, {
    foreignKey: "category_id",
    as: "category",
  });

  /* ===========================
      SubCategory -> Questions
  =========================== */

  SubCategory.hasMany(Question, {
    foreignKey: "sub_category_id",
    as: "questions",
  });

  Question.belongsTo(SubCategory, {
    foreignKey: "sub_category_id",
    as: "subCategory",
  });

  /* ===========================
      Subject -> Questions
  =========================== */

  if (Subject) {
    Subject.hasMany(Question, {
      foreignKey: "subject_id",
      as: "questions",
    });

    Question.belongsTo(Subject, {
      foreignKey: "subject_id",
      as: "subject",
    });
  }

  /* ===========================
      User -> Questions
  =========================== */

  User.hasMany(Question, {
    foreignKey: "created_by",
    as: "createdQuestions",
  });

  Question.belongsTo(User, {
    foreignKey: "created_by",
    as: "creator",
  });

  /* ===========================
      Question -> Options
  =========================== */

  Question.hasMany(QuestionOption, {
    foreignKey: "question_id",
    as: "options",
    onDelete: "CASCADE",
  });

  QuestionOption.belongsTo(Question, {
    foreignKey: "question_id",
    as: "question",
  });

  /* ===========================
      Category -> Practice Test
  =========================== */

  Category.hasMany(PracticeTest, {
    foreignKey: "category_id",
    as: "practiceTests",
  });

  PracticeTest.belongsTo(Category, {
    foreignKey: "category_id",
    as: "category",
  });

  /* ===========================
      SubCategory -> Practice Test
  =========================== */

  SubCategory.hasMany(PracticeTest, {
    foreignKey: "sub_category_id",
    as: "practiceTests",
  });

  PracticeTest.belongsTo(SubCategory, {
    foreignKey: "sub_category_id",
    as: "subCategory",
  });

  /* ===========================
      User -> Practice Test
  =========================== */

  User.hasMany(PracticeTest, {
    foreignKey: "created_by",
    as: "createdTests",
  });

  PracticeTest.belongsTo(User, {
    foreignKey: "created_by",
    as: "creator",
  });

  /* ===========================
      Current Affairs
  =========================== */

  if (CurrentAffair) {
    User.hasMany(CurrentAffair, {
      foreignKey: "created_by",
      as: "createdCurrentAffairs",
    });

    CurrentAffair.belongsTo(User, {
      foreignKey: "created_by",
      as: "creator",
    });
  }

  /* ===========================
      Previous Year Papers
  =========================== */

  if (PreviousYearPaper) {
    Category.hasMany(PreviousYearPaper, {
      foreignKey: "category_id",
      as: "previousYearPapers",
    });

    PreviousYearPaper.belongsTo(Category, {
      foreignKey: "category_id",
      as: "category",
    });

    SubCategory.hasMany(PreviousYearPaper, {
      foreignKey: "sub_category_id",
      as: "previousYearPapers",
    });

    PreviousYearPaper.belongsTo(SubCategory, {
      foreignKey: "sub_category_id",
      as: "subCategory",
    });

    User.hasMany(PreviousYearPaper, {
      foreignKey: "created_by",
      as: "createdPreviousYearPapers",
    });

    PreviousYearPaper.belongsTo(User, {
      foreignKey: "created_by",
      as: "creator",
    });
  }

  /* ===========================
      Practice Test -> Test Questions
  =========================== */

  PracticeTest.hasMany(TestQuestion, {
    foreignKey: "pt_id",
    as: "testQuestions",
  });

  TestQuestion.belongsTo(PracticeTest, {
    foreignKey: "pt_id",
    as: "practiceTest",
  });

  /* ===========================
      Question -> Test Questions
  =========================== */

  Question.hasMany(TestQuestion, {
    foreignKey: "question_id",
    as: "testMappings",
  });

  TestQuestion.belongsTo(Question, {
    foreignKey: "question_id",
    as: "question",
  });

  /* ===========================
      Practice Test Sections
  =========================== */

  if (PracticeTestSection) {
    PracticeTest.hasMany(PracticeTestSection, {
      foreignKey: "pt_id",
      as: "sections",
      onDelete: "CASCADE",
    });

    PracticeTestSection.belongsTo(PracticeTest, {
      foreignKey: "pt_id",
      as: "practiceTest",
    });

    if (Subject) {
      Subject.hasMany(PracticeTestSection, {
        foreignKey: "subject_id",
        as: "testSections",
      });

      PracticeTestSection.belongsTo(Subject, {
        foreignKey: "subject_id",
        as: "subject",
      });
    }

    PracticeTestSection.hasMany(TestQuestion, {
      foreignKey: "section_id",
      as: "testQuestions",
    });

    TestQuestion.belongsTo(PracticeTestSection, {
      foreignKey: "section_id",
      as: "section",
    });
  }

  /* ===========================
      Many To Many
      Practice Test <-> Question
  =========================== */

  PracticeTest.belongsToMany(Question, {
    through: TestQuestion,
    foreignKey: "pt_id",
    otherKey: "question_id",
    as: "questions",
  });

  Question.belongsToMany(PracticeTest, {
    through: TestQuestion,
    foreignKey: "question_id",
    otherKey: "pt_id",
    as: "practiceTests",
  });

  /* ===========================
      User -> Test Attempts
  =========================== */

  User.hasMany(TestAttempt, {
    foreignKey: "user_id",
    as: "attempts",
  });

  TestAttempt.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });

  /* ===========================
      Practice Test -> Attempts
  =========================== */

  PracticeTest.hasMany(TestAttempt, {
    foreignKey: "pt_id",
    as: "attempts",
  });

  TestAttempt.belongsTo(PracticeTest, {
    foreignKey: "pt_id",
    as: "practiceTest",
  });

  /* ===========================
      Attempt -> Answers
  =========================== */

  TestAttempt.hasMany(UserAnswer, {
    foreignKey: "attempt_id",
    as: "answers",
  });

  UserAnswer.belongsTo(TestAttempt, {
    foreignKey: "attempt_id",
    as: "attempt",
  });

  /* ===========================
      Question -> User Answers
  =========================== */

  Question.hasMany(UserAnswer, {
    foreignKey: "question_id",
    as: "userAnswers",
  });

  UserAnswer.belongsTo(Question, {
    foreignKey: "question_id",
    as: "question",
  });

  /* ===========================
      Option -> User Answers
  =========================== */

  QuestionOption.hasMany(UserAnswer, {
    foreignKey: "option_id",
    as: "userAnswers",
  });

  UserAnswer.belongsTo(QuestionOption, {
    foreignKey: "option_id",
    as: "selectedOption",
  });

  /* ===========================
      User -> Rankings
  =========================== */

  User.hasMany(TestRanking, {
    foreignKey: "user_id",
    as: "rankings",
  });

  TestRanking.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });

  /* ===========================
      Practice Test -> Rankings
  =========================== */

  PracticeTest.hasMany(TestRanking, {
    foreignKey: "test_id",
    as: "rankings",
  });

  TestRanking.belongsTo(PracticeTest, {
    foreignKey: "test_id",
    as: "practiceTest",
  });

  /* ===========================
      Subscription Access
  =========================== */

  Subscription.hasMany(SubscriptionAccess, {
    foreignKey: "subscription_id",
    as: "access",
    onDelete: "CASCADE",
  });

  SubscriptionAccess.belongsTo(Subscription, {
    foreignKey: "subscription_id",
    as: "subscription",
  });

  /* ===========================
      User Subscriptions
  =========================== */

  Subscription.hasMany(UserSubscription, {
    foreignKey: "subscription_id",
    as: "userSubscriptions",
  });

  UserSubscription.belongsTo(Subscription, {
    foreignKey: "subscription_id",
    as: "subscription",
  });

  User.hasMany(UserSubscription, {
    foreignKey: "user_id",
    as: "userSubscriptions",
  });

  UserSubscription.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });

  /* ===========================
      Payments
  =========================== */

  User.hasMany(Payment, {
    foreignKey: "user_id",
    as: "payments",
  });

  Payment.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });

  Subscription.hasMany(Payment, {
    foreignKey: "subscription_id",
    as: "payments",
  });

  Payment.belongsTo(Subscription, {
    foreignKey: "subscription_id",
    as: "subscription",
  });
};