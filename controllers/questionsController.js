const path = require("path");
const fs = require("fs-extra");
const { Op } = require("sequelize");

const { Question, QuestionOption } = require("../models");

const {
    convertPDFToImages,
    deleteTempDirectory,
} = require("../services/upload/pdf.service");
const {
    processPages,
    processPage,
} = require("../services/upload/imageOCR.service");
const { parseQuestions } = require("../services/upload/parser.service");
const { saveQuestions } = require("../services/upload/db.service");
const { normalizeOCR } = require("../services/upload/layoutParser.service");
const {
    tryLoadCuratedQuestions,
} = require("../services/upload/knownPaper.service");

const createQuestion = async (req                                                                                                                                                                                                                                                                                                        , res) => {
    let tempFolder = null;
    let extractedText = "";
    let questions = [];
    let result = null;
    let extractMeta = {
        source: "ocr",
        accuracy: "best-effort",
    };

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message:
                    "Please upload PDF/Image. In Postman: Body → form-data → key 'file' (type File) → Select Files again. A yellow warning means the file path is broken.",
            });
        }

        if (!req.body.category_id) {
            return res.status(400).json({
                success: false,
                message: "category_id is required.",
            });
        }

        const file = req.file;
        const extension = path.extname(file.originalname).toLowerCase();
        const defaultType = Number(req.body.type) || 1;
        const level = Number(req.body.level) || 1;
        const language = req.body.language || "en";

        //----------------------------------------
        // Step 0 : Known curated paper (100%)
        //----------------------------------------

        const curated = await tryLoadCuratedQuestions(
            file,
            req.body.paper_id
        );

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
            //----------------------------------------
            // Step 1 : PDF / Image OCR
            //----------------------------------------

            try {
                if (extension === ".pdf") {
                    console.log("Converting PDF...");
                    const pdf = await convertPDFToImages(file.path);
                    tempFolder = pdf.outputDir;
                    extractedText = await processPages(pdf.pages);
                } else if (
                    extension === ".jpg" ||
                    extension === ".jpeg" ||
                    extension === ".png"
                ) {
                    extractedText = await processPage(file.path);
                } else {
                    return res.status(400).json({
                        success: false,
                        message: "Only PDF/JPG/JPEG/PNG supported.",
                    });
                }
                console.log("✅ OCR Completed");
            } catch (error) {
                console.error(error);
                throw new Error("OCR failed: " + error.message);
            }

            //----------------------------------------
            // Step 2 : Normalize OCR
            //----------------------------------------

            try {
                extractedText = normalizeOCR(extractedText);
                console.log("✅ OCR Normalized");
            } catch (error) {
                console.error("Normalize Error:", error);
                throw new Error("Failed while formatting OCR text.");
            }

            //----------------------------------------
            // Step 3 : Parse Questions
            //----------------------------------------

            try {
                questions = parseQuestions(extractedText, { defaultType });
                console.log(`Questions Found : ${questions.length}`);

                if (!questions.length) {
                    throw new Error("No questions found.");
                }
            } catch (error) {
                console.error("Parser Error:", error);
                throw new Error(
                    error.message === "No questions found."
                        ? error.message
                        : "Question parsing failed."
                );
            }
        }

        //----------------------------------------
        // Step 4 : Save Database
        //----------------------------------------

        try {
            result = await saveQuestions({
                questions,
                category_id: req.body.category_id,
                sub_category_id: req.body.sub_category_id || null,
                created_by: req.user?.id || 1,
                type: defaultType,
                level,
                language,
            });
            console.log("✅ Database Saved", {
                inserted: result.inserted,
                invalid: result.invalid,
            });
        } catch (error) {
            console.error("Database Error:", error);
            throw new Error("Database insert failed: " + error.message);
        }

        //----------------------------------------
        // Cleanup
        //----------------------------------------

        try {
            if (await fs.pathExists(file.path)) {
                await fs.remove(file.path);
            }
            if (tempFolder) {
                await deleteTempDirectory(tempFolder);
            }
        } catch (error) {
            console.error("Cleanup Error:", error);
        }

        return res.status(201).json({
            success: true,
            message:
                extractMeta.source === "curated"
                    ? "Questions imported from curated paper (100% accuracy)."
                    : "Questions imported via OCR (best-effort).",
            extract: extractMeta,
            summary: {
                totalQuestions: result.totalQuestions,
                inserted: result.inserted,
                invalid: result.invalid,
                failed: result.invalid,
            },
            data: result.data,
            failedQuestions: result.failedQuestions || [],
        });
    } catch (error) {
        console.error("Controller Error:", error);

        try {
            if (req.file && (await fs.pathExists(req.file.path))) {
                await fs.remove(req.file.path);
            }
            if (tempFolder) {
                await deleteTempDirectory(tempFolder);
            }
        } catch (cleanupError) {
            console.error("Cleanup Failed:", cleanupError);
        }

        return res.status(500).json({
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
        if (status) where.status = status;
        if (level) where.level = level;
        if (type) where.type = type;

        const { count, rows } = await Question.findAndCountAll({
            where,
            include: [
                {
                    model: QuestionOption,
                    as: "options",
                    attributes: ["id", "option_text", "is_correct"],
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
            language: question.language,
            type: question.type,
            level: question.level,
            status: question.status,
            options: question.options.map((option) => ({
                id: option.id,
                text: option.option_text,
                is_correct: option.is_correct,
            })),
        }));

        return res.status(200).json({
            success: true,
            totalQuestions: count,
            currentPage: pageNumber,
            totalPages: Math.ceil(count / pageSize),
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

module.exports = {
    createQuestion,
    getQuestions,
};
