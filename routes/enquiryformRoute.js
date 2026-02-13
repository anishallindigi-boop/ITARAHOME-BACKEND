const express = require('express');
const router = express.Router();
const { getAllEnquiries,createEnquiry } = require('../controllers/enquiryformController');

const { authorizationUser,
    authorizationRoles } = require('../middleware/authMiddleware');


    router.route('/create').post(
        createEnquiry);
router.route('/get-all').get(authorizationUser,authorizationRoles('admin'),getAllEnquiries);

module.exports = router;