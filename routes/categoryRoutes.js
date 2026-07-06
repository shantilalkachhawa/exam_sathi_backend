const express = require("express");
const router = express.Router();

const categoryController = require("../controllers/categoryController");

/* ===========================
        CATEGORY ROUTES
=========================== */

router.post("/", categoryController.createCategory);

router.get("/", categoryController.getCategories);

router.get("/:id", categoryController.getCategoryById);

router.put("/:id", categoryController.updateCategory);

router.delete("/:id", categoryController.deleteCategory);

/* ===========================
      SUB CATEGORY ROUTES
=========================== */

router.post("/sub-category", categoryController.createSubCategory);

router.get("/sub-category/all", categoryController.getSubCategories);

router.get("/sub-category/:id", categoryController.getSubCategoryById);

router.put("/sub-category/:id", categoryController.updateSubCategory);

router.delete("/sub-category/:id", categoryController.deleteSubCategory);

module.exports = router;