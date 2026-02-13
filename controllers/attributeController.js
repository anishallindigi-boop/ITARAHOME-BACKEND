const Attribute = require('../models/Attribute');

// Get all attributes
exports.getAllAttributes = async (req, res) => {
  try {
    const attributes = await Attribute.find();
    res.json(attributes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create attribute
exports.createAttribute = async (req, res) => {
  try {
    const attribute = new Attribute(req.body);
    await attribute.save();
    res.status(201).json({ message: "Attribute created successfully", attribute });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update attribute
exports.updateAttribute = async (req, res) => {
  try {
    const updated = await Attribute.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Attribute not found" });

    res.json({ message: "Attribute updated", attribute: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete attribute
exports.deleteAttribute = async (req, res) => {
  try {
    const deleted = await Attribute.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Attribute not found" });

    res.json({ message: "Attribute deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
