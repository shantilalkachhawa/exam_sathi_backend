const Store = require("../models/store");
const User = require("../models/user");

module.exports = {

    // Create Store
    createStore: async (req, res) => {
        try {
            const { storeName, storeNumber, vendorId, address } = req.body;

            const vendor = await User.findByPk(vendorId);
            if (!vendor) return res.status(404).json({ error: "Vendor not found" });

            const store = await Store.create({ storeName, storeNumber, vendorId, address });
            res.status(201).json({ message: "Store created", store });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Get All Stores
    getStores: async (req, res) => {
        try {
            const stores = await Store.findAll({
                include: [{ model: User, as: "vendor" }],
            });
            res.json(stores);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Get Store by ID
    getStoreById: async (req, res) => {
        try {
            const store = await Store.findByPk(req.params.id, {
                include: [{ model: User, as: "vendor" }],
            });
            if (!store) return res.status(404).json({ error: "Store not found" });
            res.json(store);

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Update Store
    updateStore: async (req, res) => {
        try {
            const { storeName, storeNumber, address, status } = req.body;

            const store = await Store.findByPk(req.params.id);
            if (!store) return res.status(404).json({ error: "Store not found" });

            await store.update({ storeName, storeNumber, address, status });

            res.json({ message: "Store updated", store });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Delete Store
    deleteStore: async (req, res) => {
        try {
            const store = await Store.findByPk(req.params.id);
            if (!store) return res.status(404).json({ error: "Store not found" });

            await store.destroy();
            res.json({ message: "Store deleted successfully" });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

};
