// services/layoutParser.service.js

/**
 * Split multiple options appearing on the same line.
 *
 * Supports:
 *   (A) Delhi      (B) Mumbai
 *   [A] LISP  [B] OOP  [C] PROLOG  [D] VBI
 *   A. One   B. Two
 */

function splitOptions(line) {
    const markers = [
        ...line.matchAll(/(\[[A-D]\]|\([A-D]\)|(?<![A-Za-z0-9])[A-D][\.\)])\s*/gi),
    ];

    if (markers.length <= 1) {
        return [line];
    }

    const parts = [];

    for (let i = 0; i < markers.length; i++) {
        const start = markers[i].index;
        const end =
            i + 1 < markers.length ? markers[i + 1].index : line.length;
        const chunk = line.slice(start, end).trim();
        if (chunk) parts.push(chunk);
    }

    // Keep leading stem text before first option as its own line
    const firstIdx = markers[0].index;
    if (firstIdx > 0) {
        const stem = line.slice(0, firstIdx).trim();
        if (stem) parts.unshift(stem);
    }

    return parts.length ? parts : [line];
}

/**
 * Normalize OCR Text
 */
function normalizeOCR(text) {
    const output = [];
    const lines = String(text || "").split(/\r?\n/);

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const parts = splitOptions(line);
        output.push(...parts);
    }

    return output.join("\n");
}

module.exports = {
    normalizeOCR,
    splitOptions,
};
