const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variationId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      // DO NOT use ref: "Product.variations" → it doesn't exist!
      // Just store the _id, we'll populate manually
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { timestamps: true }
);

// Unique index: one cart entry per user + product + variation combo
CartItemSchema.index({ user: 1, productId: 1, variationId: 1 }, { unique: true });

module.exports = mongoose.model("CartItem", CartItemSchema);