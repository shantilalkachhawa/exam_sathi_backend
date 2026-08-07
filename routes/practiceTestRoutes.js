const express = require("express");

const router = express.Router();

const practiceTestController = require("../controllers/practiceTestController");
const testAnalyticsController = require("../controllers/testAnalyticsController");

router.post("/", practiceTestController.createPracticeTest);

router.get("/", practiceTestController.getPracticeTests);

// Analytics (must be before bare /:id if you add conflicting patterns)
router.get("/:id/analytics", testAnalyticsController.getTestAnalytics);
router.get("/:id/attempts", testAnalyticsController.getTestAttempts);
router.get(
  "/:id/attempts/:attemptId/answers",
  testAnalyticsController.getAttemptAnswers
);
router.get("/:id/paid-users", testAnalyticsController.getTestPaidUsers);

router.get("/:id", practiceTestController.getPracticeTestById);

router.put("/:id", practiceTestController.updatePracticeTest);

router.delete("/:id", practiceTestController.deletePracticeTest);

module.exports = router;
