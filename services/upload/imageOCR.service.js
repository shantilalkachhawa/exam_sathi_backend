const Tesseract = require("tesseract.js");

const extractOCRText = async (imagePath) => {

    const result = await Tesseract.recognize(
        imagePath,
        "eng+hin",
        {
            logger: (m) => {
                if (m.status === "recognizing text") {
                    console.log(
                        `OCR Progress : ${Math.round(
                            m.progress * 100
                        )}%`
                    );
                }
            },
        }
    );

    return result.data.text;
};

module.exports = {
    extractOCRText,
};