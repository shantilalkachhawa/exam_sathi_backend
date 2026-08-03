const { Op } = require("sequelize");
const {
  SubscriptionAccess,
  UserSubscription,
  SubCategory,
} = require("../models");

/**
 * Get active access mappings for a subscription plan
 */
exports.getSubscriptionAccess = async (subscriptionId) => {
  return SubscriptionAccess.findAll({
    where: {
      subscription_id: subscriptionId,
      status: "active",
    },
  });
};

/**
 * Get user's currently active (non-expired) subscriptions
 */
exports.getUserSubscriptions = async (userId) => {
  return UserSubscription.findAll({
    where: {
      user_id: userId,
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
 * Exact access match: same access_level + access_id
 */
exports.hasExactAccessOverlap = (existingAccess, newAccess) => {
  for (const newItem of newAccess) {
    const found = existingAccess.find(
      (oldItem) =>
        oldItem.access_level === newItem.access_level &&
        oldItem.access_id === newItem.access_id
    );
    if (found) return true;
  }
  return false;
};

/**
 * Category covers subcategory: existing category X already unlocks new sub of X
 */
exports.hasCategoryCoveringSubCategory = async (existingAccess, newAccess) => {
  const categoryIds = existingAccess
    .filter((item) => item.access_level === "category")
    .map((item) => Number(item.access_id));

  if (!categoryIds.length) return false;

  const newSubIds = newAccess
    .filter((item) => item.access_level === "sub_category")
    .map((item) => Number(item.access_id));

  if (!newSubIds.length) return false;

  const covered = await SubCategory.findOne({
    where: {
      id: { [Op.in]: newSubIds },
      category_id: { [Op.in]: categoryIds },
    },
  });

  return Boolean(covered);
};

/**
 * New category purchase overlaps existing subcategory under that category
 */
exports.hasSubCategoryCoveredByNewCategory = async (existingAccess, newAccess) => {
  const newCategoryIds = newAccess
    .filter((item) => item.access_level === "category")
    .map((item) => Number(item.access_id));

  if (!newCategoryIds.length) return false;

  const existingSubIds = existingAccess
    .filter((item) => item.access_level === "sub_category")
    .map((item) => Number(item.access_id));

  if (!existingSubIds.length) return false;

  const covered = await SubCategory.findOne({
    where: {
      id: { [Op.in]: existingSubIds },
      category_id: { [Op.in]: newCategoryIds },
    },
  });

  return Boolean(covered);
};
