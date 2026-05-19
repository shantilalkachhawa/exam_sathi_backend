const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const PDFParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

const createQuestion = async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    const file = req.file;

    const ext = path.extname(file.originalname).toLowerCase();

    let extractedText = '';

    // =========================================================
    // OCR FUNCTION
    // =========================================================

    const extractOCRText = async (imagePath) => {

      const result = await Tesseract.recognize(
        imagePath,
        'eng+hin',
        {
          logger: m => {

            if (m.status === 'recognizing text') {

              console.log(
                `OCR Progress: ${Math.round(m.progress * 100)}%`
              );

            }

          }
        }
      );

      return result.data.text;

    };

    // =========================================================
    // SPLIT IMAGE INTO LEFT + RIGHT COLUMN
    // =========================================================

    const processTwoColumnOCR = async (imagePath) => {

      // Image metadata
      const metadata = await sharp(imagePath).metadata();

      const width = metadata.width;
      const height = metadata.height;

      const halfWidth = Math.floor(width / 2);

      // LEFT IMAGE
      const leftImage = `uploads/left-${Date.now()}.png`;

      await sharp(imagePath)
        .extract({
          left: 0,
          top: 0,
          width: halfWidth,
          height: height
        })
        .grayscale()
        .normalize()
        .sharpen()
        .resize({ width: 2000 })
        .toFile(leftImage);

      // RIGHT IMAGE
      const rightImage = `uploads/right-${Date.now()}.png`;

      await sharp(imagePath)
        .extract({
          left: halfWidth,
          top: 0,
          width: halfWidth,
          height: height
        })
        .grayscale()
        .normalize()
        .sharpen()
        .resize({ width: 2000 })
        .toFile(rightImage);

      // OCR LEFT
      const leftText = await extractOCRText(leftImage);

      // OCR RIGHT
      const rightText = await extractOCRText(rightImage);

      // COMBINE
      return leftText + '\n' + rightText;

    };

    // =========================================================
    // PDF
    // =========================================================

    if (ext === '.pdf') {

      const dataBuffer = fs.readFileSync(file.path);

      const parser = new PDFParse.PDFParse({
        data: dataBuffer
      });

      const result = await parser.getText();

      extractedText = result.text;

    }

    // =========================================================
    // IMAGE OCR
    // =========================================================

    else if (
      ext === '.jpg' ||
      ext === '.jpeg' ||
      ext === '.png'
    ) {

      extractedText = await processTwoColumnOCR(
        file.path
      );

    }

    // =========================================================
    // INVALID FILE
    // =========================================================

    else {

      return res.status(400).json({
        success: false,
        message: 'Only PDF, JPG, JPEG, PNG allowed'
      });

    }

    console.log('RAW OCR TEXT => \n', extractedText);

    // =========================================================
    // QUESTION PARSER
    // =========================================================

    const lines = extractedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line);

    const questions = [];

    let currentQuestion = null;

    lines.forEach(line => {

      // =====================================================
      // QUESTION
      // =====================================================

      if (/^\d+\./.test(line)) {

        if (currentQuestion) {
          questions.push(currentQuestion);
        }

        currentQuestion = {
          question: line,
          options: [],
          answer: null,
          file: file.filename
        };

      }

      // =====================================================
      // OPTIONS
      // =====================================================

      else if (
        /^\([A-D0-9]\)/i.test(line) ||
        /^\[[A-D0-9]\]/i.test(line)
      ) {

        // OCR corrections
        line = line
          .replace('(8)', '(B)')
          .replace('(0)', '(D)')
          .replace('[8]', '[B]')
          .replace('[0]', '[D]')
          .replace('©)', '(C)')
          .replace('©', '(C)');

        currentQuestion?.options.push(line);

      }

      // =====================================================
      // MULTILINE QUESTION
      // =====================================================

      else if (
        currentQuestion &&
        currentQuestion.options.length === 0
      ) {

        currentQuestion.question += ' ' + line;

      }

    });

    // LAST QUESTION
    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    console.log(
      JSON.stringify(questions, null, 2)
    );

    return res.status(200).json({
      success: true,
      totalQuestions: questions.length,
      data: questions,
      rawText: extractedText
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      error: error.message
    });

  }

};

module.exports = {
  createQuestion
};