const Category = require('../models/Category');

// Get All Categories (with population for hierarchy)
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ status: "published" });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



//---get admin categories---

exports.getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Single Category
exports.getCategoryById = async (req, res) => {
  try {

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create Category (Admin only)
exports.createCategory = async (req, res) => {
  try {
   

    const category = new Category(req.body);
    await category.save();
    res.status(201).json({message:"Category created successfully",category});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


//-------------------------update status -----------

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // expected 'draft' or 'published'

    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `category status updated to ${status}`,
      category,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// Update Category
exports.updateCategory = async (req, res) => {
  try {
    console.log(req.body,"update category body");
    const category = await Category.findByIdAndUpdate(
       req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};