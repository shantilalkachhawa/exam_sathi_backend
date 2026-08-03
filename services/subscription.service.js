const { Op } = require("sequelize");
const {
  Subscription,
  UserSubscription,
} = require("../models");
const {
  getSubscriptionAccess,
  getUserSubscriptions,
  hasExactAccessOverlap,
  hasCategoryCoveringSubCategory,
  hasSubCategoryCoveredByNewCategory,
} = require("./access.service");
const { calculateExpiry } = require("../helpers/subscription.helper");

/**
 * Same plan already active for this user
 */
exports.checkExistingSubscription = async (userId, subscriptionId) => {
  return UserSubscription.findOne({
    where: {
      user_id: userId,
      subscription_id: subscriptionId,
      status: "active",
      is_active: true,
      [Op.or]: [
        { expiry_date: null },
        { expiry_date: { [Op.gt]: new Date() } },
      ],
    },
  });
};

/**
 * Find expired row for same plan (for renewal)
 */
exports.findExpiredSubscription = async (userId, subscriptionId) => {
  return UserSubscription.findOne({
    where: {
      user_id: userId,
      subscription_id: subscriptionId,
      [Op.or]: [
        { status: "expired" },
        {
          status: "active",
          is_active: true,
          expiry_date: { [Op.lte]: new Date() },
        },
      ],
    },
    order: [["id", "DESC"]],
  });
};

/**
 * Load plan with access mappings
 */
exports.getSubscriptionWithAccess = async (subscriptionId) => {
  return Subscription.findByPk(subscriptionId, {
    include: [
      {
        model: require("../models").SubscriptionAccess,
        as: "access",
      },
    ],
  });
};

/**
 * Overlap / already-covered check
 */
exports.canPurchaseSubscription = async (userId, subscriptionId) => {
  const newAccess = await getSubscriptionAccess(subscriptionId);

  if (!newAccess.length) {
    return {
      allowed: false,
      message: "Subscription has no active access mappings.",
    };
  }

  const userSubscriptions = await getUserSubscriptions(userId);

  if (!userSubscriptions.length) {
    return { allowed: true };
  }

  for (const userSubscription of userSubscriptions) {
    if (Number(userSubscription.subscription_id) === Number(subscriptionId)) {
      return {
        allowed: false,
        message: "Subscription already active",
      };
    }

    const existingAccess = await getSubscriptionAccess(
      userSubscription.subscription_id
    );

    if (hasExactAccessOverlap(existingAccess, newAccess)) {
      return {
        allowed: false,
        message: "Already covered by another active subscription.",
      };
    }

    if (await hasCategoryCoveringSubCategory(existingAccess, newAccess)) {
      return {
        allowed: false,
        message:
          "This access is already included in an active category subscription.",
      };
    }

    if (await hasSubCategoryCoveredByNewCategory(existingAccess, newAccess)) {
      return {
        allowed: false,
        message:
          "You already have subcategory access covered by this category plan.",
      };
    }
  }

  return { allowed: true };
};

/**
 * Trial only once per user (any trial plan)
 */
exports.canUseTrial = async (userId) => {
  const trial = await UserSubscription.findOne({
    where: { user_id: userId },
    include: [
      {
        model: Subscription,
        as: "subscription",
        where: { access_type: "trial" },
        required: true,
      },
    ],
  });

  return !trial;
};

/**
 * Free plan: only if not already active for same plan
 */
exports.canUseFree = async (userId, subscriptionId) => {
  const existing = await exports.checkExistingSubscription(
    userId,
    subscriptionId
  );
  return !existing;
};

/**
 * Activate / create user subscription row
 */
exports.createUserSubscription = async (
  { userId, subscriptionId, amountPaid, planType, validityDays },
  transaction
) => {
  const expiryDate = calculateExpiry(planType, validityDays);

  return UserSubscription.create(
    {
      user_id: userId,
      subscription_id: subscriptionId,
      amount_paid: amountPaid,
      purchased_at: new Date(),
      expiry_date: expiryDate,
      test_used: 0,
      is_active: true,
      status: "active",
    },
    { transaction }
  );
};

/**
 * Renew expired subscription: extend expiry from now
 */
exports.renewUserSubscription = async (
  userSubscription,
  { planType, validityDays, amountPaid },
  transaction
) => {
  const expiryDate = calculateExpiry(planType, validityDays);

  await userSubscription.update(
    {
      amount_paid: amountPaid,
      purchased_at: new Date(),
      expiry_date: expiryDate,
      is_active: true,
      status: "active",
    },
    { transaction }
  );

  return userSubscription;
};

/**
 * Soft-cancel
 */
exports.cancelUserSubscription = async (userSubscription, transaction) => {
  await userSubscription.update(
    {
      is_active: false,
      status: "cancelled",
    },
    { transaction }
  );
  return userSubscription;
};
