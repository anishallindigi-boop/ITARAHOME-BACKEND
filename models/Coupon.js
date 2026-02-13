const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [4, 'Code must be at least 4 characters'],
    maxlength: [20, 'Code too long (max 20 chars)'],
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'free_shipping'],
    required: [true, 'Coupon type is required'],
  },
  value: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Value must be positive'],
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: [0, 'Min amount must be positive'],
  },
  maxUses: {
    type: Number,
    default: null,  // null = unlimited
    min: [1, 'Max uses must be at least 1 if set'],
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  validFrom: {
    type: Date,
    default: null,
  },
  validUntil: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  applicableCategories: [{
    type: String,
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// Indexes for performance


module.exports = mongoose.model('Coupon', couponSchema);