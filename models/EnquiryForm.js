const mongoose = require('mongoose');

const enquiryFormSchema = new mongoose.Schema({
     
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    eventType: {
      type: String,
    },

    quantity: {
      type: Number,
    },

    requiredBy: {
      type: Date,
    },

    products: {
      type: String,
    },

    customisation: {
      type: String,
    },

    message: {
      type: String,
    },
  },
  {
    timestamps: true,
  
})


module.exports = mongoose.model('EnquiryForm', enquiryFormSchema);