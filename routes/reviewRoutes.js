// routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authorizationUser, authorizationRoles } = require('../middleware/authMiddleware');

// Public routes
router.get('/product/:productId', reviewController.getProductReviews);

// Protected routes
router.post('/product/:productId', authorizationUser, reviewController.addReview);
router.put('/product/:productId/:reviewId/helpful', authorizationUser, reviewController.markHelpful);

// Admin routes
router.get('/admin/pending', authorizationUser, authorizationRoles('admin'), reviewController.getPendingReviews);
router.put('/admin/:productId/:reviewId', authorizationUser, authorizationRoles('admin'), reviewController.updateReviewStatus);

// In your reviewRoutes.js
router.get('/admin/all', authorizationUser, authorizationRoles('admin'), reviewController.getAllReviews);
router.get('/admin/status/:status', authorizationUser, authorizationRoles('admin'), reviewController.getReviewsByStatus);

module.exports = router;