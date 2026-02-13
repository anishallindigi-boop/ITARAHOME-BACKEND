const Product = require('../models/Product');
const Category = require('../models/Category');

/* ---------- CREATE ---------- */
exports.createProduct = async (req, res) => {
  try {

    // console.log(req.body,"req body")
    const product = await Product.create(req.body);
    res.status(201).json({
      success: true,
      product,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


//---------------------get all for admin-----------------

exports.getAdminProducts = async (req, res) => {
  try {

    
    const products = await Product.find().sort({ createdAt: -1 }).populate('categoryid').populate('subcategoryid');
    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};




/* ---------- GET ALL  ---------- */
exports.getProducts = async (req, res) => {
  try {

    
    const products = await Product.find({status: 'published'}).sort({ createdAt: -1 }).populate('categoryid').populate('subcategoryid');
    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ---------- GET SINGLE ---------- */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('categoryid');
    if (!product)
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });

    res.json({ success: true, product });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


/* ---------- GET SINGLE PRODUCT BY SLUG ---------- */
exports.getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Slug is required',
      });
    }

    const product = await Product.findOne({
      slug,
      status: 'published',
    }).populate('categoryid');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};


/* ---------- GET PRODUCTS BY CATEGORY SLUG ---------- */
exports.getProductsByCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Category slug is required',
      });
    }

    // Find category by slug
    const category = await Category.findOne({
      slug,
      isActive: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Find products belonging to this category
    const products = await Product.find({
      categoryid: category._id,
      status: 'published', // remove if not needed
    })
      .sort({ createdAt: -1 })
      .populate('categoryid');

    res.status(200).json({
      success: true,
      category,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


//-------------------------------UPDATE STATUS---------------------
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

    const product = await Product.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `Product status updated to ${status}`,
      product,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



/* ---------- UPDATE ---------- */
// exports.updateProduct = async (req, res) => {
//   try {
//     const product = await Product.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true, runValidators: true }
//     );

//     if (!product)
//       return res.status(404).json({
//         success: false,
//         message: 'Product not found',
//       });

//     res.json({ success: true, product });
//   } catch (err) {
//     res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };



exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 Clean up arrays to remove duplicates
    if (req.body.categoryid && Array.isArray(req.body.categoryid)) {
      req.body.categoryid = [...new Set(req.body.categoryid.filter(Boolean))];
    }

    if (req.body.subcategoryid && Array.isArray(req.body.subcategoryid)) {
      req.body.subcategoryid = [...new Set(req.body.subcategoryid.filter(Boolean))];
    }

    console.log('Update request for product:', id);
    console.log('Categories to update:', req.body.categoryid);
    console.log('Subcategories to update:', req.body.subcategoryid);

    // 🔥 Use findByIdAndUpdate with $set to replace arrays completely
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: req.body }, // This ensures arrays are replaced, not merged
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validations
        overwrite: false, // Don't replace entire document
      }
    ).populate('categoryid').populate('subcategoryid');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    console.log('Product updated successfully');
    console.log('Updated categories:', product.categoryid);
    console.log('Updated subcategories:', product.subcategoryid);

    res.json({
      success: true,
      message: 'Product updated successfully',
      product,
    });
  } catch (err) {
    console.error('Update error:', err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


/* ---------- DELETE ---------- */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product)
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });

    res.json({
      success: true,
      message: 'Product deleted',
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};



//-----------------filter products---------------
exports.filterProducts = async (req, res) => {
  try {
    const {
      categories,
      subcategories,
      minPrice,
      maxPrice,
      attributes,
      sort,
    } = req.body;

    const query = { status: 'published' };

    /* ---------- CATEGORY ---------- */
    if (categories?.length) {
      query.categoryid = { $in: categories };
    }

    /* ---------- SUBCATEGORY ---------- */
    if (subcategories?.length) {
      query.subcategoryid = { $in: subcategories };
    }

    /* ---------- PRICE ---------- */
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    /* ---------- ATTRIBUTES ---------- */
    if (attributes) {
      Object.keys(attributes).forEach((key) => {
        if (attributes[key]?.length) {
          query[`attributes.${key}`] = { $in: attributes[key] };
        }
      });
    }

    /* ---------- SORT ---------- */
    let sortQuery = { createdAt: -1 };

    if (sort === 'price_asc') sortQuery = { price: 1 };
    if (sort === 'price_desc') sortQuery = { price: -1 };
    if (sort === 'latest') sortQuery = { createdAt: -1 };

    const products = await Product.find(query)
      .populate('categoryid')
      .populate('subcategoryid')
      .sort(sortQuery);

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};




//-------------------serch product-------------


exports.searchProducts = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.json({
        success: true,
        products: [],
        count: 0,
        message: 'No search query provided'
      });
    }

    const searchRegex = new RegExp(query.trim(), 'i'); // Case-insensitive

    const products = await Product.find({
      $or: [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { slug: { $regex: searchRegex } }
      ],
      status: 'published', // Only published products
      isActive: true
    })
      .select('name slug mainImage price discountPrice stock status') // Select only needed fields
      .sort({ name: 1 }) // Sort alphabetically by name (A-Z)
      .limit(parseInt(limit));

    res.json({
      success: true,
      products,
      count: products.length,
      query: query.trim()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};