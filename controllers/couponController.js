const Coupon = require('../models/Coupon');
const Cart = require('../models/CartItem'); 

// CREATE: Admin creates a coupon (manual code)
exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      minOrderAmount = 0,
      maxUses,
      validFrom,
      validUntil,
      applicableProducts = [],
      applicableCategories = [],
    } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const normalizedCode = code.trim().toUpperCase();

    const existing = await Coupon.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Coupon code "${normalizedCode}" already exists` });
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      type,
      value,
      minOrderAmount,
      maxUses: maxUses || null,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      applicableProducts,
      applicableCategories,
      createdBy: req.user._id,  // From auth middleware
    });

    res.status(201).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ: Get all coupons (admin only, with filters)
exports.getAllCoupons = async (req, res) => {
  try {
    const { status, type, sort = 'createdAt', order = -1, limit = 20, page = 1 } = req.query;

    const query = {};
    if (status) query.isActive = status === 'active';
    if (type) query.type = type;

    const skip = (page - 1) * limit;

    const coupons = await Coupon.find(query)
      .sort({ [sort]: order })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name')  // Optional: show creator name
      .populate('applicableProducts', 'name slug');

    const total = await Coupon.countDocuments(query);

    res.json({
      success: true,
      coupons,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ: Get single coupon by ID (admin or for details)
exports.getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('applicableProducts', 'name slug');

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    res.json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE: Update a coupon (admin only)
exports.updateCoupon = async (req, res) => {
  try {
    const updates = req.body;

    // If updating code, check uniqueness
    if (updates.code) {
      updates.code = updates.code.trim().toUpperCase();
      const existing = await Coupon.findOne({ code: updates.code, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Coupon code "${updates.code}" already exists` });
      }
    }

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    res.json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE: Delete a coupon (admin only, soft delete by deactivating)
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    res.json({ success: true, message: 'Coupon deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// Partial update (used for toggling isActive, but flexible for other fields too)
exports.updateCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // { isActive: true/false,  or other fields if you allow }

    // Optional: restrict to only allow isActive for this endpoint
    // if (!('isActive' in updates)) {
    //   return res.status(400).json({ success: false, message: 'No valid fields to update' });
    // }

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      { $set: updates },           // partial update
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.json({
      success: true,
      message: `Coupon ${coupon.code} is now ${coupon.isActive ? 'active' : 'inactive'}`,
      coupon
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating coupon status'
    });
  }
};


// BONUS: Apply coupon (user-facing, in cart/checkout)
// Apply Coupon - Fixed Version
exports.applyCoupon = async (req, res) => {
  try {
    const { code, cartTotal, shippingCost = 0 } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code required' });
    }

    // Get cart total from request body or calculate from user's cart
    let finalCartTotal = cartTotal;

    // If cartTotal not provided in body, fetch from database
    if (!finalCartTotal && req.user) {
      const cart = await Cart.findOne({ user: req.user._id }).populate('items.productId');
      if (cart) {
        finalCartTotal = cart.items.reduce((sum, item) => {
          const price = item.productId.discountPrice || item.productId.price;
          return sum + (price * item.quantity);
        }, 0);
      }
    }

    if (!finalCartTotal || finalCartTotal <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid cart total' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: normalizedCode, isActive: true });

    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive coupon' });
    }

    const now = new Date();
    
    // Check valid from date
    if (coupon.validFrom && now < new Date(coupon.validFrom)) {
      return res.status(400).json({ success: false, message: 'Coupon not yet active' });
    }
    
    // Check expiry date
    if (coupon.validUntil && now > new Date(coupon.validUntil)) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }

    // Check usage limit
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
    }

    // Check minimum order amount
    if (coupon.minOrderAmount > 0 && finalCartTotal < coupon.minOrderAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum order amount ₹${coupon.minOrderAmount} required` 
      });
    }

    // Calculate discount
    let discountAmount = 0;
    let discountType = coupon.type;

    switch (coupon.type) {
      case 'percentage':
        discountAmount = (finalCartTotal * coupon.value) / 100;
        // Cap percentage discount if needed
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
        break;
        
      case 'fixed':
        discountAmount = Math.min(coupon.value, finalCartTotal); // Don't exceed cart total
        break;
        
      case 'free_shipping':
        discountAmount = shippingCost;
        discountType = 'free_shipping';
        break;
        
      default:
        discountAmount = 0;
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;
    const newTotal = Math.max(0, finalCartTotal - discountAmount);

    res.json({
      success: true,
      code: coupon.code,
      type: discountType,
      value: coupon.value,
      discountAmount: discountAmount,
      newTotal: newTotal,
      message: `Coupon applied successfully! You saved ₹${discountAmount}`,
    });

  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};