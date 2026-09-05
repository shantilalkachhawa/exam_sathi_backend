// utils/regex.js

/** 1. / 1) / 1- / प्रश्न 1. — reject section "1.1" via parser guard */
const QUESTION_REGEX =
  /^(?:प्रश्न\s*)?(\d{1,3})(?:[\.\)\-]|।)\s+(.*)$/u;

/**
 * Options:
 * [A] (A) A. A) (1) 1.
 * (a)(b)(c)(d)
 * (क)(ख)(ग)(घ) क. ख)
 */
const OPTION_REGEX =
  /^(?:\[([A-Da-d])\]|\(([A-Da-d])\)|([A-Da-d])[\.\)]|\(([1-4])\)|([1-4])[\.\)]|\(([कखगघ])\)|([कखगघ])[\.\)])\s*(.*)$/u;

const INLINE_OPTION_SPLIT_REGEX =
  /(?=(?:\[[A-Da-d]\]|\([A-Da-d]\)|(?<![A-Za-z0-9\u0900-\u097F])[A-Da-d][\.\)]|\([1-4]\)|\([कखगघ]\)|[कखगघ][\.\)]))/gu;

const ANSWER_KEY_REGEX =
  /^(\d+)\s*[.\)\-]?\s*((?:[A-Da-d]|[1-4]|IV|III|II|I|[कखगघ])(?:\s*,\s*(?:[A-Da-d]|[1-4]|IV|III|II|I|[कखगघ]))*)$/iu;

const PAGE_NUMBER_REGEX =
  /^(?:Page\s+\d+|--\s*\d+\s+of\s+\d+\s*--|\d+\s*\/\s*\d+)$/i;

const HEADER_REGEX =
  /^(MPPSC|SET|GENERAL STUDIES|Question Booklet|Roll No|Series|\[P\.T\.O\.\]|\d{1,2}-[A-Z]|P\.T\.O\.?|UNIT\s*[-–]?\s*\d+|Hornbill|जनजातिया+ँ?\s*MCQs|MCQs)$/i;

const SECTION_HEADER_REGEX =
  /^\d+\.\d+(\.\d+)?\s+\S+/u;

const MATCH_HINT_REGEX =
  /\bmatch\b|list[\s—\-]*i\b|list[\s—\-]*ii\b|code\s+given\s+below|सही जोड[े़]|नीचे दिय[े़] गए कूट|कूट से सही|सुमेलित|जोड़े बनाएं/iu;

const STATEMENT_HINT_REGEX =
  /\bbased on the following statements\b|\bconsider the following statements\b|\bwhich of the (?:above|following) statements\b|निम्न(?:नलिखित)? में से|दनम्न/iu;

const ASSERTION_HINT_REGEX =
  /\bassertion\b.*\breason\b|\breason\b.*\bassertion\b|अभिकथन.*कारण|कारण.*अभिकथन/iu;

const DEVANAGARI_OPTION_MAP = {
  क: "A",
  ख: "B",
  ग: "C",
  घ: "D",
};

function repairDevanagariSpacing(text) {
  return String(text || "")
    // Join dependent vowel signs (matras) to previous consonant
    .replace(/\s+(?=[\u093A-\u094F\u0901-\u0903\u093C])/gu, "")
    // Join virama (halant) — keeps conjuncts like प्र / स्क / स्थिति
    .replace(/([\u0900-\u097F])\s+(\u094D)/gu, "$1$2")
    .replace(/(\u094D)\s+([\u0900-\u097F])/gu, "$1$2");
  // NOTE: Do NOT remove space between a matra and the next consonant —
  // that glues separate Hindi words (के + अनुसार → केअनुसार).
}

function cleanOCRText(text) {
  return repairDevanagariSpacing(
    String(text || "")
      .replace(/©/g, "(C)")
      .replace(/\(8\)/g, "(B)")
      .replace(/\[8\]/g, "[B]")
      .replace(/\(0\)/g, "(D)")
      .replace(/\[0\]/g, "[D]")
      .replace(/\bO\)/g, "D)")
      .replace(/®/g, "(B)")
      .replace(/\r/g, "")
      .replace(/\t/g, " ")
      .replace(/[ \u00A0]+/g, " ")
      .trim()
  );
}

/**
 * Remove trailing exam-source tags from question stems, e.g.
 * "... चुनिए [MPPSC Pre 2008]" → "... चुनिए"
 * Keeps Hindi wording intact; does not touch short option markers like [A].
 */
function stripExamSourceTags(text) {
  let out = String(text || "").trim();
  if (!out) return out;

  // Drop one or more trailing [Exam / year ...] citations (min 4 chars inside)
  out = out.replace(/(?:\s*\[[^\]]{4,}\])+\s*$/u, "").trim();

  // If a citation sits right after ? or । / Devanagari danda
  out = out.replace(/([?\u0964।])\s*\[[^\]]{4,}\]/gu, "$1").trim();

  // Mid/end leftover: space + [Exam...] before end of stem (after punctuation)
  out = out.replace(/\s+\[[A-Za-z][^\]]{3,}\]\s*$/u, "").trim();

  return out;
}

module.exports = {
  QUESTION_REGEX,
  OPTION_REGEX,
  INLINE_OPTION_SPLIT_REGEX,
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
};
