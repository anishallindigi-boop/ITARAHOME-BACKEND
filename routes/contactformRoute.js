const express = require('express');
const router = express.Router();
const {createContactForm,getContactForm} = require('../controllers/contactformController');
const {authorizationRoles,authorizationUser} = require('../middleware/authMiddleware'); // Your JWT middleware


router.route('/create').post(createContactForm);
router.route('/get').get(authorizationUser,authorizationRoles("admin"),getContactForm);

module.exports=router