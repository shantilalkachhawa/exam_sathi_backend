const express = require("express");

const router = express.Router();

const practiceTestController = require("../controllers/practiceTestController");

router.post("/", practiceTestController.createPracticeTest);

router.get("/", practiceTestController.getPracticeTests);

router.get("/:id", practiceTestController.getPracticeTestById);

router.put("/:id", practiceTestController.updatePracticeTest);

router.delete("/:id", practiceTestController.deletePracticeTest);

module.exports = router;