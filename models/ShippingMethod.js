const mongoose=require("mongoose")

const ShippingMethodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    estimatedDays: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShippingMethod', ShippingMethodSchema);