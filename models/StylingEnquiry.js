const mongoose = require('mongoose');

const StylingEnquirySchema = new mongoose.Schema({
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    spaceType: {
      type: String,
    },

    projectType: {
      type: String,
    },

    size: {
      type: String,
    },

    city: {
      type: String,
    },

    stylePreference: {
      type: String,
    },

    budget: {
      type: String,
    },

    includeProducts: {
      type: String,
      enum: ['Yes', 'No'],
    },

    message: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)


module.exports = mongoose.model('StylingEnquiry', StylingEnquirySchema);