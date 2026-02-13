const mongoose = require('mongoose');


const categorySchema = new mongoose.Schema({
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});



module.exports = mongoose.model('Category', categorySchema);
