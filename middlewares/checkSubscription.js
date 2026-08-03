const { getUserSubscriptions } = require("../services/access.service");
const { isLifetime, isExpired } = require("../helpers/subscription.helper");

/**
 * Ensures the logged-in user has at least one active (non-expired) subscription.
 * Attach with: router.get("/protected", verifyToken, checkSubscription, handler)
 */
exports.checkSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const active = await getUserSubscriptions(userId);

    if (!active.length) {
      return res.status(403).json({
        success: false,
        message: "Active subscription required",
      });
    }

    req.userSubscriptions = active;
    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Helper for route-level checks: expiry_date null = lifetime = granted
 */
exports.hasValidExpiry = (expiryDate) => {
  if (isLifetime(expiryDate)) return true;
  return !isExpired(expiryDate);
};
