const express = require('express');
const router = express.Router();
const {createNewsletter,getNewsletter} = require('../controllers/newsletterController');
const {authorizationRoles,authorizationUser} = require('../middleware/authMiddleware'); // Your JWT middleware

router.route('/create').post(createNewsletter);
router.route('/get').get(authorizationUser,authorizationRoles("admin"),getNewsletter);

module.exports=router