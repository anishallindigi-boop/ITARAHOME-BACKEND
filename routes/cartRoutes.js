const express = require('express');
const router = express.Router();

const {
  getCart,
  addToCart,
  updateCartItem,
  removeItem,
  clearCart
} = require('../controllers/cartController');
const { authorizationUser } = require('../middleware/authMiddleware');

router.get('/get',authorizationUser, getCart);
router.post('/add',authorizationUser, addToCart);
router.put('/update/:id',authorizationUser, updateCartItem);
router.delete('/remove/:id',authorizationUser, removeItem);
router.delete('/clear',authorizationUser, clearCart);

module.exports = router;
