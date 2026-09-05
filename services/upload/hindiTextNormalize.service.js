/**
 * Algorithmic Hindi OCR cleanup — no static word dictionaries.
 * Fixes spacing boundaries, dates, years, and common digit OCR drops.
 */

/** Insert spaces at script/digit boundaries when OCR glues tokens. */
function insertScriptBoundaries(text) {
  let t = String(text || "");

  // Devanagari ↔ Latin
  t = t.replace(/([\u0900-\u097F])([A-Za-z(])/gu, "$1 $2");
  t = t.replace(/([A-Za-z)])([\u0900-\u097F])/gu, "$1 $2");

  // Devanagari ↔ digits
  t = t.replace(/([\u0900-\u097F])(\d)/gu, "$1 $2");
  t = t.replace(/(\d)([\u0900-\u097F])/gu, "$1 $2");

  // Punctuation spacing
  t = t.replace(/([,;:])([\u0900-\u097F])/gu, "$1 $2");
  t = t.replace(/([\u0900-\u097F])([?])/gu, "$1 $2");
  t = t.replace(/([?])([\u0900-\u097F])/gu, "$1 $2");

  // Common OCR: मे → में (particle, not compound)
  t = t.replace(/(^|[\s(,])मे([\s,.)?]|$)/gu, "$1में$2");

  return t.replace(/[ \t]{2,}/g, " ").trim();
}

/** Fix dropped / mangled digits in dates and years (pattern-based only). */
function repairOcrNumbers(text) {
  let t = String(text || "");

  // DD.MM.YYY → DD.MM.1YYY  (30.04.977 → 30.04.1977)
  t = t.replace(
    /(\d{1,2})\.(\d{1,2})\.(\d{3})\b/g,
    (m, d, mo, y) => {
      const n = Number(y);
      if (n >= 800 && n <= 999) return `${d}.${mo}.1${y}`;
      return m;
    }
  );

  // After closing paren / acronym: (ISFR) 202 → (ISFR) 2021
  t = t.replace(/\)\s*(20[0-5])\b/g, (m, y) => {
    if (y.length === 3) return `) ${y}1`;
    return m;
  });

  // Hindi text + comma + 3-digit year: ..., 946 → ..., 1946
  t = t.replace(
    /([\u0900-\u097F]+),\s*(\d{3,4})\b/gu,
    (m, prefix, y) => {
      const n = Number(y);
      if (y.length === 3 && n >= 800 && n <= 999) return `${prefix}, 1${y}`;
      if (y.length === 4 && n >= 2900 && n <= 2999) {
        return `${prefix}, 1${y.slice(1)}`;
      }
      return m;
    }
  );

  // अधिनियम 956 / अधिनियम, 956 → 1956
  t = t.replace(
    /(अधिनियम,?\s*)(\d{3})\b/gu,
    (m, prefix, y) => {
      const n = Number(y);
      if (n >= 900 && n <= 999) return `${prefix}1${y}`;
      return m;
    }
  );

  // Decade shorthand: 200-20 → 2001-2010 (census / population questions)
  t = t.replace(/\b200\s*[-–]\s*20\b/g, "2001-2010");

  // Leading 1 dropped before प्रतिशत: 0 प्रतिशत → 10 प्रतिशत
  t = t.replace(/\b0\s+प्रतिशत/g, "10 प्रतिशत");

  // OCR reads ? as 7 at line end
  t = t.replace(/है\s+7\s*$/g, "है ?");
  t = t.replace(/है\s+7\s+([?।])/g, "है ? $1");

  // -00 मीटर → 100 मीटर
  t = t.replace(/-\s*00\s+मीटर/g, "100 मीटर");

  // 6 अप्रैल, 930 → 6 अप्रैल, 1930 (day month, 3-digit year)
  t = t.replace(
    /(\d{1,2}\s+[\u0900-\u097F]+,?\s*)(\d{3})\b/gu,
    (m, prefix, y) => {
      const n = Number(y);
      if (n >= 900 && n <= 999) return `${prefix}1${y}`;
      return m;
    }
  );

  // Standalone 3-digit year after comma at end of option/date
  t = t.replace(/,\s*(\d{3})\b/g, (m, y) => {
    const n = Number(y);
    if (n >= 900 && n <= 999) return `, 1${y}`;
    return m;
  });

  return t;
}

/** Light cleanup after spacing + numbers — still no word lists. */
function normalizeHindiOcrLine(text) {
  let t = String(text || "")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]{2,}/g, " ")
    .trim();

  t = insertScriptBoundaries(t);
  t = repairOcrNumbers(t);

  // Option marker OCR fixes (Latin only)
  t = t
    .replace(/\(8\)/g, "(B)")
    .replace(/\[8\]/g, "[B]")
    .replace(/\(0\)/g, "(D)")
    .replace(/\[0\]/g, "[D]")
    .replace(/©/g, "(C)")
    .replace(/®/g, "(B)");

  // Strip OCR junk before question stems (',.. [0, etc.)
  t = t.replace(/^\[(?:0|O)\s*,\s*/i, "");
  t = t.replace(/^['",.\s|]+/u, "");
  t = t.replace(/\s*\|\s*$/g, "");

  return t.replace(/[ \t]{2,}/g, " ").trim();
}

function normalizeHindiOcrText(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => normalizeHindiOcrLine(line))
    .join("\n");
}

module.exports = {
  insertScriptBoundaries,
  repairOcrNumbers,
  normalizeHindiOcrLine,
  normalizeHindiOcrText,
};
