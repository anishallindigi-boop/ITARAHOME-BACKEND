const mongoose=require("mongoose")

const AttributeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true }, // color, size, etc
    values: [{ type: String, required: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attribute', AttributeSchema);