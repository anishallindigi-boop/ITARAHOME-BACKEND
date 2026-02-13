// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// // Upload directory (absolute path)
// const uploadDir = path.join(__dirname, "../uploads");

// // Ensure folder exists
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// // Multer storage configuration
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     console.log(file,"file");
//     // console.log(req,"req");
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     // Use original name, sanitized (fixes broken characters)
//     const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_\s]/g, "_");
//     cb(null, safeName);
//   },
// });

// const upload = multer({ storage });

// module.exports = { upload };



const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Configure storage for different upload types
const createStorage = (uploadType) => multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, `../../uploads/${uploadType}`);
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uploadType}_${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed'));
  }
};

// Image processing function
const processImage = async (file) => {
  const inputPath = file.path;
  const outputDir = path.dirname(inputPath);
  const filename = path.basename(file.filename, path.extname(file.filename));
  
  const sizes = [
    { suffix: 'large', width: 1200, height: 1200 },
    { suffix: 'medium', width: 600, height: 600 },
    { suffix: 'small', width: 300, height: 300 },
    { suffix: 'thumbnail', width: 150, height: 150 }
  ];

  const processedImages = [];

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `${filename}_${size.suffix}.jpg`);
    
    try {
      await sharp(inputPath)
        .resize(size.width, size.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toFile(outputPath);
      
      processedImages.push({
        size: size.suffix,
        url: `/uploads/products${outputPath.split('/uploads/products')[1]}`,
        width: size.width,
        height: size.height
      });
    } catch (error) {
      console.error(`Error processing image size ${size.suffix}:`, error);
    }
  }

  return processedImages;
};

// Upload configurations
const uploadConfigs = {
  'product-image': {
    storage: createStorage('products'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFileFilter
  },
  'product-images': {
    storage: createStorage('products'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
    fileFilter: imageFileFilter
  },
  'variation-image': {
    storage: createStorage('variations'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFileFilter
  },
  'gallery-images': {
    storage: createStorage('gallery'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
    fileFilter: imageFileFilter
  }
};

// Create upload middleware
const createUploadMiddleware = (uploadType, multiple = false, maxCount = 10) => {
  const config = uploadConfigs[uploadType];
  if (!config) {
    throw new Error(`Unknown upload type: ${uploadType}`);
  }

  const multerInstance = multer(config);
  
  return async (req, res, next) => {
    const uploadMethod = multiple ? 'array' : 'single';
    const fieldName = multiple ? 'images' : 'image';
    
    multerInstance[uploadMethod](fieldName, maxCount)(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              success: false,
              error: 'File too large. Maximum size is 5MB.' 
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
              success: false,
              error: `Too many files. Maximum ${maxCount} files allowed.` 
            });
          }
        }
        return res.status(400).json({ 
          success: false,
          error: err.message 
        });
      }

      try {
        // Process uploaded images
        if (req.file) {
          // Single file
          const processedImages = await processImage(req.file);
          req.uploadedImages = [{
            original: `/uploads/products/${req.file.filename}`,
            processed: processedImages
          }];
        } else if (req.files && req.files.length > 0) {
          // Multiple files
          req.uploadedImages = [];
          for (const file of req.files) {
            const processedImages = await processImage(file);
            req.uploadedImages.push({
              original: `/uploads/products/${file.filename}`,
              processed: processedImages
            });
          }
        }

        next();
      } catch (error) {
        console.error('Image processing error:', error);
        res.status(500).json({ 
          success: false,
          error: 'Image processing failed' 
        });
      }
    });
  };
};

module.exports = { createUploadMiddleware, processImage };