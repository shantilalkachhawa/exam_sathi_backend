const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middlewares/http");
const paymentController = require("../controllers/paymentController");

router.post("/order", verifyToken, paymentController.createOrder);

router.post("/verify", verifyToken, paymentController.verifyPayment);

router.post("/fail", verifyToken, paymentController.failPayment);

router.post("/manual", verifyToken, paymentController.manualCapture);

router.get("/", verifyToken, paymentController.getAllPayments);

router.get("/my", verifyToken, paymentController.getMyPayments);

router.get("/:id", verifyToken, paymentController.getPaymentById);

module.exports = router;
