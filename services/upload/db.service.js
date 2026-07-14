// services/db.service.js

const sequelize = require("../../config/db");

const Question = require("../../models/question");
const QuestionOption = require("../../models/QuestionOption");

/**
 * Save all parsed questions into DB
 */
async function saveQuestions({
    questions,
    category_id,
    sub_category_id,
    created_by,
    type = 1,
    level = 1
}) {

    const transaction = await sequelize.transaction();

    try {

        let inserted = 0;
        let invalid = 0;

        const insertedQuestions = [];

        for (const item of questions) {

            //----------------------------------------
            // Skip invalid question
            //----------------------------------------

            if (
                !item.title ||
                !item.options ||
                item.options.length !== 4
            ) {

                invalid++;
                continue;

            }

            //----------------------------------------
            // Insert Question
            //----------------------------------------

            const question = await Question.create({

                category_id,
                sub_category_id,
                title: item.title,
                type,
                level,
                created_by,
                status: "active"

            }, { transaction });

            //----------------------------------------
            // Insert Options
            //----------------------------------------

            const options = item.options.map(option => ({

                question_id: question.id,

                option_text: option.text,

                is_correct: option.is_correct || false

            }));
            console.log("options", options);

            await QuestionOption.bulkCreate(options, { transaction });

            inserted++;

            insertedQuestions.push(question);

        }

        await transaction.commit();

        return {

            success: true,

            totalQuestions: questions.length,

            inserted,

            invalid,

            data: insertedQuestions

        };

    }
    catch (error) {

        await transaction.rollback();

        throw error;

    }

}
module.exports = {

    saveQuestions

};