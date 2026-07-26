const {
  sequelize,
  PracticeTest,
  TestAttempt,
  TestQuestion,
  Question,
  QuestionOption,
  UserAnswer,
} = require("../models");
const {
  calculateRemainingSeconds,
  isTimeExpired
} = require("../utils/index");




exports.startTest = async (req, res) => {
  console.log("req", req.body)
  const transaction = await sequelize.transaction();

  try {
    const { pt_id, user_id } = req.body;
    // const user_id = req.user.id || 1;
    // const user_id =  1;

    console.log("user_id", pt_id, user_id)

    // Validate
    if (!pt_id) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Practice Test Id is required.",
      });
    }

    // Practice Test
    const practiceTest = await PracticeTest.findByPk(pt_id, {
      transaction,
    });

    if (!practiceTest) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Practice Test not found.",
      });
    }

    // Existing Running Attempt
    let attempt = await TestAttempt.findOne({
      where: {
        user_id,
        pt_id,
        status: "in_progress",
      },
      transaction,
    });

    // -------------------------
    // RESUME TEST
    // -------------------------

    if (attempt) {
      const remainingSeconds = calculateRemainingSeconds(
        attempt.started_at,
        practiceTest.duration_minutes
      );

      // Time Over
      if (remainingSeconds <= 0) {
        await attempt.update(
          {
            status: "completed",
            submitted_at: new Date(),
          },
          { transaction }
        );

        await transaction.commit();

        return res.status(400).json({
          success: false,
          message: "Exam time has expired. Please view your result.",
          exam_expired: true,
        });
      }

      const savedAnswers = await UserAnswer.findAll({
        where: {
          attempt_id: attempt.id,
        },
        attributes: [
          "question_id",
          "option_id",
        ],
      });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: "Resume Test",
        resume: true,

        data: {
          attempt_id: attempt.id,
          pt_id: pt_id,
          remaining_seconds: remainingSeconds,
          duration_minutes: practiceTest.duration_minutes,
          started_at: attempt.started_at,
          saved_answers: savedAnswers,
        },
      });
    }

    // -------------------------
    // CREATE NEW ATTEMPT
    // -------------------------

    attempt = await TestAttempt.create(
      {
        user_id,
        pt_id,
        total_questions: practiceTest.total_questions,
        started_at: new Date(),
        status: "in_progress",
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Exam Started Successfully.",
      resume: false,

      data: {
        attempt_id: attempt.id,
        pt_id: pt_id,
        duration_minutes: practiceTest.duration_minutes,
        remaining_seconds:
          practiceTest.duration_minutes * 60,
        started_at: attempt.started_at,
        saved_answers: [],
      },
    });

  } catch (error) {
    await transaction.rollback();

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAttemptQuestions = async (req, res) => {
  try {
    const attemptId = req.params.id;

    const attempt = await TestAttempt.findByPk(attemptId);
    console.log(attempt, "attempt");

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found.",
      });
    }

    // Security
    // if (attempt.user_id !== req.user.id) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Unauthorized.",
    //   });
    // }

    const practiceTest = await PracticeTest.findByPk(
      attempt.pt_id
    );

    const remainingSeconds = calculateRemainingSeconds(
      attempt.started_at,
      practiceTest.duration_minutes
    );

    if (remainingSeconds <= 0) {
      return res.status(400).json({
        success: false,
        message: "Exam time has expired.",
        exam_expired: true,
      });
    }

    // Load all questions
    const testQuestions = await TestQuestion.findAll({
      where: {
        pt_id: attempt.pt_id,
      },

      include: [
        {
          model: Question,
          as: "question",

          include: [
            {
              model: QuestionOption,
              as: "options",

              attributes: [
                "id",
                "option_text",
              ],
            },
          ],
        },
      ],

      // order: [
      //   ["question_order", "ASC"],
      // ],
    });

    // Load saved answers
    const savedAnswers = await UserAnswer.findAll({
      where: {
        attempt_id: attempt.id,
      },
    });

    const answerMap = {};

    savedAnswers.forEach((answer) => {
      answerMap[answer.question_id] = answer.option_id;
    });

    const questions = testQuestions.map((item) => ({
      question_id: item.question.id,
      title: item.question.title,
      type: item.question.type,
      level: item.question.level,

      selected_option:
        answerMap[item.question.id] || null,

      status: answerMap[item.question.id]
        ? "answered"
        : "not_answered",

      options: item.question.options,
    }));

    return res.status(200).json({
      success: true,

      data: {
        attempt_id: attempt.id,

        pt_id: practiceTest.id,

        title: practiceTest.title,

        duration_minutes:
          practiceTest.duration_minutes,

        remaining_seconds: remainingSeconds,

        total_questions:
          practiceTest.total_questions,

        questions,
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
exports.saveAnswer = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const attemptId = req.params.id;

    const {
      question_id,
      option_id,
      user_id
    } = req.body;

    // const userId = req.user.id;
    const userId = user_id;

    if (!question_id || !option_id) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "question_id and option_id are required.",
      });
    }

    // Verify Attempt
    const attempt = await TestAttempt.findByPk(attemptId, {
      transaction,
    });
    console.log(attempt, 'attempt')
    if (!attempt) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Attempt not found.",
      });
    }

    if (attempt.user_id !== userId) {
      await transaction.rollback();

      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (attempt.status === "completed") {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Exam already submitted.",
      });
    }

    // Check Remaining Time
    const practiceTest = await PracticeTest.findByPk(
      attempt.pt_id,
      { transaction }
    );

    console.log("Started At:", attempt.started_at);
    console.log("Current Time:", new Date());
    console.log("Duration:", practiceTest.duration_minutes);
    const remainingSeconds = calculateRemainingSeconds(
      attempt.started_at,
      practiceTest.duration_minutes
    );
    console.log("Remaining:", remainingSeconds);

    if (remainingSeconds <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Exam time has expired.",
      });
    }

    // Verify Question belongs to this Practice Test
    const testQuestion = await TestQuestion.findOne({
      where: {
        pt_id: attempt.pt_id,
        question_id,
      },
      transaction,
    });

    if (!testQuestion) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Invalid question.",
      });
    }

    // Verify Option belongs to Question
    const option = await QuestionOption.findOne({
      where: {
        id: option_id,
        question_id,
      },
      transaction,
    });

    if (!option) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Invalid option selected.",
      });
    }

    // Upsert Answer
    const existing = await UserAnswer.findOne({
      where: {
        attempt_id: attempt.id,
        question_id,
      },
      transaction,
    });

    if (existing) {
      await existing.update(
        {
          option_id,
          answered_at: new Date(),
        },
        { transaction }
      );
    } else {
      await UserAnswer.create(
        {
          attempt_id: attempt.id,
          question_id,
          option_id,
          answered_at: new Date(),
        },
        { transaction }
      );
    }

    await transaction.commit();
    // 

    return res.status(200).json({
      success: true,
      message: "Answer saved successfully.",
      remaining_seconds: remainingSeconds,
    });

  } catch (error) {
    await transaction.rollback();

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.submitTest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {

    const attemptId = req.params.id;
    const userId = req.body.user_id;

    // Get Attempt
    const attempt = await TestAttempt.findByPk(attemptId, {
      transaction,
    });

    if (!attempt) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Attempt not found.",
      });
    }

    // Security
    if (attempt.user_id !== userId) {
      await transaction.rollback();

      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (attempt.status === "completed") {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Exam already submitted.",
      });
    }

    // Practice Test
    const practiceTest = await PracticeTest.findByPk(
      attempt.pt_id,
      { transaction }
    );

    if (!practiceTest) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Practice Test not found.",
      });
    }

    // Load Answers
    const answers = await UserAnswer.findAll({
      where: {
        attempt_id: attempt.id,
      },
      include: [
        {
          model: QuestionOption,
          as: "selectedOption",
        },
      ],
      transaction,
    });

    let correct = 0;
    let wrong = 0;

    for (const answer of answers) {

      const isCorrect = answer.selectedOption.is_correct;

      if (isCorrect) {
        correct++;
      } else {
        wrong++;
      }

      await answer.update(
        {
          is_correct: isCorrect,
        },
        { transaction }
      );
    }

    const attempted = answers.length;

    const skipped =
      practiceTest.total_questions - attempted;

    const score =
      (correct * practiceTest.positive_marks) -
      (wrong * practiceTest.negative_marks);

    const percentage =
      (score / practiceTest.total_marks) * 100;

    const accuracy =
      attempted > 0
        ? (correct / attempted) * 100
        : 0;

    const submittedAt = new Date();

    const timeTaken = Math.floor(
      (submittedAt.getTime() -
        new Date(attempt.started_at).getTime()) /
      1000
    );

    await attempt.update(
      {
        attempted_questions: attempted,

        correct_answers: correct,

        wrong_answers: wrong,

        skipped_answers: skipped,

        score,

        percentage: Number(
          percentage.toFixed(2)
        ),

        accuracy: Number(
          accuracy.toFixed(2)
        ),

        submitted_at: submittedAt,

        time_taken: timeTaken,

        status: "completed",
      },
      {
        transaction,
      }
    );

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Exam submitted successfully.",

      data: {
        attempt_id: attempt.id,

        score,

        total_marks:
          practiceTest.total_marks,

        correct,

        wrong,

        skipped,

        attempted,

        percentage,

        accuracy,

        time_taken: timeTaken,
      },
    });

  } catch (error) {

    await transaction.rollback();

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

exports.getResult = async (req, res) => {
  try {

    const attemptId = req.params.id;
    const userId = req.user.id;

    // Get Attempt
    const attempt = await TestAttempt.findByPk(attemptId);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found.",
      });
    }

    // Security
    if (attempt.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    // Check Exam Status
    if (attempt.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Exam is not submitted yet.",
      });
    }

    // Practice Test
    const practiceTest = await PracticeTest.findByPk(
      attempt.pt_id
    );

    // Question Wise Answers
    const answers = await UserAnswer.findAll({

      where: {
        attempt_id: attempt.id,
      },

      include: [
        {
          model: Question,
          as: "question",

          attributes: [
            "id",
            "title",
          ],

          include: [
            {
              model: QuestionOption,
              as: "options",

              attributes: [
                "id",
                "option_text",
                "is_correct",
              ],
            },
          ],
        },

        {
          model: QuestionOption,
          as: "selectedOption",

          attributes: [
            "id",
            "option_text",
          ],
        },
      ],

      order: [
        ["question_id", "ASC"],
      ],

    });

    return res.status(200).json({

      success: true,

      data: {

        attempt_id: attempt.id,

        practice_test: {
          id: practiceTest.id,
          title: practiceTest.title,
        },

        summary: {

          total_questions: attempt.total_questions,

          attempted_questions:
            attempt.attempted_questions,

          correct_answers:
            attempt.correct_answers,

          wrong_answers:
            attempt.wrong_answers,

          skipped_answers:
            attempt.skipped_answers,

          score: attempt.score,

          total_marks:
            practiceTest.total_marks,

          percentage:
            attempt.percentage,

          accuracy:
            attempt.accuracy,

          time_taken:
            attempt.time_taken,

          submitted_at:
            attempt.submitted_at,

        },

        answers,

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


exports.getMyAttempts = async (req, res) => {
  try {

    const userId = req.user.id;

    const attempts = await TestAttempt.findAll({

      where: {
        user_id: userId,
      },

      include: [
        {
          model: PracticeTest,
          as: "practiceTest",

          include: [
            {
              model: Category,
              as: "category",
              attributes: ["id", "name"],
            },
            {
              model: SubCategory,
              as: "subCategory",
              attributes: ["id", "name"],
            },
          ],

          attributes: [
            "id",
            "title",
            "duration_minutes",
            "total_questions",
            "total_marks",
          ],
        },
      ],

      order: [["createdAt", "DESC"]],

    });

    const data = attempts.map((attempt) => {

      let remainingSeconds = 0;

      if (attempt.status === "in_progress") {

        remainingSeconds = calculateRemainingSeconds(
          attempt.started_at,
          attempt.practiceTest.duration_minutes
        );

      }

      return {

        attempt_id: attempt.id,

        status: attempt.status,

        started_at: attempt.started_at,

        submitted_at: attempt.submitted_at,

        remaining_seconds: remainingSeconds,

        attempted_questions:
          attempt.attempted_questions,

        correct_answers:
          attempt.correct_answers,

        wrong_answers:
          attempt.wrong_answers,

        skipped_answers:
          attempt.skipped_answers,

        score: attempt.score,

        percentage: attempt.percentage,

        accuracy: attempt.accuracy,

        practice_test: {

          id: attempt.practiceTest.id,

          title: attempt.practiceTest.title,

          duration_minutes:
            attempt.practiceTest.duration_minutes,

          total_questions:
            attempt.practiceTest.total_questions,

          total_marks:
            attempt.practiceTest.total_marks,

          category:
            attempt.practiceTest.category,

          sub_category:
            attempt.practiceTest.subCategory,

        },

      };

    });

    return res.status(200).json({

      success: true,

      total: data.length,

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


