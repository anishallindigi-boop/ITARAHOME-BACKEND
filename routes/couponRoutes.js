const express = require('express');
const {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  updateCouponStatus
} = require('../controllers/couponController');
const {authorizationRoles,authorizationUser} = require('../middleware/authMiddleware'); // Your JWT middleware

const router = express.Router();

// Admin routes
router.post('/create', authorizationUser, authorizationRoles('admin'), createCoupon);             // POST /api/coupons
router.get('/get', authorizationUser, authorizationRoles('admin'), getAllCoupons);             // GET /api/coupons?status=active&page=1
router.get('/get/:id', authorizationUser, authorizationRoles('admin'), getCouponById);          // GET /api/coupons/:id
router.put('/update/:id', authorizationUser, authorizationRoles('admin'), updateCoupon);           // PUT /api/coupons/:id
router.delete('/delete/:id', authorizationUser, authorizationRoles('admin'), deleteCoupon);   
     // DELETE /api/coupons/:id (soft delete)

// PATCH /api/coupons/:id  → partial update (including status toggle)
router.patch('/status/:id', authorizationUser, authorizationRoles('admin'), updateCouponStatus);

// User route
router.post('/apply', authorizationUser, applyCoupon);                // POST /api/coupons/apply { code: 'ANISH30' }

module.exports = router;