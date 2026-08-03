const express = require("express");
const router = express.Router();

const roleController = require("../controllers/roleController");


// Role CRUD

// User Role        

router.post("/assign", roleController.assignRole);
router.get("/user/:userId", roleController.getUserRoles);

router.post("/", roleController.createRole);
router.get("/", roleController.getRoles);
router.get("/:id", roleController.getRole);
router.put("/:id", roleController.updateRole);
router.delete("/:id", roleController.deleteRole);
module.exports = router;