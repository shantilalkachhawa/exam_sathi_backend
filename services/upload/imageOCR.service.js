const sharp = require("sharp");
const path = require("path");
const fs = require("fs-extra");
const { createWorker } = require("tesseract.js");

const { preprocessImage } = require("../../utils/imagePreprocess");
const { reconstructTextFromOcrData } = require("./ocrLayout.service");
const { normalizeHindiOcrText } = require("./hindiTextNormalize.service");
const { cleanOCRText } = require("../../utils/regex");

let worker = null;
let workerLang = null;

function resolveOcrLang(language) {
  const lang = String(language || "en").toLowerCase();
  if (lang === "hi" || lang === "hin" || lang === "hindi") {
    // Hindi primary — fewer Latin confusions on Devanagari papers
    return "hin";
  }
  return "eng";
}

function isHindi(language) {
  return ["hi", "hin", "hindi"].includes(String(language || "").toLowerCase());
}

async function initWorker(language = "en") {
  const lang = resolveOcrLang(language);
  try {
    if (worker && workerLang !== lang) {
      await terminateWorker();
    }
    if (!worker) {
      worker = await createWorker(lang);
      workerLang = lang;

      // Dense exam paper: treat as uniform block of text
      // PSM 6 works better than auto for Hindi MCQ booklets
      await worker.setParameters({
        tessedit_pageseg_mode: "6",
        preserve_interword_spaces: "1",
      });

      console.log(`✅ OCR Worker Initialized (${lang}, PSM=6)`);
    }
  } catch (error) {
    console.error("Worker Init Error:", error);
    // Fallback: Hindi alone may be missing — try hin+eng
    if (lang === "hin") {
      try {
        worker = await createWorker("hin+eng");
        workerLang = "hin+eng";
        await worker.setParameters({
          tessedit_pageseg_mode: "6",
          preserve_interword_spaces: "1",
        });
        console.log("✅ OCR Worker Initialized (hin+eng fallback, PSM=6)");
        return;
      } catch (fallbackErr) {
        console.error("OCR fallback failed:", fallbackErr);
      }
    }
    throw error;
  }
}

async function terminateWorker() {
  try {
    if (worker) {
      await worker.terminate();
    }
    worker = null;
    workerLang = null;
    console.log("✅ OCR Worker Terminated");
  } catch (error) {
    console.error("Terminate Worker Error:", error);
  }
}

async function recognize(imagePath, { language = "en" } = {}) {
  try {
    const { data } = await worker.recognize(imagePath);
    const hindi = isHindi(language);
    let text = String(data.text || "").trim();
    if (!text || (hindi && !/\s/.test(text.slice(0, 200)))) {
      text = reconstructTextFromOcrData(data) || text;
    }
    if (hindi) {
      text = normalizeHindiOcrText(text);
    }
    text = text
      .split("\n")
      .map((line) => cleanOCRText(line))
      .join("\n");
    console.log(
      `${path.basename(imagePath)} Confidence : ${data.confidence}`
    );
    return text;
  } catch (error) {
    console.error(`OCR Error : ${imagePath}`, error.message);
    return "";
  }
}

/**
 * Detect 2-column layout by comparing ink density in center gutter vs side bands.
 * Avoids cutting Devanagari words in half on single-column Hindi papers.
 */
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

    // Two-column if gutter is much emptier than text columns
    const twoCol = sides > 0.04 && mid < sides * 0.4 && left > 0.03 && right > 0.03;
    console.log(
      `Layout detect: left=${left.toFixed(3)} mid=${mid.toFixed(3)} right=${right.toFixed(3)} → ${
        twoCol ? "2-col" : "1-col"
      }`
    );
    return twoCol;
  } catch (err) {
    console.warn("Layout detect failed, defaulting to 1-col:", err.message);
    return false;
  }
}

async function preprocessFullPage(imagePath, soft) {
  const out = path.join(
    path.dirname(imagePath),
    `full-pre-${Date.now()}.png`
  );
  await preprocessImage(imagePath, out, { soft });
  return out;
}

async function splitPage(imagePath, { soft = false } = {}) {
  const metadata = await sharp(imagePath).metadata();
  const width = metadata.width;
  const height = metadata.height;
  const halfWidth = Math.floor(width / 2);
  const dir = path.dirname(imagePath);

  const leftRaw = path.join(dir, `left-${Date.now()}.png`);
  const rightRaw = path.join(dir, `right-${Date.now()}.png`);

  await sharp(imagePath)
    .extract({ left: 0, top: 0, width: halfWidth, height })
    .toFile(leftRaw);

  await sharp(imagePath)
    .extract({ left: halfWidth, top: 0, width: halfWidth, height })
    .toFile(rightRaw);

  const left = path.join(dir, `left-pre-${Date.now()}.png`);
  const right = path.join(dir, `right-pre-${Date.now()}.png`);

  await preprocessImage(leftRaw, left, { soft });
  await preprocessImage(rightRaw, right, { soft });

  await fs.remove(leftRaw);
  await fs.remove(rightRaw);

  return { left, right };
}

async function processPage(imagePath, { language = "en" } = {}) {
  const temps = [];
  const soft = isHindi(language);

  try {
    await initWorker(language);

    // Split when gutter detection says 2-column (English + Hindi booklets)
    const twoCol = await isTwoColumnLayout(imagePath);

    if (!twoCol) {
      console.log("OCR FULL PAGE");
      const full = await preprocessFullPage(imagePath, soft);
      temps.push(full);
      return await recognize(full, { language });
    }

    const images = await splitPage(imagePath, { soft });
    temps.push(images.left, images.right);

    console.log("OCR LEFT");
    const leftText = await recognize(images.left, { language });
    console.log("OCR RIGHT");
    const rightText = await recognize(images.right, { language });

    return `${leftText}\n${rightText}`;
  } catch (error) {
    console.error(`Page OCR Error : ${imagePath}`, error);
    return "";
  } finally {
    for (const file of temps) {
      try {
        if (file && (await fs.pathExists(file))) await fs.remove(file);
      } catch (e) {
        console.log(e.message);
      }
    }
  }
}

async function processPages(images, { language = "en" } = {}) {
  let text = "";

  try {
    await initWorker(language);

    for (let i = 0; i < images.length; i++) {
      console.log(`Processing Page ${i + 1}/${images.length}`);
      try {
        const pageText = await processPage(images[i], { language });
        text += "\n" + pageText;
      } catch (error) {
        console.error(`Failed Page ${i + 1}`, error);
      }
    }
  } finally {
    await terminateWorker();
  }

  return text;
}

module.exports = {
  processPages,
  processPage,
  terminateWorker,
};
