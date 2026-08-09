const path = require("path");
const fs = require("fs-extra");
const { Op } = require("sequelize");

const { Question, QuestionOption, Subject } = require("../models");

const {
    deleteTempDirectory,
} = require("../services/upload/pdf.service");
const {
    extractQuestionPaperText,
} = require("../services/upload/extractQuestionText.service");
const {
    parseQuestions,
    classifyQuestions,
} = require("../services/upload/parser.service");
const { saveQuestions } = require("../services/upload/db.service");
const { normalizeOCR } = require("../services/upload/layoutParser.service");
const {
    tryLoadCuratedQuestions,
} = require("../services/upload/knownPaper.service");
const {
    loadAndApplyAnswerKey,
} = require("../services/upload/answerKey.service");

/**
 * Shared parse pipeline (no DB write).
 */
async function parseUploadPipeline(req) {
    let tempFolder = null;
    let answerTempFolder = null;
    let questions = [];
    let answerMeta = { applied: false, matched: 0, totalAnswers: 0 };
    let extractMeta = {
        source: "ocr",
        accuracy: "best-effort",
    };

    const questionFile = req.files?.file?.[0] || req.file;
    const answerFile = req.files?.answer_file?.[0] || null;

    try {
        if (!questionFile) {
            const err = new Error(
                "Please upload PDF/Image. Body → form-data → key 'file' (type File)."
            );
            err.status = 400;
            throw err;
        }

        const file = questionFile;
        const defaultType = Number(req.body.type) || 1;
        const language = req.body.language || "en";

        const curated = await tryLoadCuratedQuestions(file, req.body.paper_id);

        if (curated) {
            questions = curated.questions;
            extractMeta = {
                source: curated.source,
                paperId: curated.paperId,
                accuracy: curated.accuracy,
                meta: curated.meta,
            };
            console.log(
                `✅ Curated paper matched: ${curated.paperId} (${questions.length} questions)`
            );
        } else {
            const extracted = await extractQuestionPaperText(file, { language });
            tempFolder = extracted.tempFolder;
            let extractedText = extracted.text;
            extractMeta = {
                source: extracted.source,
                accuracy:
                    extracted.source === "pdf-parse" ? "high" : "best-effort",
            };
            console.log(`✅ Text extracted via ${extracted.source}`);

            extractedText = normalizeOCR(extractedText);
            questions = parseQuestions(extractedText, { defaultType });
            console.log(`Questions Found : ${questions.length}`);

            if (!questions.length) {
                const err = new Error("No questions found.");
                err.status = 400;
                throw err;
            }
        }

        const applied = await loadAndApplyAnswerKey(questions, answerFile, {
            language,
        });
        questions = applied.questions;
        answerMeta = applied.answerMeta;
        answerTempFolder = applied.tempFolder;

        const classified = classifyQuestions(questions);

        return {
            questionFile,
            answerFile,
            tempFolder,
            answerTempFolder,
            questions,
            answerMeta,
            extractMeta,
            classified,
            language,
            defaultType,
        };
    } catch (error) {
        try {
            if (questionFile && (await fs.pathExists(questionFile.path))) {
                await fs.remove(questionFile.path);
            }
            if (answerFile?.path && (await fs.pathExists(answerFile.path))) {
                await fs.remove(answerFile.path);
            }
            if (tempFolder) await deleteTempDirectory(tempFolder);
            if (answerTempFolder) await deleteTempDirectory(answerTempFolder);
        } catch (cleanupError) {
            console.error("Cleanup Failed:", cleanupError);
        }
        throw error;
    }
}

async function cleanupUploadArtifacts({
    questionFile,
    answerFile,
    tempFolder,
    answerTempFolder,
}) {
    try {
        if (questionFile?.path && (await fs.pathExists(questionFile.path))) {
            await fs.remove(questionFile.path);
        }
        if (answerFile?.path && (await fs.pathExists(answerFile.path))) {
            await fs.remove(answerFile.path);
        }
        if (tempFolder) await deleteTempDirectory(tempFolder);
        if (answerTempFolder) await deleteTempDirectory(answerTempFolder);
    } catch (error) {
        console.error("Cleanup Error:", error);
    }
}

/** Preview only — scan PDF, return counts + questions, do NOT insert */
const previewQuestionsFromPdf = async (req, res) => {
    try {
        if (!req.body.subject_id) {
            return res.status(400).json({
                success: false,
                message: "subject_id is required.",
            });
        }

        const parsed = await parseUploadPipeline(req);
        await cleanupUploadArtifacts(parsed);

        const { classified, answerMeta, extractMeta } = parsed;

        return res.status(200).json({
            success: true,
            message: "PDF scanned. Review questions before insert.",
            extract: extractMeta,
            answerKey: answerMeta,
            summary: {
                totalQuestions: classified.totalQuestions,
                valid: classified.validCount,
                invalid: classified.invalidCount,
                withAnswer: classified.withAnswer,
                withoutAnswer: classified.withoutAnswer,
                answersMatched: answerMeta.matched || 0,
                ready: classified.validCount > 0,
            },
            questions: classified.valid,
            failedQuestions: classified.invalid,
        });
    } catch (error) {
        console.error("Preview Error:", error);
        return res.status(error.status || 500).json({
            success: false,
            message: error.message,
        });
    }
};

/** Insert previously previewed questions (JSON body, no re-OCR) */
const importParsedQuestions = async (req, res) => {
    try {
        const {
            questions,
            subject_id,
            category_id = null,
            sub_category_id = null,
            language = "en",
            type = 1,
            level = 1,
        } = req.body || {};

        if (!subject_id) {
            return res.status(400).json({
                success: false,
                message: "subject_id is required.",
            });
        }

        if (!Array.isArray(questions) || !questions.length) {
            return res.status(400).json({
                success: false,
                message: "questions array is required.",
            });
        }

        const classified = classifyQuestions(questions);
        if (!classified.validCount) {
            return res.status(400).json({
                success: false,
                message: "No valid questions to insert.",
                summary: {
                    totalQuestions: classified.totalQuestions,
                    valid: 0,
                    invalid: classified.invalidCount,
                    ready: false,
                },
                failedQuestions: classified.invalid,
            });
        }

        const result = await saveQuestions({
            questions: classified.valid,
            category_id,
            sub_category_id,
            subject_id,
            created_by: req.user?.id || 1,
            type: Number(type) || 1,
            level: Number(level) || 1,
            language,
        });

        return res.status(201).json({
            success: true,
            message: "Questions inserted successfully.",
            summary: {
                totalQuestions: result.totalQuestions,
                inserted: result.inserted,
                invalid: result.invalid,
                failed: result.invalid,
                valid: result.inserted,
                ready: true,
            },
            data: result.data,
            failedQuestions: result.failedQuestions || [],
        });
    } catch (error) {
        console.error("Import Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/** Legacy one-shot: parse + insert (kept for compatibility) */
const createQuestion = async (req, res) => {
    try {
        if (!req.body.subject_id) {
            return res.status(400).json({
                success: false,
                message: "subject_id is required.",
            });
        }

        const parsed = await parseUploadPipeline(req);
        const {
            questions,
            answerMeta,
            extractMeta,
            language,
            defaultType,
        } = parsed;

        const level = Number(req.body.level) || 1;

        let result;
        try {
            result = await saveQuestions({
                questions,
                category_id: req.body.category_id || null,
                sub_category_id: req.body.sub_category_id || null,
                subject_id: req.body.subject_id || null,
                created_by: req.user?.id || 1,
                type: defaultType,
                level,
                language,
            });
            console.log("✅ Database Saved", {
                inserted: result.inserted,
                invalid: result.invalid,
                answersMatched: answerMeta.matched,
            });
        } catch (error) {
            await cleanupUploadArtifacts(parsed);
            throw new Error("Database insert failed: " + error.message);
        }

        await cleanupUploadArtifacts(parsed);

        return res.status(201).json({
            success: true,
            message:
                extractMeta.source === "curated"
                    ? "Questions imported from curated paper (100% accuracy)."
                    : extractMeta.source === "pdf-parse"
                      ? "Questions imported from PDF text."
                      : "Questions imported via OCR (best-effort).",
            extract: extractMeta,
            answerKey: answerMeta,
            summary: {
                totalQuestions: result.totalQuestions,
                inserted: result.inserted,
                invalid: result.invalid,
                failed: result.invalid,
                answersMatched: answerMeta.matched || 0,
            },
            data: result.data,
            failedQuestions: result.failedQuestions || [],
        });
    } catch (error) {
        console.error("Controller Error:", error);
        return res.status(error.status || 500).json({
            success: false,
            message: error.message,
        });
    }
};

const getQuestions = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            category_id,
            sub_category_id,
            subject_id,
            status,
            level,
            type,
        } = req.query;

        const pageNumber = Number(page);
        const pageSize = Number(limit);
        const offset = (pageNumber - 1) * pageSize;

        const where = {};

        if (search) {
            where.title = {
                [Op.like]: `%${search}%`,
            };
        }

        if (category_id) where.category_id = category_id;
        if (sub_category_id) where.sub_category_id = sub_category_id;
        if (subject_id) where.subject_id = subject_id;
        if (status) where.status = status;
        if (level) where.level = level;
        if (type) where.type = type;

        // Count questions alone — including hasMany "options" in findAndCountAll
        // inflates count (question × options) and breaks later pages (empty data).
        const totalQuestions = await Question.count({ where });

        const rows = await Question.findAll({
            where,
            include: [
                {
                    model: QuestionOption,
                    as: "options",
                    attributes: ["id", "option_text", "is_correct"],
                },
                {
                    model: Subject,
                    as: "subject",
                    attributes: ["id", "name", "code"],
                },
            ],
            order: [["id", "ASC"]],
            offset,
            limit: pageSize,
        });

        const data = rows.map((question, index) => ({
            questionNo: offset + index + 1,
            id: question.id,
            title: question.title,
            category_id: question.category_id,
            sub_category_id: question.sub_category_id,
            subject_id: question.subject_id,
            subject_name: question.subject?.name || null,
            language: question.language,
            type: question.type,
            level: question.level,
            status: question.status,
            options: (question.options || []).map((option) => ({
                id: option.id,
                text: option.option_text,
                is_correct: option.is_correct,
            })),
        }));

        return res.status(200).json({
            success: true,
            totalQuestions,
            currentPage: pageNumber,
            totalPages: Math.max(1, Math.ceil(totalQuestions / pageSize)),
            data,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Manual JSON create for admin portal.
 * Body: title, subject_id, options[{text,is_correct}], optional type, level, language, status
 */
const createManualQuestion = async (req, res) => {
    try {
        const {
            title,
            category_id = null,
            sub_category_id = null,
            subject_id = null,
            options = [],
            type = 1,
            level = 1,
            language = "en",
            status = "active",
            created_by = 1,
        } = req.body;

        if (!title || !subject_id) {
            return res.status(400).json({
                success: false,
                message: "title and subject_id are required.",
            });
        }

        if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
            return res.status(400).json({
                success: false,
                message: "options must be an array of 2–6 items.",
            });
        }

        const hasCorrect = options.some((o) => o.is_correct);
        if (!hasCorrect) {
            return res.status(400).json({
                success: false,
                message: "At least one option must be marked is_correct.",
            });
        }

        const question = await Question.create({
            title,
            category_id: category_id || null,
            sub_category_id: sub_category_id || null,
            subject_id: Number(subject_id),
            type: Number(type) || 1,
            level: Number(level) || 1,
            language,
            status,
            created_by,
        });

        await QuestionOption.bulkCreate(
            options.map((option) => ({
                question_id: question.id,
                option_text: option.text ?? option.option_text ?? "",
                is_correct: Boolean(option.is_correct),
            }))
        );

        const created = await Question.findByPk(question.id, {
            include: [
                {
                    model: QuestionOption,
                    as: "options",
                    attributes: ["id", "option_text", "is_correct"],
                },
                {
                    model: Subject,
                    as: "subject",
                    attributes: ["id", "name", "code"],
                },
            ],
        });

        return res.status(201).json({
            success: true,
            message: "Question created successfully.",
            data: {
                id: created.id,
                title: created.title,
                category_id: created.category_id,
                sub_category_id: created.sub_category_id,
                subject_id: created.subject_id,
                subject_name: created.subject?.name || null,
                language: created.language,
                type: created.type,
                level: created.level,
                status: created.status,
                options: created.options.map((option) => ({
                    id: option.id,
                    text: option.option_text,
                    is_correct: option.is_correct,
                })),
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const getQuestionById = async (req, res) => {
    try {
        const question = await Question.findByPk(req.params.id, {
            include: [
                {
                    model: QuestionOption,
                    as: "options",
                    attributes: ["id", "option_text", "is_correct"],
                },
            ],
        });

        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question not found.",
            });
        }

        return res.json({
            success: true,
            data: {
                id: question.id,
                title: question.title,
                category_id: question.category_id,
                sub_category_id: question.sub_category_id,
                language: question.language,
                type: question.type,
                level: question.level,
                status: question.status,
                options: question.options.map((option) => ({
                    id: option.id,
                    text: option.option_text,
                    is_correct: option.is_correct,
                })),
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const updateQuestion = async (req, res) => {
    try {
        const question = await Question.findByPk(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question not found.",
            });
        }

        const {
            title,
            category_id,
            sub_category_id,
            subject_id,
            type,
            level,
            language,
            status,
            options,
        } = req.body;

        await question.update({
            ...(title !== undefined ? { title } : {}),
            ...(category_id !== undefined ? { category_id: category_id || null } : {}),
            ...(sub_category_id !== undefined ? { sub_category_id: sub_category_id || null } : {}),
            ...(subject_id !== undefined ? { subject_id: Number(subject_id) } : {}),
            ...(type !== undefined ? { type: Number(type) } : {}),
            ...(level !== undefined ? { level: Number(level) } : {}),
            ...(language !== undefined ? { language } : {}),
            ...(status !== undefined ? { status } : {}),
        });

        if (Array.isArray(options)) {
            if (options.length < 2 || options.length > 6) {
                return res.status(400).json({
                    success: false,
                    message: "options must be an array of 2–6 items.",
                });
            }

            await QuestionOption.destroy({ where: { question_id: question.id } });
            await QuestionOption.bulkCreate(
                options.map((option) => ({
                    question_id: question.id,
                    option_text: option.text ?? option.option_text ?? "",
                    is_correct: Boolean(option.is_correct),
                }))
            );
        }

        const updated = await Question.findByPk(question.id, {
            include: [
                {
                    model: QuestionOption,
                    as: "options",
                    attributes: ["id", "option_text", "is_correct"],
                },
                {
                    model: Subject,
                    as: "subject",
                    attributes: ["id", "name", "code"],
                },
            ],
        });

        return res.json({
            success: true,
            message: "Question updated successfully.",
            data: {
                id: updated.id,
                title: updated.title,
                category_id: updated.category_id,
                sub_category_id: updated.sub_category_id,
                subject_id: updated.subject_id,
                subject_name: updated.subject?.name || null,
                language: updated.language,
                type: updated.type,
                level: updated.level,
                status: updated.status,
                options: updated.options.map((option) => ({
                    id: option.id,
                    text: option.option_text,
                    is_correct: option.is_correct,
                })),
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findByPk(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question not found.",
            });
        }

        await QuestionOption.destroy({ where: { question_id: question.id } });
        await question.destroy();

        return res.json({
            success: true,
            message: "Question deleted successfully.",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    createQuestion,
    previewQuestionsFromPdf,
    importParsedQuestions,
    createManualQuestion,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion,
};
