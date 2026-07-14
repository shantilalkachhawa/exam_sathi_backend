// services/parser.service.js

const {
    QUESTION_REGEX,
    OPTION_REGEX,
    ANSWER_KEY_REGEX,
    PAGE_NUMBER_REGEX,
    HEADER_REGEX,
    cleanOCRText
} = require("../../utils/regex");

/**
 * Remove unnecessary lines
 */
function filterLines(lines) {

    return lines
        .map(line => cleanOCRText(line))
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => !PAGE_NUMBER_REGEX.test(line))
        .filter(line => !HEADER_REGEX.test(line));
}

/**
 * Parse answer key if available
 */
function parseAnswerKey(lines) {

    const answers = {};

    lines.forEach(line => {

        const match = line.match(ANSWER_KEY_REGEX);

        if (match) {

            answers[match[1]] = match[2].toUpperCase();

        }

    });

    return answers;

}

/**
 * Parse OCR text
 */
function parseQuestions(text) {

    const rawLines = text.split("\n");

    const lines = filterLines(rawLines);

    const answers = parseAnswerKey(lines);

    const questions = [];

    let currentQuestion = null;

    let currentOption = null;

    for (const line of lines) {

        //-------------------------------------------------------
        // QUESTION
        //-------------------------------------------------------

        const questionMatch = line.match(QUESTION_REGEX);

        if (questionMatch) {

            if (currentQuestion) {

                questions.push(currentQuestion);

            }

            currentQuestion = {

                questionNo: Number(questionMatch[1]),

                title: questionMatch[2].trim(),

                options: []

            };

            currentOption = null;

            continue;

        }

        //-------------------------------------------------------
        // OPTION
        //-------------------------------------------------------

        const optionMatch = line.match(OPTION_REGEX);

        if (optionMatch && currentQuestion) {

            const optionKey = (
                optionMatch[1] ||
                optionMatch[2] ||
                optionMatch[3] ||
                optionMatch[4]
            ).toString();

            const optionText = optionMatch[5];

            const key =
                optionKey === "1"
                    ? "A"
                    : optionKey === "2"
                    ? "B"
                    : optionKey === "3"
                    ? "C"
                    : optionKey === "4"
                    ? "D"
                    : optionKey.toUpperCase();

            currentOption = {

                key,

                text: optionText.trim(),

                is_correct:
                    answers[currentQuestion.questionNo] === key

            };

            currentQuestion.options.push(currentOption);

            continue;

        }

        //-------------------------------------------------------
        // MULTILINE OPTION
        //-------------------------------------------------------

        if (
            currentQuestion &&
            currentOption &&
            currentQuestion.options.length > 0
        ) {

            currentOption.text += " " + line;

            continue;

        }

        //-------------------------------------------------------
        // MULTILINE QUESTION
        //-------------------------------------------------------

        if (
            currentQuestion &&
            currentQuestion.options.length === 0
        ) {

            currentQuestion.title += " " + line;

        }

    }

    if (currentQuestion) {

        questions.push(currentQuestion);

    }

    return questions;

}

module.exports = {

    parseQuestions

};