const SubCategory = require('../models/SubCategory');
const Category = require('../models/Category');

// Get All SubCategories
exports.getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find({ status: 'publish' })
      .populate('category', 'name slug status');

    res.json(subCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get All Admin SubCategories
exports.getAdminAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find()
      .populate('category', 'name slug status');

    res.json(subCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get SubCategory by ID
exports.getSubCategoryById = async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id)
      .populate('category', 'name slug');

    if (!subCategory) {
      return res.status(404).json({ error: 'SubCategory not found' });
    }

    res.json(subCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create SubCategory
exports.createSubCategory = async (req, res) => {
  try {
    const {
      name,
      slug,
      category,
      description,
      image,
      metatitle,
      metadescription,
      metakeywords,
      status
    } = req.body;

    // Check parent category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const subCategory = new SubCategory({
      name,
      slug,
      category,
      description,
      image,
      metatitle,
      metadescription,
      metakeywords,
      status
    });

    await subCategory.save();

    res.status(201).json({
      message: 'SubCategory created successfully',
      subCategory,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update SubCategory
exports.updateSubCategory = async (req, res) => {
  try {
    const subCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!subCategory) {
      return res.status(404).json({ error: 'SubCategory not found' });
    }

    res.json(subCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update SubCategory Status
exports.updateSubCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'publish' or 'draft'

    if (!['publish', 'draft'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const subCategory = await SubCategory.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: 'SubCategory not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `SubCategory status updated to ${status}`,
      subCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete SubCategory
exports.deleteSubCategory = async (req, res) => {
  try {
    const subCategory = await SubCategory.findByIdAndDelete(req.params.id);

    if (!subCategory) {
      return res.status(404).json({ error: 'SubCategory not found' });
    }

    res.json({ message: 'SubCategory deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get SubCategories by Category - FIXED
exports.getSubCategoriesByCategory = async (req, res) => {
  try {
    const subCategories = await SubCategory.find({
      category: req.params.categoryId,
      status: 'publish', // Changed from isActive to status
    }).populate('category', 'name slug status');

    res.json(subCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};