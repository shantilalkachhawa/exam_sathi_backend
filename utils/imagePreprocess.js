// utils/imagePreprocess.js

const sharp = require("sharp");

async function preprocessImage(input, output) {

    await sharp(input)

        .grayscale()

        .normalize()

        .sharpen()

        .threshold(170)

        .resize({
            width:2500,
            withoutEnlargement:true
        })

        .png()

        .toFile(output);

    return output;

}

module.exports = {
    preprocessImage
};