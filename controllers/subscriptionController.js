const { Op } = require("sequelize");
const sequelize = require("../config/db");

const {
  Subscription,
  SubscriptionAccess,
  User,
  Category,
  SubCategory,
} = require("../models");
const {
  canPurchaseSubscription,
  getSubscriptionWithAccess,
  findExpiredSubscription,
  createUserSubscription,
  renewUserSubscription,
} = require("../services/subscription.service");
const {
  createSuccessPayment,
} = require("../services/payment.service");
const {
  getUserSubscriptions,
  getSubscriptionAccess,
} = require("../services/access.service");

// =============================
// Create Subscription
// =============================
exports.createSubscription = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      name,
      description,
      access_type,
      plan_type,
      price,
      validity_days,
      total_test,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Subscription name is required",
      });
    }

    const existing = await Subscription.findOne({
      where: { name },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Subscription already exists",
      });
    }

    const subscription = await Subscription.create(
      {
        name,
        description,
        access_type,
        plan_type,
        price,
        validity_days,
        total_test,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: subscription,
    });
  } catch (err) {
    await transaction.rollback();

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =============================
// Get All
// =============================
exports.getSubscriptions = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    const where = {};

    if (search.trim()) {
      where.name = {
        [Op.like]: `%${search}%`,
      };
    }

    const { count, rows } = await Subscription.findAndCountAll({
      where,

      include: [
        {
          model: SubscriptionAccess,
          as: "access",
        },
      ],

      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    return res.json({
      success: true,
      total: count,
      page,
      data: rows,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =============================
// Get Single
// =============================
exports.getSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id, {
      include: [
        {
          model: SubscriptionAccess,
          as: "access",
        },
      ],
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    return res.json({
      success: true,
      data: subscription,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =============================
// Update
// =============================
exports.updateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    await subscription.update(req.body);

    return res.json({
      success: true,
      message: "Subscription updated successfully",
      data: subscription,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =============================
// Delete (Soft)
// =============================
exports.deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    await subscription.update({
      status: "inactive",
    });

    return res.json({
      success: true,
      message: "Subscription deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =============================
// Assign Category/SubCategory
// =============================
exports.assignAccess = async (req, res) => {
  try {
    const { access_level, access_id } = req.body;

    const subscription = await Subscription.findByPk(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    const exists = await SubscriptionAccess.findOne({
      where: {
        subscription_id: subscription.id,
        access_level,
        access_id,
      },
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Already assigned",
      });
    }

    const access = await SubscriptionAccess.create({
      subscription_id: subscription.id,
      access_level,
      access_id,
    });

    return res.json({
      success: true,
      message: "Access assigned successfully",
      data: access,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =============================
// Remove Access
// =============================
exports.removeAccess = async (req, res) => {
  try {
    const access = await SubscriptionAccess.findByPk(req.params.accessId);

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Access not found",
      });
    }

    await access.destroy();

    return res.json({
      success: true,
      message: "Access removed successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =============================
// Get Access
// =============================
exports.getSubscriptionAccess = async (req, res) => {
  try {
    const data = await SubscriptionAccess.findAll({
      where: {
        subscription_id: req.params.id,
      },
    });

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =============================
// Admin: Assign plan to a user
// Body: { user_id, subscription_id, payment_method?, transaction_id? }
// =============================
exports.assignSubscriptionToUser = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      user_id,
      subscription_id,
      payment_method = "manual",
      transaction_id = null,
    } = req.body;

    if (!user_id || !subscription_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "user_id and subscription_id are required",
      });
    }

    const user = await User.findByPk(user_id);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const subscription = await getSubscriptionWithAccess(subscription_id);
    if (!subscription || subscription.status !== "active") {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Subscription not found or inactive",
      });
    }

    const canPurchase = await canPurchaseSubscription(user_id, subscription_id);
    if (!canPurchase.allowed) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: canPurchase.message,
      });
    }

    let payment = null;
    const amountPaid =
      subscription.access_type === "paid" ? Number(subscription.price) : 0;

    if (subscription.access_type === "paid") {
      payment = await createSuccessPayment(
        {
          userId: user_id,
          subscriptionId: subscription.id,
          amount: subscription.price,
          paymentMethod: payment_method,
          transactionId: transaction_id,
        },
        transaction
      );
    }

    const expired = await findExpiredSubscription(user_id, subscription.id);
    let userSubscription;

    if (expired) {
      userSubscription = await renewUserSubscription(
        expired,
        {
          planType: subscription.plan_type,
          validityDays: subscription.validity_days,
          amountPaid,
        },
        transaction
      );
    } else {
      userSubscription = await createUserSubscription(
        {
          userId: user_id,
          subscriptionId: subscription.id,
          amountPaid,
          planType: subscription.plan_type,
          validityDays: subscription.validity_days,
        },
        transaction
      );
    }

    await user.update({ subscription_id: subscription.id }, { transaction });

    await transaction.commit();

    const refreshedUser = await User.findByPk(user_id, {
      include: [{ model: Subscription, as: "subscription" }],
    });

    return res.status(201).json({
      success: true,
      message: "Subscription assigned successfully",
      data: refreshedUser,
      meta: { payment, userSubscription },
    });
  } catch (err) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =============================
// Mobile catalog (plans + category labels)
// GET /api/subscriptions/catalog
// =============================
exports.getSubscriptionCatalog = async (req, res) => {
  try {
    const plans = await Subscription.findAll({
      where: { status: "active" },
      include: [
        {
          model: SubscriptionAccess,
          as: "access",
          where: { status: "active" },
          required: false,
        },
      ],
      order: [["price", "ASC"]],
    });

    const categories = await Category.findAll({
      attributes: ["id", "category_name", "img_url", "status"],
    });
    const subCategories = await SubCategory.findAll({
      attributes: ["id", "name", "category_id", "status"],
    });

    const categoryMap = new Map(categories.map((c) => [String(c.id), c]));
    const subMap = new Map(subCategories.map((s) => [String(s.id), s]));

    const data = plans.map((plan) => {
      const plain = plan.toJSON();
      const accessItems = (plain.access || []).map((item) => {
        if (item.access_level === "category") {
          const cat = categoryMap.get(String(item.access_id));
          return {
            ...item,
            label: cat?.category_name || `Category #${item.access_id}`,
            category_id: cat ? cat.id : Number(item.access_id),
            category_name: cat?.category_name || null,
            sub_category_id: null,
            sub_category_name: null,
          };
        }

        const sub = subMap.get(String(item.access_id));
        const cat = sub ? categoryMap.get(String(sub.category_id)) : null;
        return {
          ...item,
          label: sub
            ? `${cat?.category_name || "Category"} / ${sub.name}`
            : `Subcategory #${item.access_id}`,
          category_id: sub?.category_id || null,
          category_name: cat?.category_name || null,
          sub_category_id: sub ? sub.id : Number(item.access_id),
          sub_category_name: sub?.name || null,
        };
      });

      const primary = accessItems[0] || null;

      return {
        id: plain.id,
        name: plain.name,
        description: plain.description,
        price: plain.price,
        validity_days: plain.validity_days,
        plan_type: plain.plan_type,
        access_type: plain.access_type,
        total_test: plain.total_test,
        status: plain.status,
        access: accessItems,
        display_category_id: primary?.category_id || null,
        display_category_name: primary?.category_name || null,
        unlock_summary: accessItems.map((a) => a.label),
      };
    });

    const byCategory = {};
    for (const plan of data) {
      const key = String(plan.display_category_id || "other");
      if (!byCategory[key]) {
        byCategory[key] = {
          category_id: plan.display_category_id,
          category_name: plan.display_category_name || "Other plans",
          plans: [],
        };
      }
      byCategory[key].plans.push(plan);
    }

    return res.json({
      success: true,
      data: {
        plans: data,
        grouped_by_category: Object.values(byCategory),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =============================
// Mobile unlocked access for logged-in user
// GET /api/subscriptions/my-access
// =============================
exports.getMyUnlockedAccess = async (req, res) => {
  try {
    const userId = req.user.id;
    const activeSubs = await getUserSubscriptions(userId);

    const categoryIds = new Set();
    const subCategoryIds = new Set();
    const details = [];

    for (const userSub of activeSubs) {
      const accessRows = await getSubscriptionAccess(userSub.subscription_id);
      for (const row of accessRows) {
        if (row.access_level === "category") {
          categoryIds.add(Number(row.access_id));
        } else if (row.access_level === "sub_category") {
          subCategoryIds.add(Number(row.access_id));
        }
      }
      details.push({
        user_subscription_id: userSub.id,
        subscription_id: userSub.subscription_id,
        expiry_date: userSub.expiry_date,
        access: accessRows,
      });
    }

    if (categoryIds.size) {
      const subs = await SubCategory.findAll({
        where: { category_id: Array.from(categoryIds) },
        attributes: ["id"],
      });
      subs.forEach((s) => subCategoryIds.add(Number(s.id)));
    }

    return res.json({
      success: true,
      data: {
        has_active_subscription: activeSubs.length > 0,
        unlocked_category_ids: Array.from(categoryIds),
        unlocked_sub_category_ids: Array.from(subCategoryIds),
        subscriptions: details,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};