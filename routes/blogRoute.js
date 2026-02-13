const express = require('express');
const router = express.Router();
const { createBlog, getAllBlogs, getBlogById, updateBlog, deleteBlog, getBlogByCategory, getBlogBySlug, updateStatus
} = require('../controllers/blogController');

const { authorizationUser,
    authorizationRoles } = require('../middleware/authMiddleware');


//-------------------------routes-------------------

router.route('/create-blog').post(

    authorizationUser, authorizationRoles('admin'),
    createBlog);
router.route('/all-blogs').get(getAllBlogs);
router.route('/single-blog/:id').get(getBlogById)
router.route('/update-blog/:id').patch(
    authorizationUser, authorizationRoles('admin'),
    // upload.single('images'),
    updateBlog);
router.route('/delete-blog/:id').delete(authorizationUser, authorizationRoles('admin'), deleteBlog)

router.route('/blog-by-category/:id').get(getBlogByCategory)
router.route('/single-slug-blog/:id').get(getBlogBySlug)
router.post('/update-status/:id', authorizationUser, authorizationRoles('admin'), updateStatus);

module.exports = router;


// This is how you can use this router in your app.js file: