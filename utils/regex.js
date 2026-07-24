// utils/regex.js

const QUESTION_REGEX =
    /^(\d{1,3})[\.\)\-]\s*(.*)$/;

/** [A] (A) A. A) (1) 1. — MPPCS booklet style */
const OPTION_REGEX =
    /^(?:\[([A-D])\]|\(([A-D])\)|([A-D])[\.\)]|\(([1-4])\)|([1-4])[\.\)])\s*(.*)$/i;

const INLINE_OPTION_SPLIT_REGEX =
    /(?=(?:\[([A-D])\]|\(([A-D])\)|(?<![A-Za-z0-9])([A-D])[\.\)]|\(([1-4])\))\s*)/gi;

const ANSWER_KEY_REGEX =
    /^(\d+)\s+([A-D])$/i;

const PAGE_NUMBER_REGEX =
    /^Page\s+\d+/i;

const HEADER_REGEX =
    /^(MPPSC|SET|GENERAL STUDIES|Question Booklet|Roll No|Series|\[P\.T\.O\.\]|\d{1,2}-[A-Z]|P\.T\.O\.?)$/i;

const MATCH_HINT_REGEX =
    /\bmatch\b|list[\s—\-]*i\b|list[\s—\-]*ii\b|code\s+given\s+below/i;

const STATEMENT_HINT_REGEX =
    /\bbased on the following statements\b|\bconsider the following statements\b|\bwhich of the (?:above|following) statements\b/i;

const ASSERTION_HINT_REGEX =
    /\bassertion\b.*\breason\b|\breason\b.*\bassertion\b/i;

function cleanOCRText(text) {
    return String(text || "")
        .replace(/©/g, "(C)")
        .replace(/\(8\)/g, "(B)")
        .replace(/\[8\]/g, "[B]")
        .replace(/\(0\)/g, "(D)")
        .replace(/\[0\]/g, "[D]")
        .replace(/\bO\)/g, "D)")
        .replace(/®/g, "(B)")
        // common OCR: l. / I. at start of option mistaken — leave alone
        .replace(/\r/g, "")
        .replace(/\t/g, " ")
        .replace(/[ \u00A0]+/g, " ")
        .trim();
}

module.exports = {
    QUESTION_REGEX,
    OPTION_REGEX,
    INLINE_OPTION_SPLIT_REGEX,
    ANSWER_KEY_REGEX,
    PAGE_NUMBER_REGEX,
    HEADER_REGEX,
    MATCH_HINT_REGEX,
    STATEMENT_HINT_REGEX,
    ASSERTION_HINT_REGEX,
    cleanOCRText,
};
