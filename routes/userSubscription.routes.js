const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middlewares/http");
const userSubscriptionController = require("../controllers/userSubscriptionController");

router.post(
  "/purchase",
  verifyToken,
  userSubscriptionController.purchaseSubscription
);

router.post(
  "/free",
  verifyToken,
  userSubscriptionController.activateFreeSubscription
);

router.post(
  "/trial",
  verifyToken,
  userSubscriptionController.activateTrial
);

router.get(
  "/my",
  verifyToken,
  userSubscriptionController.getMySubscriptions
);

router.get(
  "/active",
  verifyToken,
  userSubscriptionController.getActiveSubscription
);

router.get(
  "/",
  verifyToken,
  userSubscriptionController.getAllUserSubscriptions
);

router.put(
  "/renew/:id",
  verifyToken,
  userSubscriptionController.renewSubscription
);

router.delete(
  "/:id",
  verifyToken,
  userSubscriptionController.cancelSubscription
);

module.exports = router;
