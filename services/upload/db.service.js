// services/upload/db.service.js

const { sequelize, Question, QuestionOption } = require("../../models");
const { resolveQuestionType } = require("./questionTypes");
const { stripExamSourceTags, cleanOCRText } = require("../../utils/regex");

/**
 * Save all parsed questions into DB.
 * Accepts 2–6 options (gov papers are almost always 4).
 */
async function saveQuestions({
    questions,
    category_id = null,
    sub_category_id = null,
    subject_id = null,
    created_by,
    type = 1,
    level = 1,
    language = "en",
}) {
    const transaction = await sequelize.transaction();

    try {
        let inserted = 0;
        let invalid = 0;
        const insertedQuestions = [];
        const failedQuestions = [];

        for (const item of questions) {
            const optionCount = item.options?.length || 0;
            const title = stripExamSourceTags(
                cleanOCRText(String(item.title || ""))
            );

            if (!title || optionCount < 2 || optionCount > 6) {
                invalid++;
                failedQuestions.push({
                    questionNo: item.questionNo,
                    reason: !title
                        ? "Missing title"
                        : `Expected 2–6 options, got ${optionCount}`,
                    title: title || null,
                    options: item.options || [],
                });
                continue;
            }

            const questionType = resolveQuestionType(item.type, type);

            const question = await Question.create(
                {
                    category_id: category_id || null,
                    sub_category_id: sub_category_id || null,
                    subject_id: subject_id || null,
                    title,
                    language: item.language || language,
                    type: questionType,
                    level,
                    created_by,
                    status: "active",
                },
                { transaction }
            );

            const options = item.options.map((option) => ({
                question_id: question.id,
                option_text: option.text,
                is_correct: Boolean(option.is_correct),
            }));

            await QuestionOption.bulkCreate(options, { transaction });

            inserted++;
            insertedQuestions.push({
                id: question.id,
                questionNo: item.questionNo,
                title: question.title,
                type: question.type,
                typeLabel: item.typeLabel,
                language: question.language,
                options: item.options,
            });
        }

        await transaction.commit();

        return {
            success: true,
            totalQuestions: questions.length,
            inserted,
            invalid,
            data: insertedQuestions,
            failedQuestions,
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

module.exports = {
    saveQuestions,
};
