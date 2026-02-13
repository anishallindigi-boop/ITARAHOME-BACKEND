// const fs = require('fs');
// const path = require('path');

// exports.uploadImages = async (req, res) => {
//   try {
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ message: 'No images uploaded' });
//     }

//     const images = req.files.map(file => ({
//       filename: file.filename,
//       url: `/uploads/${file.filename}`,
//     }));

//     res.status(201).json({ message: 'Images uploaded successfully', images });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.getImages = async (req, res) => {
//   try {
//     const dirPath = path.join(__dirname, '../uploads');
//     const files = fs.readdirSync(dirPath);

//     const images = files.map(file => ({
//       filename: file,
//       url: `/uploads/${file}`,
//     }));

//     res.status(200).json(images);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.deleteImage = async (req, res) => {
//   try {
//     const { filename } = req.params;
//     const filePath = path.join(__dirname, '../uploads', filename);

//     if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Image not found' });

//     fs.unlinkSync(filePath);
//     res.status(200).json({ message: 'Image deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };




// controllers/imageController.js
const cloudinary = require('../config/cloudinary'); // Import configured instance from your config

// REMOVE: const cloudinary = require('cloudinary').v2; ❌ Don't import from npm here
// REMOVE: configureCloudinary() ❌ Don't call this

exports.uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: process.env.CLOUDINARY_FOLDER || 'uploads',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve({
              filename: result.public_id,
              url: result.secure_url,
              format: result.format,
              bytes: result.bytes,
              width: result.width,
              height: result.height,
            });
          }
        ).end(file.buffer);
      });
    });

    const images = await Promise.all(uploadPromises);
    res.status(201).json({ success: true, message: 'Images uploaded successfully', images });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getImages = async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: process.env.CLOUDINARY_FOLDER || 'uploads',
      max_results: 500,
    });

    const images = result.resources.map(resource => ({
      filename: resource.public_id,
      url: resource.secure_url,
      format: resource.format,
      bytes: resource.bytes,
      width: resource.width,
      height: resource.height,
      createdAt: resource.created_at,
    }));

    res.status(200).json({ success: true, images });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteImage = async (req, res) => {
  try {
    // Decode the URL-encoded filename
    const filename = decodeURIComponent(req.params.filename);
    console.log('Deleting:', filename); // Should show "itarahome/dgyigv0d1hfa8zjbiats"
    
    const result = await cloudinary.uploader.destroy(filename);

    if (result.result === 'ok') {
      res.status(200).json({ success: true, message: 'Image deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Image not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};