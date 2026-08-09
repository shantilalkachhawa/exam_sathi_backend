const { Op } = require("sequelize");
const { Subject } = require("../models");

const DEFAULT_SUBJECTS = [
  { name: "Mathematics", code: "MATH" },
  { name: "MP GK", code: "MPGK" },
  { name: "Reasoning", code: "REA" },
  { name: "English", code: "ENG" },
  { name: "Hindi", code: "HIN" },
  { name: "Current Affairs", code: "CA" },
];

exports.seedDefaultSubjects = async () => {
  const count = await Subject.count();
  if (count > 0) return;
  await Subject.bulkCreate(DEFAULT_SUBJECTS);
};

exports.createSubject = async (req, res) => {
  try {
    const { name, code, status } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "name is required",
      });
    }

    const item = await Subject.create({
      name: String(name).trim(),
      code: code ? String(code).trim().toUpperCase() : null,
      status: status === "inactive" ? "inactive" : "active",
    });

    return res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: item,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.search && String(req.query.search).trim()) {
      where.name = { [Op.like]: `%${String(req.query.search).trim()}%` };
    }

    const rows = await Subject.findAll({
      where,
      order: [["name", "ASC"]],
    });

    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getSubjectById = async (req, res) => {
  try {
    const item = await Subject.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }
    return res.json({ success: true, data: item });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const item = await Subject.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    const { name, code, status } = req.body;
    await item.update({
      name: name != null ? String(name).trim() : item.name,
      code: code !== undefined ? (code ? String(code).trim().toUpperCase() : null) : item.code,
      status: status === "inactive" || status === "active" ? status : item.status,
    });

    return res.json({
      success: true,
      message: "Subject updated successfully",
      data: item,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const item = await Subject.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }
    await item.destroy();
    return res.json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
