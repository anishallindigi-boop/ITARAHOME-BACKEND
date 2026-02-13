// controllers/reviewController.js
const Product = require('../models/Product');
const Order = require('../models/Order');

// Add a review
exports.addReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check if user purchased this product
    const hasPurchased = await Order.exists({
      user: userId,
      'items.product': productId,
      status: 'delivered'
    });

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user already reviewed
    const existingReview = product.reviews.find(
      r => r.userId.toString() === userId.toString()
    );

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Add review
    const reviewData = {
      userId,
      rating,
      title: title || '',
      comment: comment || '',
      verifiedPurchase: !!hasPurchased,
      status: 'pending' // Requires admin approval
    };

    await product.addReview(reviewData);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully and pending approval',
      review: reviewData
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get approved reviews for a product
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;

    const product = await Product.findById(productId)
      .populate('reviews.userId', 'name avatar')
      .populate('reviews.response.adminId', 'name');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let reviews = product.getApprovedReviews();

    // Sort reviews
    switch (sort) {
      case 'newest':
        reviews.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        reviews.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'highest':
        reviews.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        reviews.sort((a, b) => a.rating - b.rating);
        break;
      case 'helpful':
        reviews.sort((a, b) => b.helpful - a.helpful);
        break;
    }

    // Pagination
    const total = reviews.length;
    const startIndex = (page - 1) * limit;
    const paginatedReviews = reviews.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      reviews: paginatedReviews,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      stats: product.ratingStats
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark review as helpful
exports.markHelpful = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;
    const { helpful } = req.body; // true or false

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.markReviewHelpful(reviewId, helpful);

    res.json({ success: true, message: 'Review marked as helpful' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Approve/reject review
exports.updateReviewStatus = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;
    const { status, responseMessage } = req.body;
    const adminId = req.user._id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.updateReviewStatus(reviewId, status, adminId);

    // Add admin response if provided
    if (responseMessage) {
      const review = product.reviews.id(reviewId);
      if (review) {
        review.response.message = responseMessage;
        review.response.respondedAt = new Date();
        await product.save();
      }
    }

    res.json({ success: true, message: `Review ${status} successfully` });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get all pending reviews
exports.getPendingReviews = async (req, res) => {
  try {
    const products = await Product.find({ 'reviews.status': 'pending' })
      .populate('reviews.userId', 'name email')
      .select('name slug reviews');

    const pendingReviews = products.flatMap(product => 
      product.reviews
        .filter(r => r.status === 'pending')
        .map(r => ({
          ...r.toObject(),
          productId: product._id,
          productName: product.name,
          productSlug: product.slug
        }))
    );

    res.json({
      success: true,
      count: pendingReviews.length,
      reviews: pendingReviews
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




// Admin: Get all reviews with filtering
exports.getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all', search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let matchQuery = {};
    
    if (status !== 'all') {
      matchQuery['reviews.status'] = status;
    }

    // Aggregation pipeline to get all reviews with product info
    const pipeline = [
      { $unwind: '$reviews' },
      
      // Apply status filter if not 'all'
      ...(status !== 'all' ? [{ $match: { 'reviews.status': status } }] : []),
      
      // Lookup user info for each review
      {
        $lookup: {
          from: 'users',
          localField: 'reviews.userId',
          foreignField: '_id',
          as: 'reviewUser'
        }
      },
      { $unwind: '$reviewUser' },
      
      // Lookup admin response if exists
      {
        $lookup: {
          from: 'users',
          localField: 'reviews.response.adminId',
          foreignField: '_id',
          as: 'adminUser'
        }
      },
      { $unwind: { path: '$adminUser', preserveNullAndEmptyArrays: true } },
      
      // Project the fields we need
      {
        $project: {
          _id: '$reviews._id',
          userId: {
            _id: '$reviewUser._id',
            name: '$reviewUser.name',
            avatar: '$reviewUser.avatar'
          },
          rating: '$reviews.rating',
          title: '$reviews.title',
          comment: '$reviews.comment',
          verifiedPurchase: '$reviews.verifiedPurchase',
          helpful: '$reviews.helpful',
          notHelpful: '$reviews.notHelpful',
          status: '$reviews.status',
          response: {
            $cond: {
              if: { $gt: ['$reviews.response', null] },
              then: {
                adminId: {
                  _id: '$adminUser._id',
                  name: '$adminUser.name'
                },
                message: '$reviews.response.message',
                respondedAt: '$reviews.response.respondedAt'
              },
              else: null
            }
          },
          createdAt: '$reviews.createdAt',
          updatedAt: '$reviews.updatedAt',
          productId: '$_id',
          productName: '$name',
          productSlug: '$slug'
        }
      },
      
      // Apply search filter if provided
      ...(search ? [{
        $match: {
          $or: [
            { 'userId.name': { $regex: search, $options: 'i' } },
            { productName: { $regex: search, $options: 'i' } },
            { comment: { $regex: search, $options: 'i' } }
          ]
        }
      }] : []),
      
      // Sort by newest first
      { $sort: { createdAt: -1 } },
      
      // Pagination
      { $skip: skip },
      { $limit: parseInt(limit) }
    ];

    // Count total matching reviews
    const countPipeline = [
      { $unwind: '$reviews' },
      ...(status !== 'all' ? [{ $match: { 'reviews.status': status } }] : []),
      ...(search ? [{
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } }
          ]
        }
      }] : []),
      { $count: 'total' }
    ];

    const [reviews, countResult] = await Promise.all([
      Product.aggregate(pipeline),
      Product.aggregate(countPipeline)
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    res.json({
      success: true,
      reviews,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get reviews by status
exports.getReviewsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Use the same pipeline as getAllReviews but with status filter
    const pipeline = [
      { $unwind: '$reviews' },
      { $match: { 'reviews.status': status } },
      
      // Lookup user info
      {
        $lookup: {
          from: 'users',
          localField: 'reviews.userId',
          foreignField: '_id',
          as: 'reviewUser'
        }
      },
      { $unwind: '$reviewUser' },
      
      // Lookup admin response
      {
        $lookup: {
          from: 'users',
          localField: 'reviews.response.adminId',
          foreignField: '_id',
          as: 'adminUser'
        }
      },
      { $unwind: { path: '$adminUser', preserveNullAndEmptyArrays: true } },
      
      // Project
      {
        $project: {
          _id: '$reviews._id',
          userId: {
            _id: '$reviewUser._id',
            name: '$reviewUser.name',
            avatar: '$reviewUser.avatar'
          },
          rating: '$reviews.rating',
          title: '$reviews.title',
          comment: '$reviews.comment',
          verifiedPurchase: '$reviews.verifiedPurchase',
          helpful: '$reviews.helpful',
          notHelpful: '$reviews.notHelpful',
          status: '$reviews.status',
          response: {
            $cond: {
              if: { $gt: ['$reviews.response', null] },
              then: {
                adminId: {
                  _id: '$adminUser._id',
                  name: '$adminUser.name'
                },
                message: '$reviews.response.message',
                respondedAt: '$reviews.response.respondedAt'
              },
              else: null
            }
          },
          createdAt: '$reviews.createdAt',
          updatedAt: '$reviews.updatedAt',
          productId: '$_id',
          productName: '$name',
          productSlug: '$slug'
        }
      },
      
      // Sort
      { $sort: { createdAt: -1 } },
      
      // Pagination
      { $skip: skip },
      { $limit: parseInt(limit) }
    ];

    const countPipeline = [
      { $unwind: '$reviews' },
      { $match: { 'reviews.status': status } },
      { $count: 'total' }
    ];

    const [reviews, countResult] = await Promise.all([
      Product.aggregate(pipeline),
      Product.aggregate(countPipeline)
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    res.json({
      success: true,
      reviews,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};