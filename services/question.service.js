const path = require("path");

const pdfService = require("./upload/pdf.service");
const imageService = require("./upload/imageOCR.service");
const parserService = require("./upload/parser.service");
const saveService = require("./upload/questionSave.service");

exports.createQuestion = async (req) => {

    if (!req.file) {
        throw new Error("File is required");
    }

    const file = req.file;

    const ext = path.extname(file.originalname).toLowerCase();

    let extractedText = "";

    if (ext === ".pdf") {

        extractedText = await pdfService.extract(file.path);

    }

    else if (
        ext === ".jpg" ||
        ext === ".jpeg" ||
        ext === ".png"
    ) {

        extractedText = await imageService.extractOCRText(file.path);

    }

    else {

        throw new Error("Only PDF, JPG, JPEG, PNG allowed");

    }

    const questions = parserService.parseQuestions(
        extractedText,
        file.filename
    );

    // Save in database
    // await saveService.save(questions, req.body);

    return {

        totalQuestions: questions.length,

        rawText: extractedText,

        data: questions

    };

};