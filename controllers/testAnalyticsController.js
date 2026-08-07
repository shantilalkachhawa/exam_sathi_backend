const { Op } = require("sequelize");
const {
  PracticeTest,
  TestAttempt,
  UserAnswer,
  User,
  Question,
  QuestionOption,
  SubscriptionAccess,
  Subscription,
  Payment,
  UserSubscription,
} = require("../models");

async function findPracticeTestOr404(id, res) {
  const practiceTest = await PracticeTest.findByPk(id);
  if (!practiceTest) {
    res.status(404).json({
      success: false,
      message: "Practice Test not found.",
    });
    return null;
  }
  return practiceTest;
}

/**
 * GET /api/practice-test/:id/analytics
 * Overview: attempt counts + paid user count
 */
exports.getTestAnalytics = async (req, res) => {
  try {
    const ptId = req.params.id;
    const practiceTest = await findPracticeTestOr404(ptId, res);
    if (!practiceTest) return;

    const [totalAttempts, completed, inProgress, uniqueUsers] = await Promise.all([
      TestAttempt.count({ where: { pt_id: ptId } }),
      TestAttempt.count({ where: { pt_id: ptId, status: "completed" } }),
      TestAttempt.count({ where: { pt_id: ptId, status: "in_progress" } }),
      TestAttempt.count({
        where: { pt_id: ptId },
        distinct: true,
        col: "user_id",
      }),
    ]);

    const scoreAgg = await TestAttempt.findAll({
      where: { pt_id: ptId, status: "completed" },
      attributes: ["score", "percentage"],
      raw: true,
    });

    const scores = scoreAgg
      .map((r) => Number(r.score))
      .filter((n) => Number.isFinite(n));
    const avgScore =
      scores.length > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : 0;
    const avgPercentage =
      scoreAgg.length > 0
        ? Number(
            (
              scoreAgg.reduce((a, r) => a + Number(r.percentage || 0), 0) /
              scoreAgg.length
            ).toFixed(2)
          )
        : 0;

    const paidUsers = await getPaidUsersForTest(practiceTest);

    return res.json({
      success: true,
      data: {
        pt_id: Number(ptId),
        title: practiceTest.title,
        total_marks: practiceTest.total_marks,
        total_questions: practiceTest.total_questions,
        total_attempts: totalAttempts,
        completed_attempts: completed,
        in_progress_attempts: inProgress,
        unique_users: uniqueUsers,
        average_score: avgScore,
        average_percentage: avgPercentage,
        paid_users_count: paidUsers.length,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/practice-test/:id/attempts
 */
exports.getTestAttempts = async (req, res) => {
  try {
    const ptId = req.params.id;
    const practiceTest = await findPracticeTestOr404(ptId, res);
    if (!practiceTest) return;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status;

    const where = { pt_id: ptId };
    if (status === "completed" || status === "in_progress") {
      where.status = status;
    }

    const { count, rows } = await TestAttempt.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email", "phone_number"],
        },
      ],
      order: [["id", "DESC"]],
      limit,
      offset,
    });

    return res.json({
      success: true,
      meta: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit)),
      },
      data: rows.map((attempt) => ({
        attempt_id: attempt.id,
        user: attempt.user
          ? {
              id: attempt.user.id,
              full_name: attempt.user.full_name,
              email: attempt.user.email,
              phone_number: attempt.user.phone_number,
            }
          : null,
        status: attempt.status,
        score: attempt.score,
        percentage: attempt.percentage,
        accuracy: attempt.accuracy,
        correct_answers: attempt.correct_answers,
        wrong_answers: attempt.wrong_answers,
        skipped_answers: attempt.skipped_answers,
        attempted_questions: attempt.attempted_questions,
        time_taken: attempt.time_taken,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
      })),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/practice-test/:id/attempts/:attemptId/answers
 */
exports.getAttemptAnswers = async (req, res) => {
  try {
    const ptId = Number(req.params.id);
    const attemptId = Number(req.params.attemptId);

    const attempt = await TestAttempt.findByPk(attemptId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email"],
        },
      ],
    });

    if (!attempt || Number(attempt.pt_id) !== ptId) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found for this test.",
      });
    }

    const practiceTest = await PracticeTest.findByPk(ptId);

    const answers = await UserAnswer.findAll({
      where: { attempt_id: attempt.id },
      include: [
        {
          model: Question,
          as: "question",
          attributes: ["id", "title"],
          include: [
            {
              model: QuestionOption,
              as: "options",
              attributes: ["id", "option_text", "is_correct"],
            },
          ],
        },
        {
          model: QuestionOption,
          as: "selectedOption",
          attributes: ["id", "option_text", "is_correct"],
        },
      ],
      order: [["question_id", "ASC"]],
    });

    return res.json({
      success: true,
      data: {
        attempt_id: attempt.id,
        user: attempt.user
          ? {
              id: attempt.user.id,
              full_name: attempt.user.full_name,
              email: attempt.user.email,
            }
          : null,
        status: attempt.status,
        summary: {
          total_questions: attempt.total_questions ?? practiceTest?.total_questions,
          attempted_questions: attempt.attempted_questions,
          correct_answers: attempt.correct_answers,
          wrong_answers: attempt.wrong_answers,
          skipped_answers: attempt.skipped_answers,
          score: attempt.score,
          total_marks: practiceTest?.total_marks,
          percentage: attempt.percentage,
          accuracy: attempt.accuracy,
          time_taken: attempt.time_taken,
          submitted_at: attempt.submitted_at,
        },
        answers: answers.map((a) => ({
          question_id: a.question_id,
          option_id: a.option_id,
          is_correct: a.is_correct,
          question: a.question
            ? {
                id: a.question.id,
                title: a.question.title,
                options: (a.question.options || []).map((o) => ({
                  id: o.id,
                  option_text: o.option_text,
                  is_correct: o.is_correct,
                })),
              }
            : null,
          selected_option: a.selectedOption
            ? {
                id: a.selectedOption.id,
                option_text: a.selectedOption.option_text,
                is_correct: a.selectedOption.is_correct,
              }
            : null,
        })),
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/practice-test/:id/paid-users
 * Users who paid for a subscription that unlocks this test's category/subcategory
 */
exports.getTestPaidUsers = async (req, res) => {
  try {
    const practiceTest = await findPracticeTestOr404(req.params.id, res);
    if (!practiceTest) return;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const all = await getPaidUsersForTest(practiceTest);
    const total = all.length;
    const start = (page - 1) * limit;
    const data = all.slice(start, start + limit);

    return res.json({
      success: true,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

async function getPaidUsersForTest(practiceTest) {
  const categoryId = String(practiceTest.category_id ?? "");
  const subCategoryId = String(practiceTest.sub_category_id ?? "");

  const accessOr = [];
  if (categoryId) {
    accessOr.push({
      access_level: "category",
      access_id: categoryId,
    });
  }
  if (subCategoryId) {
    accessOr.push({
      access_level: "sub_category",
      access_id: subCategoryId,
    });
  }

  if (!accessOr.length) return [];

  const accessRows = await SubscriptionAccess.findAll({
    where: {
      status: "active",
      [Op.or]: accessOr,
    },
    attributes: ["subscription_id", "access_level", "access_id"],
  });

  const subscriptionIds = [
    ...new Set(accessRows.map((r) => r.subscription_id).filter(Boolean)),
  ];
  if (!subscriptionIds.length) return [];

  const accessBySub = new Map();
  accessRows.forEach((row) => {
    if (!accessBySub.has(row.subscription_id)) {
      accessBySub.set(row.subscription_id, row.access_level);
    }
  });

  const payments = await Payment.findAll({
    where: {
      subscription_id: { [Op.in]: subscriptionIds },
      payment_status: "success",
    },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "full_name", "email", "phone_number"],
      },
      {
        model: Subscription,
        as: "subscription",
        attributes: ["id", "name", "price"],
      },
    ],
    order: [["paid_at", "DESC"], ["id", "DESC"]],
  });

  // Also include paid user-subscriptions without a payment row (manual assign with amount)
  const userSubs = await UserSubscription.findAll({
    where: {
      subscription_id: { [Op.in]: subscriptionIds },
      amount_paid: { [Op.gt]: 0 },
      status: "active",
    },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "full_name", "email", "phone_number"],
      },
      {
        model: Subscription,
        as: "subscription",
        attributes: ["id", "name", "price"],
      },
    ],
    order: [["purchased_at", "DESC"], ["id", "DESC"]],
  });

  const byUser = new Map();

  payments.forEach((p) => {
    const userId = p.user_id;
    if (!userId || byUser.has(userId)) return;
    byUser.set(userId, {
      user_id: userId,
      full_name: p.user?.full_name || "",
      email: p.user?.email || "",
      phone_number: p.user?.phone_number || null,
      subscription_id: p.subscription_id,
      subscription_name: p.subscription?.name || "",
      access_match: accessBySub.get(p.subscription_id) || null,
      amount_paid: Number(p.amount || 0),
      payment_status: p.payment_status,
      payment_method: p.payment_method,
      purchased_at: p.paid_at || p.created_at,
      source: "payment",
    });
  });

  userSubs.forEach((us) => {
    const userId = us.user_id;
    if (!userId || byUser.has(userId)) return;
    byUser.set(userId, {
      user_id: userId,
      full_name: us.user?.full_name || "",
      email: us.user?.email || "",
      phone_number: us.user?.phone_number || null,
      subscription_id: us.subscription_id,
      subscription_name: us.subscription?.name || "",
      access_match: accessBySub.get(us.subscription_id) || null,
      amount_paid: Number(us.amount_paid || 0),
      payment_status: "success",
      payment_method: "manual",
      purchased_at: us.purchased_at || us.created_at,
      expiry_date: us.expiry_date,
      source: "user_subscription",
    });
  });

  return Array.from(byUser.values());
}
