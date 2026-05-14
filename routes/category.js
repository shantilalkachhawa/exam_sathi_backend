const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController')
const isAdmin = require('../middlewares/http')
const { verifyToken } = require('../middlewares/http');



router.post('/create', verifyToken, categoryController.createCategory);
router.get('/', categoryController.getAllCategory);
router.get('/:id', verifyToken, categoryController.getCategoryById);
router.put('/:id', verifyToken, categoryController.updateCategory);
router.delete('/:id', verifyToken, categoryController.deleteCategory);

module.exports = router