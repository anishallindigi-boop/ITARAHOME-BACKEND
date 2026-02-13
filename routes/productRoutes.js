
const express = require('express');
const router = express.Router();
const {
createProduct,getProducts,getAdminProducts,getProductBySlug,getProductById,updateProduct,deleteProduct,updateStatus,getProductsByCategorySlug,filterProducts,searchProducts
} = require('../controllers/productController');
const { authorizationUser, authorizationRoles } = require('../middleware/authMiddleware');

// Routes with image upload
router.post('/create',authorizationUser,authorizationRoles('admin'),createProduct);
router.post('/update/:id',authorizationUser,authorizationRoles('admin'),updateProduct);
router.post('/delete/:id',authorizationUser,authorizationRoles('admin'),deleteProduct);
router.get('/get/:id',authorizationUser,authorizationRoles('admin'),getProductById);
router.get('/getBySlug/:slug',getProductBySlug);
router.get('/getadminproducts',authorizationUser, authorizationRoles('admin'),getAdminProducts)
router.get('/getAll',getProducts);
router.post('/update-status/:id', authorizationUser, authorizationRoles('admin'), updateStatus);

// ✅ GET PRODUCTS BY CATEGORY SLUG
router.get('/category/:slug', getProductsByCategorySlug);
router.post('/filter', filterProducts);
// Quick autocomplete search
router.get('/suggestions', searchProducts);

module.exports = router;