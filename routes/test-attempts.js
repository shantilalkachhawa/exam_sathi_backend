const express = require("express");
const router = express.Router();

const testAttemptController = require("../controllers/testAttemptController");
// const authMiddleware = require("../middleware/auth"); // JWT middleware

// Student starts a test
router.post("/start", testAttemptController.startTest);

// Get all questions of an attempt
router.get("/:id/questions",testAttemptController.getAttemptQuestions);

// Save/Update one answer (Auto Save)
router.post("/:id/save-answer",testAttemptController.saveAnswer);

// Submit Test
router.post("/:id/submit",testAttemptController.submitTest);

// Result
router.get( "/:id/result",
testAttemptController.getResult
);

// Logged-in user's attempts
// router.get(
//   "/my-attempts",
//   testAttemptController.getMyAttempts
// );

module.exports = router;