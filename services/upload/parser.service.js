// services/upload/parser.service.js

const {
    QUESTION_REGEX,
    OPTION_REGEX,
    ANSWER_KEY_REGEX,
    PAGE_NUMBER_REGEX,
    HEADER_REGEX,
    MATCH_HINT_REGEX,
    STATEMENT_HINT_REGEX,
    ASSERTION_HINT_REGEX,
    cleanOCRText,
} = require("../../utils/regex");

const { normalizeParsedQuestion } = require("./questionTypes");

function filterLines(lines) {
    return lines
        .map((line) => cleanOCRText(line))
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .filter((line) => !PAGE_NUMBER_REGEX.test(line))
        .filter((line) => !HEADER_REGEX.test(line));
}

function parseAnswerKey(lines) {
    const answers = {};

    lines.forEach((line) => {
        const match = line.match(ANSWER_KEY_REGEX);
        if (match) {
            answers[match[1]] = match[2].toUpperCase();
        }
    });

    return answers;
}

function detectSemanticType(title) {
    if (ASSERTION_HINT_REGEX.test(title)) return "assertion";
    if (MATCH_HINT_REGEX.test(title)) return "match";
    if (STATEMENT_HINT_REGEX.test(title)) return "statement";
    return "mcq";
}

function mapOptionKey(optionKey) {
    const key = String(optionKey);
    if (key === "1") return "A";
    if (key === "2") return "B";
    if (key === "3") return "C";
    if (key === "4") return "D";
    return key.toUpperCase();
}

/**
 * Parse OCR text into questions (best-effort for unknown papers).
 */
function parseQuestions(text, { defaultType = 1 } = {}) {
    const rawLines = String(text || "").split("\n");
    const lines = filterLines(rawLines);
    const answers = parseAnswerKey(lines);

    const questions = [];
    let currentQuestion = null;
    let currentOption = null;

    for (const line of lines) {
        // Skip pure answer-key lines during body parse
        if (ANSWER_KEY_REGEX.test(line)) {
            continue;
        }

        const questionMatch = line.match(QUESTION_REGEX);

        if (questionMatch) {
            if (currentQuestion) {
                questions.push(finalizeQuestion(currentQuestion, answers));
            }

            currentQuestion = {
                questionNo: Number(questionMatch[1]),
                title: questionMatch[2].trim(),
                options: [],
                type: "mcq",
            };
            currentOption = null;
            continue;
        }

        const optionMatch = line.match(OPTION_REGEX);

        if (optionMatch && currentQuestion) {
            const optionKey =
                optionMatch[1] ||
                optionMatch[2] ||
                optionMatch[3] ||
                optionMatch[4] ||
                optionMatch[5];

            const optionText = optionMatch[6] || "";
            const key = mapOptionKey(optionKey);

            currentOption = {
                key,
                text: optionText.trim(),
                is_correct: answers[currentQuestion.questionNo] === key,
            };

            // Avoid duplicate keys from OCR noise
            const existingIdx = currentQuestion.options.findIndex(
                (o) => o.key === key
            );
            if (existingIdx >= 0) {
                currentQuestion.options[existingIdx] = currentOption;
            } else {
                currentQuestion.options.push(currentOption);
            }

            continue;
        }

        if (
            currentQuestion &&
            currentOption &&
            currentQuestion.options.length > 0
        ) {
            currentOption.text += " " + line;
            continue;
        }

        if (currentQuestion && currentQuestion.options.length === 0) {
            currentQuestion.title += " " + line;
        }
    }

    if (currentQuestion) {
        questions.push(finalizeQuestion(currentQuestion, answers));
    }

    return questions.map((q) => normalizeParsedQuestion(q, defaultType));
}

function finalizeQuestion(q, answers) {
    q.type = detectSemanticType(q.title);

    q.options = q.options.map((opt) => ({
        ...opt,
        text: String(opt.text || "").replace(/\s+/g, " ").trim(),
        is_correct:
            opt.is_correct ||
            answers[q.questionNo] === opt.key,
    }));

    q.title = String(q.title || "").replace(/\s+/g, " ").trim();
    return q;
}

module.exports = {
    parseQuestions,
    detectSemanticType,
};
