const dayjs = require("dayjs");

/**
 * Calculate expiry date from plan type + validity days.
 * lifetime → null (never expires)
 */
exports.calculateExpiry = (planType, validityDays = 30) => {
  if (planType === "lifetime") {
    return null;
  }

  const days = Number(validityDays) || 30;
  return dayjs().add(days, "day").toDate();
};

/**
 * Alias used by purchase flow
 */
exports.getExpiryDate = (planType, validityDays) =>
  exports.calculateExpiry(planType, validityDays);

/**
 * Lifetime plan check
 */
exports.isLifetime = (expiryDate) => expiryDate === null;

/**
 * Expired check (null expiry = lifetime = not expired)
 */
exports.isExpired = (expiryDate) => {
  if (!expiryDate) return false;
  return dayjs(expiryDate).isBefore(dayjs());
};

/**
 * Still active by expiry
 */
exports.isActiveByExpiry = (expiryDate) => !exports.isExpired(expiryDate);
