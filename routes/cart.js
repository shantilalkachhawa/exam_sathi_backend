const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController');
const validateRequest = require('../middlewares/validate');
const { cartSchema} = require('../validators/userValidators');
const {verifyToken} = require('../middlewares/http');



router.post('/add',validateRequest(cartSchema), cartController.addToCart);      
router.get('/',verifyToken,cartController.getAllCarts);               
// router.get('/:id', cartController.getCategoryById);            
// router.put('/:id', cartController.updateCategory);    
// router.delete('/:id', cartController.deleteCategory); 

module.exports = router