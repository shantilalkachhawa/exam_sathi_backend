const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs-extra");
const router = express.Router();

const previousYearPaperController = require("../controllers/previousYearPaperController");
const { verifyToken } = require("../middlewares/http");

const uploadDir = path.join(process.cwd(), "uploads");
fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const safe = String(file.originalname || "paper.pdf").replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
    cb(null, `${Date.now()}-${safe}`);
  },
});

const uploadPdf = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const isPdf =
      file.mimetype === "application/pdf" ||
      /\.pdf$/i.test(file.originalname || "");
    if (!isPdf) {
      return cb(new Error("Only PDF files are allowed"));
    }
    return cb(null, true);
  },
});

router.post(
  "/",
  verifyToken,
  uploadPdf.single("file"),
  previousYearPaperController.createPreviousYearPaper
);

router.get("/", previousYearPaperController.getPreviousYearPapers);

router.get("/:id", previousYearPaperController.getPreviousYearPaperById);

router.put(
  "/:id",
  verifyToken,
  uploadPdf.single("file"),
  previousYearPaperController.updatePreviousYearPaper
);

router.delete(
  "/:id",
  verifyToken,
  previousYearPaperController.deletePreviousYearPaper
);

module.exports = router;
