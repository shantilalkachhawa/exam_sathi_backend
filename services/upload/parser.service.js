const parseQuestions = (text, filename) => {

    const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const questions = [];

    let currentQuestion = null;

    lines.forEach((line) => {

        // Question

        if (/^\d+\./.test(line)) {

            if (currentQuestion) {
                questions.push(currentQuestion);
            }

            currentQuestion = {
                question: line,
                options: [],
                answer: null,
                file: filename,
            };
        }

        // Options

        else if (
            /^\([A-D0-9]\)/i.test(line) ||
            /^\[[A-D0-9]\]/i.test(line)
        ) {

            line = line
                .replace("(8)", "(B)")
                .replace("(0)", "(D)")
                .replace("[8]", "[B]")
                .replace("[0]", "[D]")
                .replace("©)", "(C)")
                .replace("©", "(C)");

            currentQuestion?.options.push(line);
        }

        // Multiline Question

        else if (
            currentQuestion &&
            currentQuestion.options.length === 0
        ) {

            currentQuestion.question +=
                " " + line;
        }
    });

    if (currentQuestion) {
        questions.push(currentQuestion);
    }

    return questions;
};

module.exports = {
    parseQuestions,
};