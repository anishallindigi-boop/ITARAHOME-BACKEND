const express = require('express');
const router = express.Router();

const {
  getAllShippingMethods,
  getShippingMethodById,
  createShippingMethod,
  updateShippingMethod,
  deleteShippingMethod
} = require('../controllers/shippingMethodController');

const { authorizationUser } = require('../middleware/authMiddleware');

router.get('/all', getAllShippingMethods);
router.get('/get/:id', getShippingMethodById);

router.post('/create', createShippingMethod);
router.put('/update/:id', authorizationUser, updateShippingMethod);
router.delete('/delete/:id', authorizationUser, deleteShippingMethod);

module.exports = router;
