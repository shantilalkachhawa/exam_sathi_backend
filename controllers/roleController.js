const { Roles, UserRoles } = require("../models");


// =====================
// Create Role
// =====================
exports.createRole = async (req, res) => {
  try {
    const role = await Roles.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: role,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================
// Get All Roles
// =====================
exports.getRoles = async (req, res) => {
  try {
    const roles = await Roles.findAll();

    res.json({
      success: true,
      data: roles,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================
// Get Single Role
// =====================
exports.getRole = async (req, res) => {
  try {
    const role = await Roles.findByPk(req.params.id);

    if (!role)
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });

    res.json({
      success: true,
      data: role,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================
// Update Role
// =====================
exports.updateRole = async (req, res) => {
  try {
    const role = await Roles.findByPk(req.params.id);

    if (!role)
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });

    await role.update(req.body);

    res.json({
      success: true,
      message: "Role updated successfully",
      data: role,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================
// Delete Role
// =====================
exports.deleteRole = async (req, res) => {
  try {
    const role = await Roles.findByPk(req.params.id);

    if (!role)
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });

    await role.destroy();

    res.json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================
// Assign Role to User
// =====================
exports.assignRole = async (req, res) => {
  try {
    const data = await UserRoles.create(req.body);

    res.status(201).json({
      success: true,
      message: "Role assigned successfully",
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================
// Get User Roles
// =====================
exports.getUserRoles = async (req, res) => {
  try {
    const roles = await UserRoles.findAll({
      where: {
        user_id: req.params.userId,
      },
      include: ["role"],
    });

    res.json({
      success: true,
      data: roles,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};