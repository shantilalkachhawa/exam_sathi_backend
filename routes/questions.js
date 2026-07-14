const express = require("express");
const router = express.Router();
const controller = require("../controllers/questionsController");
// const upload = require("../utils/upload.middleware");
const multer = require("../middlewares/multer");

router.post("/", multer.single('file'), controller.createQuestion);
router.get("/", controller.getQuestions);
// router.get("/:id", controller.getQuestionById);
// router.put("/:id", controller.updateQuestion);
// router.delete("/:id", controller.deleteQuestion);

module.exports = router;
