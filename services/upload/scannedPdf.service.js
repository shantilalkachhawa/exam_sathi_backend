const fs = require("fs-extra");
const path = require("path");
const { createCanvas } = require("@napi-rs/canvas");
const sharp = require("sharp");
const { createWorker } = require("tesseract.js");
const { v4: uuid } = require("uuid");
const { cleanOCRText } = require("../../utils/regex");
const { normalizeParsedQuestion } = require("./questionTypes");
const { reconstructTextFromOcrData } = require("./ocrLayout.service");
const {
  normalizeHindiOcrText,
} = require("./hindiTextNormalize.service");

const RENDER_SCALE = 4;
const PREPROCESS_WIDTH = 2400;

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(Math.ceil(width), Math.ceil(height));
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(c, width, height) {
    c.canvas.width = Math.ceil(width);
    c.canvas.height = Math.ceil(height);
  }
  destroy(c) {
    c.canvas.width = 1;
    c.canvas.height = 1;
    c.canvas = null;
    c.context = null;
  }
}

async function loadPdfjs() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

function isHindi(language) {
  return ["hi", "hin", "hindi"].includes(String(language || "").toLowerCase());
}

async function renderPageToPng(page, scale, outPath) {
  const viewport = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const { canvas, context } = factory.create(viewport.width, viewport.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvasContext: context,
    viewport,
    canvasFactory: factory,
  }).promise;
  await fs.writeFile(outPath, canvas.toBuffer("image/png"));
  return { width: canvas.width, height: canvas.height };
}

async function preprocessColumn(inputPath, outputPath) {
  await sharp(inputPath)
    .grayscale()
    .normalize({ lower: 3, upper: 97 })
    .modulate({ brightness: 1.03 })
    .linear(1.2, -10)
    .resize({
      width: PREPROCESS_WIDTH,
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toFile(outputPath);
}

async function isTwoColumnLayout(imagePath) {
  try {
    const { data, info } = await sharp(imagePath)
      .grayscale()
      .resize({ width: 1000, withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const y0 = Math.floor(height * 0.08);
    const y1 = Math.floor(height * 0.92);
    const rows = Math.max(1, y1 - y0);

    const bandInk = (x0, x1) => {
      let ink = 0;
      const w = Math.max(1, x1 - x0);
      for (let y = y0; y < y1; y++) {
        const row = y * width;
        for (let x = x0; x < x1; x++) {
          if (data[row + x] < 200) ink++;
        }
      }
      return ink / (w * rows);
    };

    const left = bandInk(Math.floor(width * 0.08), Math.floor(width * 0.38));
    const mid = bandInk(Math.floor(width * 0.46), Math.floor(width * 0.54));
    const right = bandInk(Math.floor(width * 0.62), Math.floor(width * 0.92));
    const sides = (left + right) / 2;
    return sides > 0.04 && mid < sides * 0.4 && left > 0.03 && right > 0.03;
  } catch {
    return false;
  }
}

async function splitTwoColumns(pagePngPath, outDir, pageNumber) {
  const meta = await sharp(pagePngPath).metadata();
  const width = meta.width;
  const height = meta.height;
  const gutter = Math.max(10, Math.floor(width * 0.015));
  const mid = Math.floor(width / 2);

  const leftRaw = path.join(outDir, `page-${pageNumber}-left-raw.png`);
  const rightRaw = path.join(outDir, `page-${pageNumber}-right-raw.png`);
  const leftPre = path.join(outDir, `page-${pageNumber}-left.png`);
  const rightPre = path.join(outDir, `page-${pageNumber}-right.png`);

  await sharp(pagePngPath)
    .extract({ left: 0, top: 0, width: mid - gutter, height })
    .toFile(leftRaw);
  await sharp(pagePngPath)
    .extract({
      left: mid + gutter,
      top: 0,
      width: width - mid - gutter,
      height,
    })
    .toFile(rightRaw);

  await preprocessColumn(leftRaw, leftPre);
  await preprocessColumn(rightRaw, rightPre);
  await fs.remove(leftRaw).catch(() => {});
  await fs.remove(rightRaw).catch(() => {});
  return { left: leftPre, right: rightPre };
}

async function preprocessFull(pagePngPath, outDir, pageNumber) {
  const out = path.join(outDir, `page-${pageNumber}-full-pre.png`);
  await preprocessColumn(pagePngPath, out);
  return out;
}

const OPTION_PREFIX_RE =
  /^\s*(?:\({1,2}\s*([A-Da-dकखगघ1-4]|CO|छ|©|®|&)\s*\){1,2}|\[([A-Da-d0-9])\]|([A-Da-d])[.)])\s*(.*)$/u;

const QUESTION_NUM_RE =
  /^\s*(?:प्रश्न\s*)?([0-9०-९]{1,3}|[॥।|Il!]{1,2}[0-9०-९]?)\s*[.)\-،,]+\s*(.*)$/u;

function isNoiseLine(line) {
  if (!line) return true;
  if (/^SPE\//i.test(line)) return true;
  if (/^\(\s*\d+\s*[-–]\s*[A-Z]\s*\)$/i.test(line)) return true;
  if (/^P\.?T\.?O\.?$/i.test(line)) return true;
  if (/^Page\s+\d+/i.test(line)) return true;
  if (/^[\-\.=_\s|]+$/.test(line)) return true;
  if (line.length <= 2 && !/[0-9\u0900-\u097F]/u.test(line)) return true;
  return false;
}

function digitNormalize(token) {
  const map = {
    "०": "0",
    "१": "1",
    "२": "2",
    "३": "3",
    "४": "4",
    "५": "5",
    "६": "6",
    "७": "7",
    "८": "8",
    "९": "9",
    "॥": "1",
    "।": "1",
    "|": "1",
    I: "1",
    l: "1",
    "!": "1",
  };
  return String(token || "")
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^\d]/g, "");
}

function fixLeadingQuestionNumber(line) {
  let m = line.match(/^[॥।]{1,2}\s*([0-9०-९])\s*[.)\-،,]?\s*(.*)$/u);
  if (m) return `${digitNormalize("1" + m[1])}. ${m[2]}`.trim();
  m = line.match(/^[lI|!]\s*[.)\-،,]+\s*(.*)$/u);
  if (m && /[\u0900-\u097F]/.test(m[1])) return `1. ${m[1]}`.trim();
  return line;
}

function normalizeLines(raw, { hindi = true } = {}) {
  const text = hindi ? normalizeHindiOcrText(raw) : String(raw || "");
  return text
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => cleanOCRText(l))
    .map(fixLeadingQuestionNumber)
    .map((l) => l.replace(/\$[^ \n]{0,24}/g, "").trim())
    .filter((l) => !isNoiseLine(l));
}

async function recognizeImage(worker, imagePath, { hindi = true } = {}) {
  const { data } = await worker.recognize(imagePath);
  // Tesseract data.text usually preserves word spaces better than bbox rebuild
  let raw = String(data.text || "").trim();
  if (!raw || (hindi && !/\s/.test(raw.slice(0, 200)))) {
    raw = reconstructTextFromOcrData(data) || raw;
  }
  return normalizeLines(raw, { hindi });
}

function parseOptionLine(line) {
  const m = line.match(OPTION_PREFIX_RE);
  if (!m) return null;
  const text = (m[m.length - 1] || "").trim();
  if (!text) return null;
  return text.replace(/[|«»]+$/g, "").trim();
}

function extractQuestionNumber(stem) {
  const m = String(stem || "").match(QUESTION_NUM_RE);
  if (!m) return { number: null, text: String(stem || "").trim() };
  const n = Number(digitNormalize(m[1]));
  if (!n || n < 1 || n > 500) {
    return { number: null, text: String(stem || "").trim() };
  }
  return { number: n, text: (m[2] || "").trim() };
}

function parseQuestionsFromLines(lines, { startNumberHint = null } = {}) {
  const questions = [];
  let i = 0;
  let seq = startNumberHint;

  while (i < lines.length) {
    while (i < lines.length && parseOptionLine(lines[i])) i++;
    if (i >= lines.length) break;

    const stemParts = [];
    while (i < lines.length && !parseOptionLine(lines[i])) {
      stemParts.push(lines[i]);
      i++;
    }

    const options = [];
    while (i < lines.length && options.length < 4) {
      const opt = parseOptionLine(lines[i]);
      if (!opt) {
        if (options.length > 0) {
          options[options.length - 1] += " " + lines[i];
          i++;
          continue;
        }
        break;
      }
      options.push(opt);
      i++;
    }

    if (options.length < 2) continue;

    const stemRaw = stemParts
      .filter((p) => !/^[0-9|.\s]{1,4}$/.test(p))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!stemRaw && options.length < 4) continue;

    let { number, text } = extractQuestionNumber(stemRaw);
    if (!text) text = stemRaw;
    text = text
      .replace(/^[0-9|.\s]{1,6}(?=[\u0900-\u097F"“])/u, "")
      .replace(/^[.\-\s]+/, "")
      .trim();

    if (seq != null) {
      number = seq;
      seq += 1;
    } else if (number != null) {
      seq = number + 1;
    }

    const cleanOpts = options.slice(0, 4).map((t) =>
      t
        .replace(/^\(([A-Da-d1-4])\)\s*/u, "")
        .replace(/\s+/g, " ")
        .trim()
    );

    questions.push({
      questionNo: number,
      title: text.replace(/\s+/g, " ").trim(),
      type: "mcq",
      options: cleanOpts.map((t, idx) => ({
        key: String.fromCharCode(65 + idx),
        text: t,
        is_correct: false,
      })),
    });
  }

  return questions;
}

function mergeQuestions(sets) {
  const all = sets.flat();
  let next = 1;
  const used = new Set(all.map((q) => q.questionNo).filter(Boolean));

  for (const q of all) {
    if (q.questionNo == null) {
      while (used.has(next)) next++;
      q.questionNo = next;
      used.add(next);
      next++;
    }
  }

  const map = new Map();
  for (const q of all) {
    const prev = map.get(q.questionNo);
    const score = (x) =>
      (x.options?.length === 4 ? 1000 : 0) +
      (x.title?.length || 0) +
      (x.options || []).reduce((s, o) => s + (o.text?.length || 0), 0);
    if (!prev || score(q) > score(prev)) map.set(q.questionNo, q);
  }

  return [...map.values()]
    .filter((q) => q.title && q.options.length >= 2)
    .sort((a, b) => a.questionNo - b.questionNo);
}

function lastQuestionNo(sets) {
  const nums = sets
    .flat()
    .map((q) => q.questionNo)
    .filter((n) => n != null);
  return nums.length ? Math.max(...nums) : null;
}

/**
 * OCR a scanned PDF via pdf.js (no poppler needed) + Tesseract.
 * Splits 2-column Hindi booklets left→right.
 */
async function extractScannedPdf({
  pdfPath,
  language = "hi",
  forceTwoColumn = null,
} = {}) {
  const outDir = path.join(process.cwd(), "uploads", "temp", uuid());
  await fs.ensureDir(outDir);

  const pdfjsLib = await loadPdfjs();
  const buffer = await fs.readFile(pdfPath);
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;

  const hindi = isHindi(language);
  const worker = await createWorker(hindi ? "hin+eng" : "eng");
  await worker.setParameters({
    tessedit_pageseg_mode: "6",
    preserve_interword_spaces: "1",
  });

  const textChunks = [];
  const questionSets = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const pagePng = path.join(outDir, `page-${pageNumber}.png`);
      await renderPageToPng(page, RENDER_SCALE, pagePng);

      let twoCol = forceTwoColumn;
      if (twoCol == null) {
        twoCol = await isTwoColumnLayout(pagePng);
        // Hindi scanned booklets are often 2-col even if detection is weak
        if (hindi && !twoCol) {
          twoCol = true;
        }
      }

      if (twoCol) {
        const cols = await splitTwoColumns(pagePng, outDir, pageNumber);
        for (const [, img] of [
          ["left", cols.left],
          ["right", cols.right],
        ]) {
          const lines = await recognizeImage(worker, img, { hindi });
          textChunks.push(lines.join("\n"));
          const lastNo = lastQuestionNo(questionSets);
          const hinted = parseQuestionsFromLines(lines, {
            startNumberHint: lastNo != null ? lastNo + 1 : 1,
          });
          questionSets.push(hinted);
          console.log(
            `OCR page ${pageNumber}: ${hinted.length} question block(s)`
          );
        }
      } else {
        const full = await preprocessFull(pagePng, outDir, pageNumber);
        const lines = await recognizeImage(worker, full, { hindi });
        textChunks.push(lines.join("\n"));
        const lastNo = lastQuestionNo(questionSets);
        questionSets.push(
          parseQuestionsFromLines(lines, {
            startNumberHint: lastNo != null ? lastNo + 1 : 1,
          })
        );
      }
    }
  } finally {
    await worker.terminate();
  }

  const questions = mergeQuestions(questionSets).map((q) =>
    normalizeParsedQuestion({ ...q, language: hindi ? "hi" : language }, 1)
  );

  return {
    text: textChunks.join("\n\n"),
    questions,
    source: "pdfjs-ocr",
    tempFolder: outDir,
  };
}

/**
 * Parse already-OCR'd text with cluster MCQ parser (Hindi booklet friendly).
 */
function parseClusterQuestions(text, { language = "hi", defaultType = 1 } = {}) {
  const lines = normalizeLines(text, { hindi: isHindi(language) });
  const raw = parseQuestionsFromLines(lines, { startNumberHint: 1 });
  return mergeQuestions([raw]).map((q) =>
    normalizeParsedQuestion(
      { ...q, language: isHindi(language) ? "hi" : language },
      defaultType
    )
  );
}

module.exports = {
  extractScannedPdf,
  parseClusterQuestions,
  isTwoColumnLayout,
};
