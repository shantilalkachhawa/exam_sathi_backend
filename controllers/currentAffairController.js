const { Op } = require("sequelize");
const { CurrentAffair } = require("../models");

exports.createCurrentAffair = async (req, res) => {
  try {
    const { title, description, youtube_url, thumbnail_url, status } = req.body;

    if (!title || !youtube_url) {
      return res.status(400).json({
        success: false,
        message: "title and youtube_url are required",
      });
    }

    const item = await CurrentAffair.create({
      title,
      description: description || null,
      youtube_url,
      thumbnail_url: thumbnail_url || null,
      status: status === "inactive" ? "inactive" : "active",
      created_by: req.user?.id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Current affair created successfully",
      data: item,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getCurrentAffairs = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;

    if (req.query.search && String(req.query.search).trim()) {
      where.title = { [Op.like]: `%${String(req.query.search).trim()}%` };
    }

    const rows = await CurrentAffair.findAll({
      where,
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

/** Public for all logged-in users — no subscription required */
exports.getMyCurrentAffairs = async (req, res) => {
  try {
    const rows = await CurrentAffair.findAll({
      where: { status: "active" },
      order: [["id", "DESC"]],
    });

    return res.json({
      success: true,
      data: rows,
      meta: {
        subscription_required: false,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getCurrentAffairById = async (req, res) => {
  try {
    const item = await CurrentAffair.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Current affair not found",
      });
    }

    return res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateCurrentAffair = async (req, res) => {
  try {
    const item = await CurrentAffair.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Current affair not found",
      });
    }

    const { title, description, youtube_url, thumbnail_url, status } = req.body;

    await item.update({
      title: title ?? item.title,
      description: description !== undefined ? description : item.description,
      youtube_url: youtube_url ?? item.youtube_url,
      thumbnail_url:
        thumbnail_url !== undefined ? thumbnail_url : item.thumbnail_url,
      status: status === "inactive" || status === "active" ? status : item.status,
    });

    return res.json({
      success: true,
      message: "Current affair updated successfully",
      data: item,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteCurrentAffair = async (req, res) => {
  try {
    const item = await CurrentAffair.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Current affair not found",
      });
    }

    await item.destroy();
    return res.json({
      success: true,
      message: "Current affair deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
