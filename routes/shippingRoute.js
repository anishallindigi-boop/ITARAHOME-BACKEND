const express = require('express');
const router = express.Router();
const { 
    calculateShipping, 
    createShiprocketOrder,
    trackOrder,
    getShippingSettings,
    updateShippingSettings
} = require('../controllers/shippingController');
const { authorizationUser, authorizationRoles } = require('../middleware/authMiddleware');

// ✅ PUBLIC ROUTES (For checkout page)
router.post('/calculate', calculateShipping); // Frontend calls this

// ✅ ADMIN ROUTES
router.post('/create-order/:orderId', authorizationUser, authorizationRoles('admin'), createShiprocketOrder);
router.get('/track/:awbCode', authorizationUser, authorizationRoles('admin'), trackOrder);
router.get('/settings', authorizationUser, authorizationRoles('admin'), getShippingSettings);
router.post('/settings/update', authorizationUser, authorizationRoles('admin'), updateShippingSettings);

module.exports = router;