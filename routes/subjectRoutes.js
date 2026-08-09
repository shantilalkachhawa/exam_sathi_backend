const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subjectController");
const { verifyToken } = require("../middlewares/http");

router.post("/", verifyToken, subjectController.createSubject);
router.get("/", subjectController.getSubjects);
router.get("/:id", subjectController.getSubjectById);
router.put("/:id", verifyToken, subjectController.updateSubject);
router.delete("/:id", verifyToken, subjectController.deleteSubject);

module.exports = router;
