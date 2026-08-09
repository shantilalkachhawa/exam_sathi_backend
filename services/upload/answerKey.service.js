const path = require("path");
const fs = require("fs-extra");
const { PDFParse } = require("pdf-parse");

const {
  convertPDFToImages,
  deleteTempDirectory,
} = require("./pdf.service");
const { processPages, processPage } = require("./imageOCR.service");
const { cleanOCRText } = require("../../utils/regex");

/**
 * One answer token: letter a-d, number 1-4, or roman I-IV
 * (roman ordered longest-first so IV/III/II don't become I)
 */
const ANSWER_TOKEN = "(?:IV|III|II|I|[a-dA-D]|[1-4]|[कखगघ])";

/**
 * Match "1. c", "12) 2", "240. b,d", "15. II,IV", "3 1" anywhere in text.
 */
const ANSWER_ENTRY_GLOBAL = new RegExp(
  `(\\d{1,3})\\s*[.\\)\\-:]\\s*(${ANSWER_TOKEN}(?:\\s*,\\s*${ANSWER_TOKEN})*)`,
  "gi"
);

const ANSWER_ENTRY_SPACE = new RegExp(
  `(?:^|\\s)(\\d{1,3})\\s+(${ANSWER_TOKEN}(?:\\s*,\\s*${ANSWER_TOKEN})*)(?=\\s|$)`,
  "gi"
);

/**
 * Normalize answer token → option key A/B/C/D
 * Supports: a/b/c/d, 1/2/3/4, I/II/III/IV
 */
function normalizeAnswerToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return null;

  const dev = { क: "A", ख: "B", ग: "C", घ: "D" };
  if (dev[raw]) return dev[raw];

  const upper = raw.toUpperCase();
  if (/^[A-D]$/.test(upper)) return upper;

  const numeric = {
    "1": "A",
    "2": "B",
    "3": "C",
    "4": "D",
  };
  if (numeric[upper]) return numeric[upper];

  const roman = {
    I: "A",
    II: "B",
    III: "C",
    IV: "D",
  };
  if (roman[upper]) return roman[upper];

  return null;
}

function tokensToKeys(answerPart) {
  return String(answerPart || "")
    .split(",")
    .map((k) => normalizeAnswerToken(k.trim()))
    .filter(Boolean);
}

/**
 * @returns {Record<string, string[]>} e.g. { "1": ["C"], "240": ["B","D"] }
 */
function parseAnswerKeyText(rawText) {
  const text = cleanOCRText(String(rawText || ""))
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ");

  const answers = {};

  const applyMatches = (regex) => {
    const clone = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = clone.exec(text)) !== null) {
      const qNo = String(Number(match[1]));
      const keys = tokensToKeys(match[2]);

      if (!qNo || !keys.length) continue;

      const existing = answers[qNo] || [];
      const merged = Array.from(new Set([...existing, ...keys]));
      answers[qNo] = merged;
    }
  };

  applyMatches(ANSWER_ENTRY_GLOBAL);
  applyMatches(ANSWER_ENTRY_SPACE);

  return answers;
}

async function extractTextFromPdfBuffer(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return String(result?.text || "").trim();
  } finally {
    try {
      await parser.destroy();
    } catch {
      // ignore
    }
  }
}

async function extractTextFromAnswerFile(file, { language = "en" } = {}) {
  if (!file?.path) {
    return { text: "", source: "none", tempFolder: null };
  }

  const extension = path.extname(file.originalname || file.path).toLowerCase();
  let tempFolder = null;
  const hindi = ["hi", "hin", "hindi"].includes(
    String(language || "").toLowerCase()
  );

  if (extension === ".pdf") {
    try {
      const buffer = await fs.readFile(file.path);
      const text = await extractTextFromPdfBuffer(buffer);
      if (text.length > 20) {
        return { text, source: "pdf-parse", tempFolder: null };
      }
    } catch (err) {
      console.warn(
        "pdf-parse failed for answer key, falling back to OCR:",
        err.message
      );
    }

    try {
      const pdf = await convertPDFToImages(file.path, {
        dpi: hindi ? 400 : 300,
      });
      tempFolder = pdf.outputDir;
      const text = await processPages(pdf.pages, { language });
      return { text, source: "ocr", tempFolder };
    } catch (err) {
      if (tempFolder) await deleteTempDirectory(tempFolder);
      throw new Error("Answer key OCR failed: " + err.message);
    }
  }

  if ([".jpg", ".jpeg", ".png"].includes(extension)) {
    const text = await processPage(file.path, { language });
    return { text, source: "ocr-image", tempFolder: null };
  }

  throw new Error("Answer key must be PDF/JPG/JPEG/PNG");
}

function applyAnswerKey(questions, answerMap) {
  if (!questions?.length || !answerMap || !Object.keys(answerMap).length) {
    return {
      questions,
      matched: 0,
      totalAnswers: Object.keys(answerMap || {}).length,
    };
  }

  let matched = 0;

  const updated = questions.map((q, index) => {
    const byNo = answerMap[String(q.questionNo)];
    const byIndex = answerMap[String(index + 1)];
    const keys = byNo || byIndex;

    if (!keys?.length) {
      return q;
    }

    matched += 1;
    const keySet = new Set(keys.map((k) => String(k).toUpperCase()));

    let options = (q.options || []).map((opt) => ({
      ...opt,
      is_correct: keySet.has(String(opt.key || "").toUpperCase()),
    }));

    const letterIndex = { A: 0, B: 1, C: 2, D: 3 };
    const hasLetterKeys = options.some((o) => /^[A-D]$/i.test(o.key));
    if (!hasLetterKeys && options.length) {
      options = options.map((opt, idx) => {
        const letter = Object.keys(letterIndex).find(
          (k) => letterIndex[k] === idx
        );
        return {
          ...opt,
          is_correct: letter ? keySet.has(letter) : Boolean(opt.is_correct),
        };
      });
    }

    return {
      ...q,
      options,
    };
  });

  return {
    questions: updated,
    matched,
    totalAnswers: Object.keys(answerMap).length,
  };
}

async function loadAndApplyAnswerKey(questions, answerFile, { language = "en" } = {}) {
  if (!answerFile) {
    return {
      questions,
      answerMeta: { applied: false, matched: 0, totalAnswers: 0 },
      tempFolder: null,
    };
  }

  const { text, source, tempFolder } = await extractTextFromAnswerFile(
    answerFile,
    { language }
  );
  const answerMap = parseAnswerKeyText(text);
  const { questions: updated, matched, totalAnswers } = applyAnswerKey(
    questions,
    answerMap
  );

  console.log(
    `✅ Answer key parsed (${source}): ${totalAnswers} keys, matched ${matched} questions`
  );

  return {
    questions: updated,
    answerMeta: {
      applied: true,
      source,
      matched,
      totalAnswers,
      sample: Object.fromEntries(Object.entries(answerMap).slice(0, 5)),
    },
    tempFolder,
  };
}

module.exports = {
  parseAnswerKeyText,
  normalizeAnswerToken,
  applyAnswerKey,
  extractTextFromAnswerFile,
  loadAndApplyAnswerKey,
};
