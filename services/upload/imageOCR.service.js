const sharp = require("sharp");
const path = require("path");
const fs = require("fs-extra");
const { createWorker } = require("tesseract.js");

const { preprocessImage } = require("../../utils/imagePreprocess");

let worker = null;

/**
 * Initialize Worker
 */
async function initWorker() {

    try {

        if (!worker) {

            worker = await createWorker("eng+hin");

            console.log("✅ OCR Worker Initialized");

        }

    } catch (error) {

        console.error("Worker Init Error:", error);

        throw error;

    }

}

/**
 * Terminate Worker
 */
async function terminateWorker() {

    try {

        if (worker) {

            await worker.terminate();

            worker = null;

            console.log("✅ OCR Worker Terminated");

        }

    } catch (error) {

        console.error("Terminate Worker Error:", error);

    }

}

/**
 * OCR
 */
async function recognize(imagePath) {

    try {

        await initWorker();

        const { data } = await worker.recognize(imagePath);

        console.log(

            `${path.basename(imagePath)} Confidence : ${data.confidence}`

        );

        return data.text;

    } catch (error) {

        console.error(

            `OCR Error : ${imagePath}`,

            error.message

        );

        return "";

    }

}

/**
 * Split Image
 */
async function splitPage(imagePath) {

    try {

        const metadata = await sharp(imagePath).metadata();

        const width = metadata.width;

        const height = metadata.height;

        const halfWidth = Math.floor(width / 2);

        const dir = path.dirname(imagePath);

        const leftRaw = path.join(dir, `left-${Date.now()}.png`);

        const rightRaw = path.join(dir, `right-${Date.now()}.png`);

        await sharp(imagePath)
            .extract({
                left: 0,
                top: 0,
                width: halfWidth,
                height
            })
            .toFile(leftRaw);

        await sharp(imagePath)
            .extract({
                left: halfWidth,
                top: 0,
                width: halfWidth,
                height
            })
            .toFile(rightRaw);

        const left = path.join(dir, `left-pre-${Date.now()}.png`);

        const right = path.join(dir, `right-pre-${Date.now()}.png`);

        await preprocessImage(leftRaw, left);

        await preprocessImage(rightRaw, right);

        await fs.remove(leftRaw);

        await fs.remove(rightRaw);

        return {

            left,

            right

        };

    } catch (error) {

        console.error("Split Page Error:", error);

        throw error;

    }

}

/**
 * OCR Single Page
 */
async function processPage(imagePath) {

    let left = null;

    let right = null;

    try {

        const images = await splitPage(imagePath);

        left = images.left;

        right = images.right;

        console.log("OCR LEFT");

        const leftText = await recognize(left);

        console.log("OCR RIGHT");

        const rightText = await recognize(right);

        return leftText + "\n" + rightText;

    } catch (error) {

        console.error(

            `Page OCR Error : ${imagePath}`,

            error

        );

        return "";

    }

    finally {

        try {

            if (left && await fs.pathExists(left))
                await fs.remove(left);

            if (right && await fs.pathExists(right))
                await fs.remove(right);

        }

        catch (e) {

            console.log(e.message);

        }

    }

}

/**
 * OCR All Pages
 */
async function processPages(images) {

    let text = "";

    try {

        await initWorker();

        for (let i = 0; i < images.length; i++) {

            console.log(
                `Processing Page ${i + 1}/${images.length}`
            );

            try {

                const pageText = await processPage(images[i]);

                text += "\n" + pageText;

            }

            catch (error) {

                console.error(

                    `Failed Page ${i + 1}`,

                    error

                );

            }

        }

    }

    finally {

        await terminateWorker();

    }

    return text;

}

module.exports = {

    processPages,

    processPage

};