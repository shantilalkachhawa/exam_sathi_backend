const path = require("path");
const fs = require("fs-extra");
const crypto = require("crypto");
const { normalizeParsedQuestion } = require("./questionTypes");

/**
 * Registry of papers with curated 100% ground-truth JSON.
 * Match by original filename pattern (multer may prefix timestamp).
 */
const KNOWN_PAPERS = [
    {
        id: "mp_pcs_2026_gs_paper_1_set_c",
        patterns: [
            /mp[_\s-]?pcs[_\s-]?2026[_\s-]?gs[_\s-]?paper[_\s-]?1[_\s-]?set[_\s-]?c/i,
            /mp_pcs_2026_gs_paper_1_set_c/i,
        ],
        jsonPath: path.join(
            process.cwd(),
            "uploads",
            "pcs2026_questions.json"
        ),
        language: "en",
    },
];

function normalizeFilename(name = "") {
    return path.basename(String(name)).toLowerCase();
}

function findKnownPaper(originalName, paperId) {
    if (paperId) {
        const byId = KNOWN_PAPERS.find((p) => p.id === String(paperId).trim());
        if (byId) return byId;
    }

    const name = normalizeFilename(originalName);
    return (
        KNOWN_PAPERS.find((paper) =>
            paper.patterns.some((re) => re.test(name))
        ) || null
    );
}

async function fileSha256(filePath) {
    const buf = await fs.readFile(filePath);
    return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * If uploaded file matches a known curated paper, return normalized questions.
 * Returns null when no curated match (caller should fall back to OCR).
 */
async function tryLoadCuratedQuestions(file, paperId) {
    const paper = findKnownPaper(
        file?.originalname || file?.filename,
        paperId
    );

    if (!paper) {
        return null;
    }

    if (!(await fs.pathExists(paper.jsonPath))) {
        console.warn(
            `Known paper matched (${paper.id}) but JSON missing: ${paper.jsonPath}`
        );
        return null;
    }

    const raw = await fs.readJson(paper.jsonPath);
    const questions = (raw.questions || []).map((q) =>
        normalizeParsedQuestion({
            ...q,
            language: raw.meta?.language === "Hindi" ? "hi" : paper.language,
        })
    );

    return {
        source: "curated",
        paperId: paper.id,
        meta: raw.meta || {},
        questions,
        accuracy: "100%",
    };
}

module.exports = {
    KNOWN_PAPERS,
    findKnownPaper,
    tryLoadCuratedQuestions,
    fileSha256,
};
