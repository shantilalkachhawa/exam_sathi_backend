// controllers/question.controller.js

const questionService = require("../services/question.service");

const createQuestion = async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({
                success: false,
                message: "File is required",
            });

        }

        const result =
            await questionService.processQuestionFile(
                req.file
            );

        return res.status(200).json({

            success: true,

            totalQuestions:
                result.questions.length,

            rawText: result.rawText,

            data: result.questions,

        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }

};

module.exports = {
    createQuestion,
};