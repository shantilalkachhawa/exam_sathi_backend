const fs = require("fs");
const PDFParse = require("pdf-parse");

const extractPDFText = async (filePath) => {

    const buffer = fs.readFileSync(filePath);

    const parser = new PDFParse.PDFParse({
        data: buffer,
    });

    const result = await parser.getText();

    return result.text;
};

module.exports = {
    extractPDFText,
};