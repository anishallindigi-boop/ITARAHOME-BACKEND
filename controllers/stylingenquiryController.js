const StylingEnquiry = require('../models/StylingEnquiry');

/**
 * CREATE STYLING ENQUIRY
 */
exports.createStylingEnquiry = async (
  req,
  res
) => {
  try {
    const enquiry = await StylingEnquiry.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Styling consultation enquiry submitted successfully',
    enquiry,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Something went wrong',
    });
  }
};

/**
 * GET ALL ENQUIRIES (Admin)
 */
exports.getAllStylingEnquiries = async (
  req,
  res
) => {
  try {
    const enquiries = await StylingEnquiry.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
   enquiries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET SINGLE ENQUIRY
 */
exports.getStylingEnquiryById = async (
  req,
  res
) => {
  try {
    const enquiry = await StylingEnquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found',
      });
    }

    res.status(200).json({
      success: true,
      data: enquiry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};