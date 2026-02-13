const ShippingMethod = require('../models/ShippingMethod');

// Get all shipping methods
exports.getAllShippingMethods = async (req, res) => {
  try {
    const active = req.query.active === "true";
    const methods = active
      ? await ShippingMethod.find({ isActive: true })
      : await ShippingMethod.find();

    res.json(methods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single method
exports.getShippingMethodById = async (req, res) => {
  try {
    const method = await ShippingMethod.findById(req.params.id);
    if (!method) return res.status(404).json({ error: "Not found" });

    res.json(method);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create method
exports.createShippingMethod = async (req, res) => {
  try {
    const method = new ShippingMethod(req.body);
    await method.save();
    res.status(201).json({ message: "Shipping method created", method });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update
exports.updateShippingMethod = async (req, res) => {
  try {
    const updated = await ShippingMethod.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Not found" });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete
exports.deleteShippingMethod = async (req, res) => {
  try {
    const deleted = await ShippingMethod.findByIdAndDelete(req.params.id);

    if (!deleted)
      return res.status(404).json({ error: "Not found" });

    res.json({ message: "Shipping method deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
