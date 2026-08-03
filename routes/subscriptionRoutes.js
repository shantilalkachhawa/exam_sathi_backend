const express = require("express");

const router = express.Router();

const subscriptionController = require("../controllers/subscriptionController");

// Create
router.post("/", subscriptionController.createSubscription);

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