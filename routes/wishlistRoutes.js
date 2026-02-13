const express = require('express');
const router = express.Router();

const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} = require('../controllers/wishlistController');
const { authorizationUser,
    authorizationRoles } = require('../middleware/authMiddleware');

router.get('/', authorizationUser, getWishlist);
router.post('/add', authorizationUser, addToWishlist);
router.delete('/remove/:productId', authorizationUser, removeFromWishlist);
router.delete('/clear', authorizationUser, clearWishlist);

module.exports = router;
