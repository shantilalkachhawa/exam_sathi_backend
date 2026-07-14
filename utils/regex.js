// utils/regex.js

const QUESTION_REGEX =
/^(\d{1,3})[\.\)]\s*(.*)$/;

const OPTION_REGEX =
/^(?:\(?([A-D])\)?|([A-D])[\.\)]|\(([1-4])\)|([1-4])[\.\)])\s*(.*)$/i;

const ANSWER_KEY_REGEX =
/^(\d+)\s+([A-D])$/i;

const PAGE_NUMBER_REGEX =
/^Page\s+\d+/i;

const HEADER_REGEX =
/^(MPPSC|SET|GENERAL STUDIES|Question Booklet|Roll No|Series)/i;

function cleanOCRText(text) {

    return text

        .replace(/©/g, "(C)")
        .replace(/\(8\)/g, "(B)")
        .replace(/\[8\]/g, "(B)")
        .replace(/\(0\)/g, "(D)")
        .replace(/\[0\]/g, "(D)")
        .replace(/O\)/g, "(D)")
        .replace(/®/g, "(B)")
        .replace(/\r/g, "")
        .replace(/\t/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}

module.exports = {

    QUESTION_REGEX,
    OPTION_REGEX,
    ANSWER_KEY_REGEX,
    PAGE_NUMBER_REGEX,
    HEADER_REGEX,
    cleanOCRText

};