const express = require("express");
const router = express.Router();

const testAttemptController = require("../controllers/testAttemptController");
const { verifyToken } = require("../middlewares/http");

// Student starts a test
router.post("/start", verifyToken, testAttemptController.startTest);

// History (before /:id routes)
router.get(
  "/my-attempts",
  verifyToken,
  testAttemptController.getMyAttempts
);

// Get all questions of an attempt
router.get(
  "/:id/questions",
  verifyToken,
  testAttemptController.getAttemptQuestions
);

// Save/Update one answer (Auto Save)
router.post(
  "/:id/save-answer",
  verifyToken,
  testAttemptController.saveAnswer
);

// Submit Test
router.post("/:id/submit", verifyToken, testAttemptController.submitTest);

// Result
router.get("/:id/result", verifyToken, testAttemptController.getResult);

module.exports = router;
