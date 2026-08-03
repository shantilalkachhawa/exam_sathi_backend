const sequelize = require("../config/db");
const { User, Subscription, UserSubscription } = require("../models");
const {
  canPurchaseSubscription,
  canUseTrial,
  canUseFree,
  getSubscriptionWithAccess,
  findExpiredSubscription,
  createUserSubscription,
  renewUserSubscription,
  cancelUserSubscription,
} = require("../services/subscription.service");
const {
  getUserSubscriptions,
} = require("../services/access.service");
const {
  createSuccessPayment,
} = require("../services/payment.service");

/**
 * Shared activation after validation (create or renew)
 */
async function activatePlan({
  userId,
  subscription,
  amountPaid,
  transaction,
}) {
  const expired = await findExpiredSubscription(userId, subscription.id);

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
        userId,
        subscriptionId: subscription.id,
        amountPaid,
        planType: subscription.plan_type,
        validityDays: subscription.validity_days,
      },
      transaction
    );
  }

  // Keep legacy users.subscription_id in sync for admin list
  await User.update(
    { subscription_id: subscription.id },
    { where: { id: userId }, transaction }
  );

  return userSubscription;
}

/**
 * Paid / manual purchase
 * Body: { subscription_id, payment_method?, transaction_id? }
 */
exports.purchaseSubscription = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const {
      subscription_id,
      payment_method = "manual",
      transaction_id = null,
    } = req.body;

    if (!subscription_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "subscription_id is required",
      });
    }

    const user = await User.findByPk(userId);
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
        message: "Subscription not found",
      });
    }

    if (subscription.access_type === "free") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Use /free endpoint for free subscriptions",
      });
    }

    if (subscription.access_type === "trial") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Use /trial endpoint for trial subscriptions",
      });
    }

    const canPurchase = await canPurchaseSubscription(userId, subscription_id);
    if (!canPurchase.allowed) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: canPurchase.message,
      });
    }

    const payment = await createSuccessPayment(
      {
        userId,
        subscriptionId: subscription.id,
        amount: subscription.price,
        paymentMethod: payment_method,
        transactionId: transaction_id,
      },
      transaction
    );

    const userSubscription = await activatePlan({
      userId,
      subscription,
      amountPaid: subscription.price,
      transaction,
    });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Subscription purchased successfully",
      data: {
        payment,
        userSubscription,
      },
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Free plan — no payment row
 * Body: { subscription_id }
 */
exports.activateFreeSubscription = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { subscription_id } = req.body;

    if (!subscription_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "subscription_id is required",
      });
    }

    const subscription = await getSubscriptionWithAccess(subscription_id);
    if (!subscription || subscription.status !== "active") {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (subscription.access_type !== "free") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "This plan is not a free subscription",
      });
    }

    if (!(await canUseFree(userId, subscription_id))) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Free subscription already active",
      });
    }

    const canPurchase = await canPurchaseSubscription(userId, subscription_id);
    if (!canPurchase.allowed) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: canPurchase.message,
      });
    }

    const userSubscription = await activatePlan({
      userId,
      subscription,
      amountPaid: 0,
      transaction,
    });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Free subscription activated successfully",
      data: { userSubscription },
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Trial plan — once per user, no payment
 * Body: { subscription_id }
 */
exports.activateTrial = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { subscription_id } = req.body;

    if (!subscription_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "subscription_id is required",
      });
    }

    const subscription = await getSubscriptionWithAccess(subscription_id);
    if (!subscription || subscription.status !== "active") {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (subscription.access_type !== "trial") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "This plan is not a trial subscription",
      });
    }

    if (!(await canUseTrial(userId))) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Trial already used",
      });
    }

    const canPurchase = await canPurchaseSubscription(userId, subscription_id);
    if (!canPurchase.allowed) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: canPurchase.message,
      });
    }

    const userSubscription = await activatePlan({
      userId,
      subscription,
      amountPaid: 0,
      transaction,
    });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Trial subscription activated successfully",
      data: { userSubscription },
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * All subscriptions for logged-in user
 */
exports.getMySubscriptions = async (req, res) => {
  try {
    const rows = await UserSubscription.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Subscription,
          as: "subscription",
          include: [{ association: "access" }],
        },
      ],
      order: [["id", "DESC"]],
    });

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Currently active (non-expired) subscriptions
 */
exports.getActiveSubscription = async (req, res) => {
  try {
    const rows = await getUserSubscriptions(req.user.id);

    if (!rows.length) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const withPlan = await UserSubscription.findAll({
      where: {
        id: rows.map((r) => r.id),
      },
      include: [
        {
          model: Subscription,
          as: "subscription",
          include: [{ association: "access" }],
        },
      ],
      order: [["id", "DESC"]],
    });

    return res.json({
      success: true,
      data: withPlan,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Renew by user_subscription id
 */
exports.renewSubscription = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const id = req.params.id;

    const userSubscription = await UserSubscription.findOne({
      where: { id, user_id: userId },
      include: [{ model: Subscription, as: "subscription" }],
    });

    if (!userSubscription) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "User subscription not found",
      });
    }

    const subscription = userSubscription.subscription;
    if (!subscription || subscription.status !== "active") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Subscription plan is not available",
      });
    }

    if (subscription.access_type === "paid") {
      await createSuccessPayment(
        {
          userId,
          subscriptionId: subscription.id,
          amount: subscription.price,
          paymentMethod: "manual",
        },
        transaction
      );
    }

    const renewed = await renewUserSubscription(
      userSubscription,
      {
        planType: subscription.plan_type,
        validityDays: subscription.validity_days,
        amountPaid:
          subscription.access_type === "paid" ? subscription.price : 0,
      },
      transaction
    );

    await User.update(
      { subscription_id: subscription.id },
      { where: { id: userId }, transaction }
    );

    await transaction.commit();

    return res.json({
      success: true,
      message: "Subscription renewed successfully",
      data: renewed,
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Cancel by user_subscription id
 */
exports.cancelSubscription = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const id = req.params.id;

    const userSubscription = await UserSubscription.findOne({
      where: { id, user_id: userId },
    });

    if (!userSubscription) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "User subscription not found",
      });
    }

    await cancelUserSubscription(userSubscription, transaction);
    await transaction.commit();

    return res.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Admin: list all user subscriptions
 * Query: page, limit, status, search (user name/email)
 */
exports.getAllUserSubscriptions = async (req, res) => {
  try {
    const { Op } = require("sequelize");
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const search = (req.query.search || "").trim();

    const where = {};
    if (status) where.status = status;

    const userWhere = search
      ? {
          [Op.or]: [
            { full_name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
          ],
        }
      : undefined;

    const { count, rows } = await UserSubscription.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email", "phone_number"],
          where: userWhere,
          required: !!search,
        },
        {
          model: Subscription,
          as: "subscription",
          attributes: [
            "id",
            "name",
            "price",
            "plan_type",
            "access_type",
            "validity_days",
          ],
          include: [{ association: "access" }],
        },
      ],
      order: [["id", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return res.json({
      success: true,
      total: count,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(count / limit)),
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
