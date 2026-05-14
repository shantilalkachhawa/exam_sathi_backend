const DeliveryBoy = require("../models/delivery");
const User = require("../models/user");

module.exports = {

  // Create Delivery Boy
  createDeliveryBoy: async (req, res) => {
    try {
      const { deliveryBoyName, phoneNumber, vehicleNumber, userId } = req.body;

      const user = await User.findByPk(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const boy = await DeliveryBoy.create({
        deliveryBoyName,
        phoneNumber,
        vehicleNumber,
        userId
      });

      res.status(201).json({ message: "Delivery boy created", boy });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Get All Delivery Boys
  getDeliveryBoys: async (req, res) => {
    try {
      const boys = await DeliveryBoy.findAll({
        include: [{ model: User, as: "user" }],
      });
      res.json(boys);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },


  // Get Delivery Boy by ID
  getDeliveryBoyById: async (req, res) => {
    try {
      const boy = await DeliveryBoy.findByPk(req.params.id, {
        include: [{ model: User, as: "user" }],
      });
      if (!boy) return res.status(404).json({ error: "Not found" });

      res.json(boy);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },


  // Update Delivery Boy
  updateDeliveryBoy: async (req, res) => {
    try {
      const { deliveryBoyName, phoneNumber, vehicleNumber, dutyStatus, status } = req.body;

      const boy = await DeliveryBoy.findByPk(req.params.id);
      if (!boy) return res.status(404).json({ error: "Not found" });

      await boy.update({
        deliveryBoyName,
        phoneNumber,
        vehicleNumber,
        dutyStatus,
        status
      });

      res.json({ message: "Updated successfully", boy });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },


  // Delete Delivery Boy
  deleteDeliveryBoy: async (req, res) => {
    try {
      const boy = await DeliveryBoy.findByPk(req.params.id);
      if (!boy) return res.status(404).json({ error: "Not found" });

      await boy.destroy();
      res.json({ message: "Deleted successfully" });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

};
