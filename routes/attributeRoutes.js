const express = require('express');
const router = express.Router();

const {
  getAllAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute
} = require('../controllers/attributeController');

const { authorizationUser } = require('../middleware/authMiddleware');

router.get('/all', authorizationUser, getAllAttributes);
router.post('/create', authorizationUser, createAttribute);
router.put('/update/:id', authorizationUser, updateAttribute);
router.delete('/delete/:id', authorizationUser, deleteAttribute);

module.exports = router;
