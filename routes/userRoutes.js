const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const {authorizationRoles,authorizationUser} = require('../middleware/authMiddleware'); // Your JWT middleware

router.post('/register', userController.register);
router.post('/send-otp', userController.sendOTP);
router.post('/verify-otp', userController.verifyOTP);
router.get('/profile', authorizationUser, userController.getProfile);
router.put('/update/profile', authorizationUser, userController.updateProfile);
router.post('/logout', authorizationUser, userController.logout);

module.exports = router;