const BlogCategory = require('../models/BlogCategory');

// Get All Categories (with population for hierarchy)
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.find({ isActive: true });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Single BlogCategory
exports.getBlogCategoryById = async (req, res) => {
  try {

    const blogCategory = await BlogCategory.findById(req.params.id);
    if (!blogCategory) {
      return res.status(404).json({ error: 'BlogCategory not found' });
    }
    res.json(blogCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create BlogCategory (Admin only)
exports.createBlogCategory = async (req, res) => {
  try {
   

    const blogCategory = new BlogCategory(req.body);
    await blogCategory.save();
    res.status(201).json({message:"BlogCategory created successfully",blogCategory});
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

    const blogCategory = await BlogCategory.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!blogCategory) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `BlogCategory status updated to ${status}`,
      blogCategory,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// Update BlogCategory
exports.updateBlogCategory = async (req, res) => {
  try {
    console.log(req.body,"update BlogCategory body");
    const blogCategory = await BlogCategory.findByIdAndUpdate(
       req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!blogCategory) {
      return res.status(404).json({ error: 'BlogCategory not found' });
    }

    res.json(blogCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete BlogCategory
exports.deleteBlogCategory = async (req, res) => {
  try {
    const blogCategory = await BlogCategory.findByIdAndDelete(req.params.id);
    if (!blogCategory) {
      return res.status(404).json({ error: 'BlogCategory not found' });
    }
    res.json({ message: 'BlogCategory deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};