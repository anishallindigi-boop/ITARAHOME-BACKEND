const express = require('express');
const router = express.Router();
const { getAllCategories,getBlogCategoryById,updateStatus,createBlogCategory,updateBlogCategory,deleteBlogCategory
} = require('../controllers/blogcategoryController');

const { authorizationUser,
    authorizationRoles } = require('../middleware/authMiddleware');


router.route('/create-category').post(
    authorizationUser,authorizationRoles('admin'),
    createBlogCategory);
router.route('/get-all-category').get(getAllCategories);
router.route('/delete-category/:id').delete(
    authorizationUser,authorizationRoles('admin'),
    deleteBlogCategory)
router.route('/update-category/:id').patch(
    authorizationUser,authorizationRoles('admin'),
    updateBlogCategory)
router.route('/get-single-category/:id').get(
    authorizationUser,authorizationRoles('admin'),
    getBlogCategoryById);
    router.post('/update-status/:id', authorizationUser, authorizationRoles('admin'), updateStatus);

module.exports=router