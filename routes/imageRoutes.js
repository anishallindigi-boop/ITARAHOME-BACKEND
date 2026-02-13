// const express = require('express');
// const router = express.Router();
// const upload = require('../middleware/upload');
// const { uploadImages, getImages, deleteImage } = require('../controllers/imageController');

// // Upload multiple images
// router.post('/upload', upload.array('images', 10), uploadImages);

// // Get all images
// router.get('/all', getImages);

// // Delete image
// router.delete('/:filename', deleteImage);

// module.exports = router;



const express = require('express');
const router = express.Router();
const uploadMemory = require('../middleware/uploadMemory'); // Use memory storage
const { uploadImages, getImages, deleteImage } = require('../controllers/imageController');

// Upload multiple images
router.post('/upload', uploadMemory.array('images', 10), uploadImages);

// Get all images
router.get('/all', getImages);

// Delete image
router.delete('/:filename', deleteImage);

module.exports = router;