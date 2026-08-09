// services/upload/parser.service.js

const {
  QUESTION_REGEX,
  OPTION_REGEX,
  ANSWER_KEY_REGEX,
  PAGE_NUMBER_REGEX,
  HEADER_REGEX,
  SECTION_HEADER_REGEX,
  MATCH_HINT_REGEX,
  STATEMENT_HINT_REGEX,
  ASSERTION_HINT_REGEX,
  DEVANAGARI_OPTION_MAP,
  cleanOCRText,
  stripExamSourceTags,
} = require("../../utils/regex");

const { normalizeParsedQuestion } = require("./questionTypes");
const { normalizeAnswerToken } = require("./answerKey.service");

function filterLines(lines) {
  return lines
    .map((line) => cleanOCRText(line))
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !PAGE_NUMBER_REGEX.test(line))
    .filter((line) => !HEADER_REGEX.test(line))
    .filter((line) => !SECTION_HEADER_REGEX.test(line))
    .filter((line) => !isAnswerKeyDumpLine(line));
}

/** Lines like "1. c 2. b 3. d 4. a …" (answer sheets inside books) */
function isAnswerKeyDumpLine(line) {
  const hits = [
    ...String(line).matchAll(
      /\b\d{1,3}\s*[.\)\-]\s*(?:[a-dA-D]|[कखगघ])\b/gu
    ),
  ];
  return hits.length >= 3;
}

function parseAnswerKey(lines) {
  const answers = {};

  lines.forEach((line) => {
    const match = line.match(ANSWER_KEY_REGEX);
    if (match) {
      const keys = String(match[2])
        .split(",")
        .map((k) => normalizeAnswerToken(k.trim()))
        .filter(Boolean);
      if (keys[0]) answers[match[1]] = keys[0];
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
  const key = String(optionKey || "").trim();
  if (DEVANAGARI_OPTION_MAP[key]) return DEVANAGARI_OPTION_MAP[key];
  if (key === "1") return "A";
  if (key === "2") return "B";
  if (key === "3") return "C";
  if (key === "4") return "D";
  return key.toUpperCase();
}

/**
 * Avoid treating nested list items / section leftovers as new questions.
 * e.g. "1. भील" under a matching question, or "1.1 सामान्य" filtered already.
 */
function shouldStartNewQuestion(questionNo, title, currentQuestion, lastQuestionNo) {
  const rest = String(title || "").trim();
  if (!rest) return false;

  // Answer-key dump mistakenly matched as a question title
  if (isAnswerKeyDumpLine(`${questionNo}. ${rest}`)) {
    return false;
  }
  if (/^(?:[a-dA-Dकखगघ]\s+\d+\.\s*){2,}/u.test(rest)) {
    return false;
  }

  // leftover from "1.1 Section" if SECTION_HEADER missed
  if (/^\d+([.\)]|\s)/.test(rest) && rest.length < 60) {
    const withoutLead = rest.replace(/^\d+[.\)]?\s*/, "");
    if (withoutLead.length < 40 && !/[?।]/.test(withoutLead)) {
      // likely nested list or section fragment
      if (currentQuestion && currentQuestion.options.length > 0) {
        return false;
      }
    }
  }

  // Nested enumeration inside match/list questions (1. tribe name)
  if (
    currentQuestion &&
    currentQuestion.options.length > 0 &&
    questionNo <= 4 &&
    rest.length <= 35 &&
    !/[?।]/.test(rest) &&
    detectSemanticType(currentQuestion.title) === "match"
  ) {
    return false;
  }

  // Prefer ascending question numbers; allow restart after gap only if title looks real
  if (
    lastQuestionNo != null &&
    questionNo < lastQuestionNo &&
    questionNo <= 4 &&
    rest.length < 50 &&
    currentQuestion
  ) {
    return false;
  }

  return true;
}

/**
 * Code matrix rows like "(a) 2 4 1 3" after matching List options —
 * treat as real MCQ choices (replace earlier letter options).
 */
function isCodeMatrixOption(text) {
  return /^\s*[1-4](?:\s+[1-4]){2,3}\s*$/.test(String(text || "").trim());
}

/**
 * Parse OCR / PDF text into questions.
 */
function parseQuestions(text, { defaultType = 1, useInlineAnswers = false } = {}) {
  const rawLines = String(text || "").split("\n");
  const lines = filterLines(rawLines);
  // Inline answer sheets inside question books are noisy — prefer answer_file PDF
  const answers = useInlineAnswers ? parseAnswerKey(lines) : {};

  const questions = [];
  let currentQuestion = null;
  let currentOption = null;
  let lastQuestionNo = null;
  let sawCodeHeader = false;

  for (const line of lines) {
    if (ANSWER_KEY_REGEX.test(line)) {
      continue;
    }

    if (/^code$/i.test(line) || /^कूट$/u.test(line)) {
      sawCodeHeader = true;
      continue;
    }

    // Skip bare "(A) (B) (C) (D)" header rows
    if (/^\([A-Da-d]\)(?:\s+\([A-Da-d]\)){2,}$/i.test(line)) {
      continue;
    }

    const questionMatch = line.match(QUESTION_REGEX);

    if (questionMatch) {
      const qNo = Number(questionMatch[1]);
      const title = questionMatch[2].trim();

      if (
        !shouldStartNewQuestion(qNo, title, currentQuestion, lastQuestionNo)
      ) {
        if (currentQuestion) {
          if (currentOption) {
            currentOption.text += " " + line;
          } else {
            currentQuestion.title += " " + line;
          }
        }
        continue;
      }

      if (currentQuestion) {
        questions.push(finalizeQuestion(currentQuestion, answers));
      }

      currentQuestion = {
        questionNo: qNo,
        title,
        options: [],
        type: "mcq",
      };
      currentOption = null;
      lastQuestionNo = qNo;
      sawCodeHeader = false;
      continue;
    }

    const optionMatch = line.match(OPTION_REGEX);

    if (optionMatch && currentQuestion) {
      const optionKey =
        optionMatch[1] ||
        optionMatch[2] ||
        optionMatch[3] ||
        optionMatch[4] ||
        optionMatch[5] ||
        optionMatch[6] ||
        optionMatch[7];

      const optionText = optionMatch[8] || optionMatch[optionMatch.length - 1] || "";
      // Last capturing group is always the text in our regex
      const textGroup = optionMatch[optionMatch.length - 1] || "";
      const key = mapOptionKey(optionKey);
      const text = String(textGroup || optionText).trim();

      // After "Code" header, lowercase (a)(b)(c)(d) rows are the real answers —
      // replace lettered List-I options.
      if (sawCodeHeader && isCodeMatrixOption(text)) {
        currentQuestion.options = [];
        sawCodeHeader = false;
      } else if (
        sawCodeHeader &&
        /^[a-d]$/i.test(String(optionKey || "")) &&
        currentQuestion.options.some((o) => !isCodeMatrixOption(o.text))
      ) {
        // First code-choice row after matching lists
        if (currentQuestion.options.every((o) => !isCodeMatrixOption(o.text))) {
          currentQuestion.options = [];
        }
        sawCodeHeader = false;
      }

      currentOption = {
        key,
        text,
        is_correct: answers[currentQuestion.questionNo] === key,
      };

      const existingIdx = currentQuestion.options.findIndex((o) => o.key === key);
      if (existingIdx >= 0) {
        // Prefer longer / code-matrix text over short list labels
        const prev = currentQuestion.options[existingIdx];
        if (
          isCodeMatrixOption(text) ||
          text.length >= String(prev.text || "").length
        ) {
          currentQuestion.options[existingIdx] = currentOption;
        }
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
    text: cleanOCRText(String(opt.text || "")),
    is_correct: opt.is_correct || answers[q.questionNo] === opt.key,
  }));

  // Keep Hindi wording same-to-same; only drop trailing [exam year] citations
  q.title = stripExamSourceTags(cleanOCRText(String(q.title || "")));
  return q;
}

/**
 * Classify questions without writing to DB.
 */
function classifyQuestions(questions) {
  const valid = [];
  const invalid = [];

  for (const item of questions) {
    const optionCount = item.options?.length || 0;
    const hasAnswer = (item.options || []).some((o) => o.is_correct);

    if (!item.title || optionCount < 2 || optionCount > 6) {
      invalid.push({
        questionNo: item.questionNo,
        reason: !item.title
          ? "Missing title"
          : `Expected 2–6 options, got ${optionCount}`,
        title: item.title || null,
        options: item.options || [],
        hasAnswer,
      });
      continue;
    }

    valid.push({
      ...item,
      hasAnswer,
    });
  }

  const withAnswer = valid.filter((q) => q.hasAnswer).length;

  return {
    totalQuestions: questions.length,
    validCount: valid.length,
    invalidCount: invalid.length,
    withAnswer,
    withoutAnswer: valid.length - withAnswer,
    valid,
    invalid,
  };
}

module.exports = {
  parseQuestions,
  detectSemanticType,
  classifyQuestions,
};
