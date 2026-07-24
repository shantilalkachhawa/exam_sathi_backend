/**
 * Numeric question types stored in questions.type (SMALLINT)
 */
const QUESTION_TYPES = {
    mcq: 1,
    match: 2,
    statement: 3,
    assertion: 4,
    passage: 5,
    figure: 6,
    table: 7,
};

const TYPE_LABELS = Object.fromEntries(
    Object.entries(QUESTION_TYPES).map(([k, v]) => [v, k])
);

function resolveQuestionType(value, fallback = 1) {
    if (value == null || value === "") return fallback;
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    const key = String(value).toLowerCase().trim();
    return QUESTION_TYPES[key] ?? fallback;
}

/**
 * Embed match lists into title so existing DB schema can store them.
 */
function formatQuestionTitle(item) {
    let title = (item.title || "").trim();

    if (item.listI && item.listI.items) {
        const label = item.listI.label ? ` (${item.listI.label})` : "";
        const lines = Object.entries(item.listI.items)
            .map(([k, v]) => `(${k}) ${v}`)
            .join("\n");
        title += `\n\nList—I${label}:\n${lines}`;
    }

    if (item.listII && item.listII.items) {
        const label = item.listII.label ? ` (${item.listII.label})` : "";
        const lines = Object.entries(item.listII.items)
            .map(([k, v]) => `(${k}) ${v}`)
            .join("\n");
        title += `\n\nList—II${label}:\n${lines}`;
    }

    return title.trim();
}

/**
 * Normalize curated / parsed question into API + DB shape
 */
function normalizeParsedQuestion(item, defaultType = 1) {
    const semanticType = item.type || "mcq";
    const type = resolveQuestionType(semanticType, defaultType);

    return {
        questionNo: item.questionNo,
        type,
        typeLabel: TYPE_LABELS[type] || semanticType,
        title: formatQuestionTitle(item),
        language: item.language || "en",
        options: (item.options || []).map((opt) => ({
            key: String(opt.key || "").toUpperCase(),
            text: String(opt.text || "").trim(),
            is_correct: Boolean(opt.is_correct),
        })),
        listI: item.listI || null,
        listII: item.listII || null,
    };
}

module.exports = {
    QUESTION_TYPES,
    TYPE_LABELS,
    resolveQuestionType,
    formatQuestionTitle,
    normalizeParsedQuestion,
};
