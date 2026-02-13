const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    addedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Unique index: one product per wishlist (or per user if single list)
wishlistSchema.index({ user: 1, 'products.product': 1 }, { unique: true }); 
// Or if multiple lists: { user: 1, name: 1, 'products.product': 1 }

module.exports = mongoose.model('Wishlist', wishlistSchema);