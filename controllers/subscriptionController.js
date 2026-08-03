const { Op } = require("sequelize");
const sequelize = require("../config/db");

const {
  Subscription,
  SubscriptionAccess,
} = require("../models");

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