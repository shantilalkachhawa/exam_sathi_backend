const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
// const isAdmin = require('../middlewares/index');
const { verifyToken, isAdmin } = require('../middlewares/http');

router.post('/create', verifyToken, isAdmin, productController.createProduct);
router.get('/', productController.getAllProducts);
router.put('/update-all', productController.bulkUpdatePrices);
// router.put('/update-all', () => {
//     console.log('controller')
// });
router.get('/:id', verifyToken, productController.getProductById);
router.put('/:id', verifyToken, productController.updateProduct);
router.delete('/:id', verifyToken, productController.deleteProduct);


module.exports = router;
