const mongoose = require('mongoose');


const blogcategorySchema = new mongoose.Schema({
  metatitle: {
    type: String,
  },
  metadescription: {
    type: String,
  },
  metakeywords: {
    type: String,
  },
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
       slug: {
    type: String,
    unique: true,
  },
  status:{
    type:String,
    enum:["draft","published"],
    default:"draft"
},
  isActive: {
    type: Boolean,
    default: true,
  },

},{timestamps:true});



module.exports = mongoose.model('BlogCategory', blogcategorySchema);
