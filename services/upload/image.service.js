const sharp = require("sharp");
const path = require("path");

const { extractOCRText } = require("./ocr.service");

const processImage = async (imagePath) => {

    const metadata = await sharp(imagePath).metadata();

    const width = metadata.width;
    const height = metadata.height;

    const halfWidth = Math.floor(width / 2);

    const leftImage = path.join(
        "uploads",
        `left-${Date.now()}.png`
    );

    const rightImage = path.join(
        "uploads",
        `right-${Date.now()}.png`
    );

    await sharp(imagePath)
        .extract({
            left: 0,
            top: 0,
            width: halfWidth,
            height,
        })
        .grayscale()
        .normalize()
        .sharpen()
        .resize({ width: 2000 })
        .toFile(leftImage);

    await sharp(imagePath)
        .extract({
            left: halfWidth,
            top: 0,
            width: halfWidth,
            height,
        })
        .grayscale()
        .normalize()
        .sharpen()
        .resize({ width: 2000 })
        .toFile(rightImage);

    const leftText = await extractOCRText(leftImage);

    const rightText = await extractOCRText(rightImage);

    return leftText + "\n" + rightText;
};

module.exports = {
    processImage,
};