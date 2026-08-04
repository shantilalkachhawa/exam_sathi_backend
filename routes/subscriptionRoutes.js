const express = require("express");

const router = express.Router();

const { verifyToken } = require("../middlewares/http");
const subscriptionController = require("../controllers/subscriptionController");

// Create
router.post("/", subscriptionController.createSubscription);

// Admin assign plan to user (must be before /:id)
router.post("/assign", subscriptionController.assignSubscriptionToUser);

// Mobile catalog + unlocked access (before /:id)
router.get("/catalog", subscriptionController.getSubscriptionCatalog);
router.get(
    "/my-access",
    verifyToken,
    subscriptionController.getMyUnlockedAccess
);

// List
router.get("/", subscriptionController.getSubscriptions);

// Single
router.get("/:id", subscriptionController.getSubscription);

// Update
router.put("/:id", subscriptionController.updateSubscription);

// Delete
router.delete("/:id", subscriptionController.deleteSubscription);

// Assign Category/SubCategory Access
router.post("/:id/access", subscriptionController.assignAccess);

// Remove Access
router.delete(
    "/:id/access/:accessId",
    subscriptionController.removeAccess
);

// Get Access
router.get("/:id/access", subscriptionController.getSubscriptionAccess);

module.exports = router;
