const path = require("path");
const fs = require("fs-extra");
const { PDFParse } = require("pdf-parse");

const {
  convertPDFToImages,
  deleteTempDirectory,
} = require("./pdf.service");
const { processPages, processPage, terminateWorker } = require("./imageOCR.service");
const { extractScannedPdf } = require("./scannedPdf.service");

function isHindi(language) {
  return ["hi", "hin", "hindi"].includes(String(language || "").toLowerCase());
}

function hasUsefulDevanagari(text) {
  const chars = String(text || "").replace(/\s/g, "");
  if (chars.length < 80) return false;
  const dev = (chars.match(/[\u0900-\u097F]/g) || []).length;
  return dev / chars.length >= 0.3;
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

/**
 * Prefer embedded PDF text when it is real selectable text.
 * For Hindi / scanned papers: pdf.js render + Tesseract (no poppler required).
 */
async function extractQuestionPaperText(file, { language = "en" } = {}) {
  if (!file?.path) {
    return { text: "", source: "none", tempFolder: null, questions: null };
  }

  const extension = path.extname(file.originalname || file.path).toLowerCase();
  const hindi = isHindi(language);
  let tempFolder = null;

  if (extension === ".pdf") {
    try {
      const buffer = await fs.readFile(file.path);
      const text = await extractTextFromPdfBuffer(buffer);

      if (hindi) {
        if (hasUsefulDevanagari(text) && text.length > 200) {
          return {
            text,
            source: "pdf-parse",
            tempFolder: null,
            questions: null,
          };
        }
      } else if (text.length > 80) {
        return {
          text,
          source: "pdf-parse",
          tempFolder: null,
          questions: null,
        };
      }
    } catch (err) {
      console.warn(
        "pdf-parse failed for question paper, falling back to OCR:",
        err.message
      );
    }

    // Primary path for scanned / Hindi PDFs: pdf.js + Tesseract (works without poppler)
    try {
      console.log("Using pdfjs-ocr pipeline...");
      const scanned = await extractScannedPdf({
        pdfPath: file.path,
        language: hindi ? "hi" : language,
        forceTwoColumn: hindi ? true : null,
      });
      return {
        text: scanned.text,
        source: scanned.source,
        tempFolder: scanned.tempFolder,
        questions: scanned.questions,
      };
    } catch (pdfjsErr) {
      console.warn(
        "pdfjs-ocr failed, trying poppler fallback:",
        pdfjsErr.message
      );
    }

    // Fallback: poppler (requires pdftoppm installed on machine)
    try {
      const pdf = await convertPDFToImages(file.path, {
        dpi: hindi ? 400 : 300,
      });
      tempFolder = pdf.outputDir;
      const text = await processPages(pdf.pages, {
        language: hindi ? "hi" : language,
      });
      return { text, source: "ocr", tempFolder, questions: null };
    } catch (err) {
      if (tempFolder) await deleteTempDirectory(tempFolder);
      throw new Error("Question paper OCR failed: " + err.message);
    }
  }

  if ([".jpg", ".jpeg", ".png"].includes(extension)) {
    try {
      const text = await processPage(file.path, {
        language: hindi ? "hi" : language,
      });
      return { text, source: "ocr-image", tempFolder: null, questions: null };
    } finally {
      await terminateWorker();
    }
  }

  throw new Error("Only PDF/JPG/JPEG/PNG supported.");
}

module.exports = {
  extractQuestionPaperText,
  extractTextFromPdfBuffer,
};
