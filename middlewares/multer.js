const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");

const uploadDir = path.join(
    process.cwd(),
    "uploads"
);

fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({

    destination(req, file, cb) {

        cb(null, uploadDir);

    },

    filename(req, file, cb) {

        cb(

            null,

            Date.now() +
            "-" +
            file.originalname

        );

    }

});

module.exports = multer({

    storage

});