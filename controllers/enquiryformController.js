const EnquiryForm = require('../models/EnquiryForm');


/* ---------------- CREATE ENQUIRY ---------------- */
exports.createEnquiry = async (req,res) => {
  try {
    const enquiry = await EnquiryForm.create(req.body);

    return res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully',
      enquiry,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit enquiry',
    });
  }
};

/* ---------------- GET ALL ENQUIRIES (ADMIN) ---------------- */
exports.getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await EnquiryForm.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      enquiries,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch enquiries',
    });
  }
};