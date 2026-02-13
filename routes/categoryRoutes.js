const express = require('express');
const router = express.Router();
const {getAllCategories,createCategory,updateCategory,getAdminCategories,deleteCategory,getCategoryById,updateStatus} = require('../controllers/categoryController');
const {authorizationRoles,authorizationUser} = require('../middleware/authMiddleware'); // Your JWT middleware


router.post('/create', authorizationUser,authorizationRoles('admin'),createCategory);
router.get('/all', getAllCategories);
router.get('/getadmin', authorizationUser, authorizationRoles('admin'), getAdminCategories);
router.get('/get-single-category/:id', getCategoryById);
router.patch('/update/:id', authorizationUser, authorizationRoles('admin'), updateCategory);
router.delete('/delete/:id', authorizationUser,authorizationRoles('admin'), deleteCategory);
router.post('/update-status/:id', authorizationUser, authorizationRoles('admin'), updateStatus);

module.exports = router