const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middlewares/http');


// router.post('/create-payment', orderController.createPayment);         
router.post('/verify-payment', verifyToken, orderController.confirmPayment);
router.post('/create', verifyToken, orderController.createOrder);
// router.get('/', verifyToken,orderController.getAllOrders);         
// router.get('/:id',verifyToken, orderController.getOrderById);      
// router.put('/:id',verifyToken, orderController.updateOrder);       
// router.delete('/:id', verifyToken,orderController.deleteOrder);    
// router.post('/verify-payment', orderController.paymentVerify);   
module.exports = router;
