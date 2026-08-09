const express = require("express");
const router = express.Router();

const currentAffairController = require("../controllers/currentAffairController");
const { verifyToken } = require("../middlewares/http");

router.post("/", verifyToken, currentAffairController.createCurrentAffair);

router.get("/my", verifyToken, currentAffairController.getMyCurrentAffairs);

router.get("/", currentAffairController.getCurrentAffairs);

router.get("/:id", currentAffairController.getCurrentAffairById);

router.put("/:id", verifyToken, currentAffairController.updateCurrentAffair);

router.delete("/:id", verifyToken, currentAffairController.deleteCurrentAffair);

module.exports = router;
