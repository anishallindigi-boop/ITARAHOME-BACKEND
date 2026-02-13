const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  uploadImages,
  getImages,
  deleteImage,
} = require('../controllers/imageController');

// Upload multiple images
router.post('/upload', upload.array('images', 10), uploadImages);

// Get all images (for modal gallery)
router.get('/all', getImages);

// Delete image
router.delete('/:filename', deleteImage);

module.exports = router;
