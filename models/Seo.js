const mongoose = require("mongoose");

const SeoSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    title: String,
    description: String,
    keywords: String,
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    canonicalUrl: String,
    noIndex: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Seo", SeoSchema);
