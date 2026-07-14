// services/layoutParser.service.js

/**
 * Split multiple options appearing on the same line.
 *
 * Example:
 *
 * (A) Delhi      (B) Mumbai
 *
 * becomes
 *
 * (A) Delhi
 * (B) Mumbai
 *
 */

function splitOptions(line) {

    const regex =
        /(\(?[A-D]\)?[\.\)]?\s.*?)(?=(\(?[A-D]\)?[\.\)]?\s)|$)/gi;

    const matches = [...line.matchAll(regex)];

    if (matches.length <= 1) {

        return [line];

    }

    return matches.map(item => item[1].trim());

}

/**
 * Normalize OCR Text
 */

function normalizeOCR(text) {

    const output = [];

    const lines = text.split(/\r?\n/);

    for (let line of lines) {

        line = line.trim();

        if (!line) continue;

        //-----------------------------------------
        // Split Options
        //-----------------------------------------

        const parts = splitOptions(line);

        output.push(...parts);

    }

    return output.join("\n");

}

module.exports = {

    normalizeOCR

};