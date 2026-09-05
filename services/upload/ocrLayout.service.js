/**
 * Reconstruct OCR text from Tesseract word bounding boxes.
 * Layout-based — no static word lists. Preserves spaces Tesseract detected
 * between words even when data.text glues them.
 */

function wordConfidence(word) {
  return Number(word?.confidence ?? word?.conf ?? 0);
}

function wordText(word) {
  return String(word?.text ?? "").trim();
}

function wordBox(word) {
  const b = word?.bbox || word?.box || {};
  return {
    x0: Number(b.x0 ?? b.left ?? 0),
    y0: Number(b.y0 ?? b.top ?? 0),
    x1: Number(b.x1 ?? b.right ?? 0),
    y1: Number(b.y1 ?? b.bottom ?? 0),
  };
}

function collectWords(data) {
  const out = [];
  const push = (w) => {
    const text = wordText(w);
    if (!text || wordConfidence(w) < 25) return;
    out.push({ text, bbox: wordBox(w), conf: wordConfidence(w) });
  };

  if (Array.isArray(data?.words) && data.words.length) {
    data.words.forEach(push);
    return out;
  }

  const walk = (node) => {
    if (!node) return;
    if (node.text != null && node.bbox) push(node);
    for (const key of ["words", "lines", "paragraphs", "blocks"]) {
      if (Array.isArray(node[key])) node[key].forEach(walk);
    }
  };
  walk(data);
  return out;
}

function groupWordsIntoLines(words, yTolerance = 14) {
  if (!words.length) return [];

  const sorted = [...words].sort((a, b) => {
    const dy = a.bbox.y0 - b.bbox.y0;
    if (Math.abs(dy) > yTolerance) return dy;
    return a.bbox.x0 - b.bbox.x0;
  });

  const lines = [];
  let current = [];
  let lineY = null;

  for (const w of sorted) {
    const cy = (w.bbox.y0 + w.bbox.y1) / 2;
    if (lineY == null || Math.abs(cy - lineY) <= yTolerance) {
      current.push(w);
      lineY = lineY == null ? cy : (lineY + cy) / 2;
    } else {
      if (current.length) lines.push(current);
      current = [w];
      lineY = cy;
    }
  }
  if (current.length) lines.push(current);
  return lines;
}

function shouldInsertSpace(prev, next) {
  const gap = next.bbox.x0 - prev.bbox.x1;
  if (gap <= 0) return false;

  const prevWidth = Math.max(prev.bbox.x1 - prev.bbox.x0, 1);
  const nextWidth = Math.max(next.bbox.x1 - next.bbox.x0, 1);
  const charW = Math.min(prevWidth / Math.max(prev.text.length, 1), 48);

  // Large horizontal gap → word boundary
  if (gap >= charW * 0.28) return true;

  // Script / digit boundary with even small gap
  const prevLast = prev.text.slice(-1);
  const nextFirst = next.text[0];
  const isDev = (ch) => /[\u0900-\u097F]/.test(ch);
  const isLat = (ch) => /[A-Za-z]/.test(ch);
  const isDig = (ch) => /\d/.test(ch);

  if ((isDev(prevLast) && isLat(nextFirst)) || (isLat(prevLast) && isDev(nextFirst))) {
    return gap > 1;
  }
  if ((isDev(prevLast) && isDig(nextFirst)) || (isDig(prevLast) && isDev(nextFirst))) {
    return gap > 1;
  }
  if ((isDig(prevLast) && isLat(nextFirst)) || (isLat(prevLast) && isDig(nextFirst))) {
    return gap > 1;
  }

  return false;
}

function joinLineWords(lineWords) {
  const sorted = [...lineWords].sort((a, b) => a.bbox.x0 - b.bbox.x0);
  let out = "";
  let prev = null;

  for (const w of sorted) {
    if (!w.text) continue;
    if (prev && shouldInsertSpace(prev, w)) out += " ";
    out += w.text;
    prev = w;
  }
  return out.trim();
}

/**
 * @param {import('tesseract.js').Page} data - Tesseract recognize() data
 * @returns {string}
 */
function reconstructTextFromOcrData(data) {
  const words = collectWords(data);
  if (!words.length) return String(data?.text || "").trim();

  const lines = groupWordsIntoLines(words);
  return lines.map(joinLineWords).filter(Boolean).join("\n");
}

module.exports = {
  reconstructTextFromOcrData,
  collectWords,
  groupWordsIntoLines,
};
