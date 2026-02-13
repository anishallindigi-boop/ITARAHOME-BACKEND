const mongoose = require('mongoose');
const slugify = require('slugify');

const blogSchema = new mongoose.Schema(
  {
    metatitle: String,
    metadescription: String,
    metakeywords: String,

    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    image: {
      type: String,
      required: true,
    },

    category: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BlogCategory',
      },
    ],


  status:{
    type:String,
    enum:["draft","published"],
    default:"draft"
},
  isActive: {
    type: Boolean,
    default: true,
  },

    slug: {
      type: String,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model('Blog', blogSchema);
