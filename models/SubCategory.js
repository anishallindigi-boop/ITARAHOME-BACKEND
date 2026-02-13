const mongoose = require('mongoose')

const subCategorySchema = new mongoose.Schema({
      metatitle: {
    type: String,
  },
  metadescription: {
    type: String,
  },
  metakeywords: {
    type: String,
  },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true},
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    description: String,
    image: String,
    status: { type: String, enum: ['publish', 'draft'], default: 'draft' },
      isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

}, { timestamps: true });


module.exports = mongoose.model('SubCategory', subCategorySchema);