const express = require("express");
const router = express.Router();
const controller = require("../controllers/questionsController");
const multer = require("../middlewares/multer");

// PDF/image OCR import
router.post("/", multer.single("file"), controller.createQuestion);

// Manual JSON create (admin portal)
router.post("/manual", controller.createManualQuestion);

router.get("/", controller.getQuestions);
router.get("/:id", controller.getQuestionById);
router.put("/:id", controller.updateQuestion);
router.delete("/:id", controller.deleteQuestion);

module.exports = router;
