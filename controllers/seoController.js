const Seo = require("../models/Seo");

/**
 * CREATE SEO
 * POST /api/seo
 */
exports.createSeo = async (req, res) => {
  try {
    const { slug } = req.body;

    if (!slug) {
      return res.status(400).json({ message: "Slug is required" });
    }

    const exists = await Seo.findOne({ slug });
    if (exists) {
      return res.status(409).json({ message: "SEO already exists for this slug" });
    }

    const seo = await Seo.create(req.body);

    res.status(201).json({
      success: true,
      data: seo,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



exports.getAllSeo = async (req, res) => {
  try {
    const seoList = await Seo.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: seoList.length,
      data: seoList,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/**
 * GET SEO BY SLUG
 * GET /api/seo?slug=/about
 */
exports.getSeoBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    console.log(req.params,"paa")

    if (!slug) {
      return res.status(400).json({ message: "Slug is required" });
    }

    const seo = await Seo.findOne({ slug });

    if (!seo) {
      return res.status(404).json({ message: "SEO not found" });
    }

    res.status(200).json({
      success: true,
      data: seo,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * UPDATE SEO BY SLUG
 * PUT /api/seo/:slug
 */
exports.updateSeo = async (req, res) => {
  try {
    const { id} = req.params;
// console.log(req.body,"uodate",id);

    const seo = await Seo.findByIdAndUpdate(
       id,
      req.body,
      { new: true }
    );

    if (!seo) {
      return res.status(404).json({ message: "SEO not found" });
    }

    res.status(200).json({
      success: true,
      data: seo,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE SEO BY SLUG
 * DELETE /api/seo/:slug
 */
exports.deleteSeo = async (req, res) => {
  try {
    const { slug } = req.params;

    const seo = await Seo.findOneAndDelete({ slug });

    if (!seo) {
      return res.status(404).json({ message: "SEO not found" });
    }

    res.status(200).json({
      success: true,
      message: "SEO deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
