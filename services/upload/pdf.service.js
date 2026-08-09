const path = require("path");
const fs = require("fs-extra");
const pdf = require("pdf-poppler");
const { v4: uuid } = require("uuid");

async function createTempDirectory() {

    const folder = path.join(
        process.cwd(),
        "uploads",
        "temp",
        uuid()
    );

    await fs.ensureDir(folder);

    return folder;

}

async function convertPDFToImages(pdfPath, { dpi } = {}) {

    const outputDir = await createTempDirectory();

    const options = {

        format: "png",

        out_dir: outputDir,

        out_prefix: "page",

        page: null,

        dpi: Number(dpi) > 0 ? Number(dpi) : 300

    };

    await pdf.convert(pdfPath, options);

    const files = await fs.readdir(outputDir);

    const pages = files
        .filter(file => file.endsWith(".png"))
        .sort((a, b) => {

            const p1 = Number(a.match(/\d+/)?.[0] || 0);
            const p2 = Number(b.match(/\d+/)?.[0] || 0);

            return p1 - p2;

        })
        .map(file => path.join(outputDir, file));

    return {

        outputDir,

        pages

    };

}

async function deleteTempDirectory(folder) {

    if (await fs.pathExists(folder)) {

        await fs.remove(folder);

    }

}

module.exports = {

    convertPDFToImages,

    deleteTempDirectory

};