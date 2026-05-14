const express = require("express");
const router = express.Router();
const controller = require("../controllers/deliveryController");

router.post("/", controller.createDeliveryBoy);
router.get("/", controller.getDeliveryBoys);
router.get("/:id", controller.getDeliveryBoyById);
router.put("/:id", controller.updateDeliveryBoy);
router.delete("/:id", controller.deleteDeliveryBoy);

module.exports = router;
