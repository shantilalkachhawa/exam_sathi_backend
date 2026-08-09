const express = require("express");
const router = express.Router();
const controller = require("../controllers/questionsController");
const multer = require("../middlewares/multer");

const uploadFields = multer.fields([
  { name: "file", maxCount: 1 },
  { name: "answer_file", maxCount: 1 },
]);

// Scan PDF → preview (no DB insert)
router.post("/parse-preview", uploadFields, controller.previewQuestionsFromPdf);

// Insert questions from preview JSON
router.post("/import-parsed", controller.importParsedQuestions);

// PDF/image OCR import (+ optional answer key PDF) — one-shot
router.post("/", uploadFields, controller.createQuestion);

// Manual JSON create (admin portal)
router.post("/manual", controller.createManualQuestion);

router.get("/", controller.getQuestions);
router.get("/:id", controller.getQuestionById);
router.put("/:id", controller.updateQuestion);
router.delete("/:id", controller.deleteQuestion);

module.exports = router;
