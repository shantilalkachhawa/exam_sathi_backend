const path = require("path");
const fs = require("fs-extra");
const { Op } = require("sequelize");
const {
  PreviousYearPaper,
  Category,
  SubCategory,
} = require("../models");

function includeRelations() {
  return [
    {
      model: Category,
      as: "category",
      attributes: ["id", "category_name"],
    },
    {
      model: SubCategory,
      as: "subCategory",
      attributes: ["id", "name", "category_id"],
    },
  ];
}

function publicBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) {
    return String(process.env.PUBLIC_BASE_URL).replace(/\/$/, "");
  }
  return `${req.protocol}://${req.get("host")}`;
}

function toPublicPdfUrl(req, filename) {
  return `${publicBaseUrl(req)}/uploads/${filename}`;
}

function unlinkLocalPdf(pdfUrl) {
  if (!pdfUrl) return;
  try {
    const filename = path.basename(String(pdfUrl).split("?")[0]);
    if (!filename) return;
    const full = path.join(process.cwd(), "uploads", filename);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {
    // ignore cleanup errors
  }
}

exports.createPreviousYearPaper = async (req, res) => {
  try {
    const { title, description, category_id, sub_category_id, year, status } =
      req.body;

    if (!title || !category_id || !sub_category_id) {
      return res.status(400).json({
        success: false,
        message: "title, category_id and sub_category_id are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PDF file is required",
      });
    }

    const pdfUrl = toPublicPdfUrl(req, req.file.filename);

    const item = await PreviousYearPaper.create({
      title,
      description: description || null,
      category_id: Number(category_id),
      sub_category_id: Number(sub_category_id),
      year: year || null,
      pdf_url: pdfUrl,
      original_filename: req.file.originalname || req.file.filename,
      status: status === "inactive" ? "inactive" : "active",
      created_by: req.user?.id || null,
    });

    const full = await PreviousYearPaper.findByPk(item.id, {
      include: includeRelations(),
    });

    return res.status(201).json({
      success: true,
      message: "Previous year paper uploaded successfully",
      data: full,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPreviousYearPapers = async (req, res) => {
  try {
    const where = {};
    if (req.query.category_id) where.category_id = Number(req.query.category_id);
    if (req.query.sub_category_id) {
      where.sub_category_id = Number(req.query.sub_category_id);
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.year) where.year = String(req.query.year);

    if (req.query.search && String(req.query.search).trim()) {
      where.title = { [Op.like]: `%${String(req.query.search).trim()}%` };
    }

    const rows = await PreviousYearPaper.findAll({
      where,
      include: includeRelations(),
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

exports.getPreviousYearPaperById = async (req, res) => {
  try {
    const item = await PreviousYearPaper.findByPk(req.params.id, {
      include: includeRelations(),
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Previous year paper not found",
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

exports.updatePreviousYearPaper = async (req, res) => {
  try {
    const item = await PreviousYearPaper.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Previous year paper not found",
      });
    }

    const { title, description, category_id, sub_category_id, year, status } =
      req.body;

    let pdfUrl = item.pdf_url;
    let originalFilename = item.original_filename;

    if (req.file) {
      unlinkLocalPdf(item.pdf_url);
      pdfUrl = toPublicPdfUrl(req, req.file.filename);
      originalFilename = req.file.originalname || req.file.filename;
    }

    await item.update({
      title: title ?? item.title,
      description: description !== undefined ? description : item.description,
      category_id: category_id != null ? Number(category_id) : item.category_id,
      sub_category_id:
        sub_category_id != null ? Number(sub_category_id) : item.sub_category_id,
      year: year !== undefined ? year || null : item.year,
      pdf_url: pdfUrl,
      original_filename: originalFilename,
      status:
        status === "inactive" || status === "active" ? status : item.status,
    });

    const full = await PreviousYearPaper.findByPk(item.id, {
      include: includeRelations(),
    });

    return res.json({
      success: true,
      message: "Previous year paper updated successfully",
      data: full,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deletePreviousYearPaper = async (req, res) => {
  try {
    const item = await PreviousYearPaper.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Previous year paper not found",
      });
    }

    unlinkLocalPdf(item.pdf_url);
    await item.destroy();

    return res.json({
      success: true,
      message: "Previous year paper deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
