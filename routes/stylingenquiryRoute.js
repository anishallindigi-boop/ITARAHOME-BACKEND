const express = require('express');
const router = express.Router();
const { createStylingEnquiry,getAllStylingEnquiries,getStylingEnquiryById } = require('../controllers/stylingenquiryController');

const { authorizationUser,
    authorizationRoles } = require('../middleware/authMiddleware');


    router.route('/create').post(
        createStylingEnquiry);
router.route('/get-all').get(authorizationUser,authorizationRoles('admin'),getAllStylingEnquiries);
router.route('/get-one/:id').get(authorizationUser,authorizationRoles('admin'),getStylingEnquiryById);

module.exports = router;