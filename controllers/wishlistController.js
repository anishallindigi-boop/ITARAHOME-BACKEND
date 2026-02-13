const Wishlist = require('../models/Wishlist');

/**
 * GET user wishlist
 */
exports.getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('products.product');

    res.status(200).json({
      success: true,
      wishlist: wishlist || { user: req.user._id, products: [] },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ADD product to wishlist
 */
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        products: [{ product: productId }],
      });
    } else {
      const alreadyExists = wishlist.products.some(
        (item) => item.product.toString() === productId
      );

      if (alreadyExists) {
        return res.status(400).json({
          success: false,
          message: 'Product already in wishlist',
        });
      }

      wishlist.products.push({ product: productId });
      await wishlist.save();
    }

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist',
      wishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * REMOVE product from wishlist
 */
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { products: { product: productId } } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      wishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * CLEAR wishlist
 */
exports.clearWishlist = async (req, res) => {
  try {
    await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { products: [] }
    );

    res.status(200).json({
      success: true,
      message: 'Wishlist cleared',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
