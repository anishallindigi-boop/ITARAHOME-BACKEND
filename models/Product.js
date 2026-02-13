const mongoose = require('mongoose');

/* ---------- REVIEW ---------- */
const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    verifiedPurchase: {
      type: Boolean,
      default: false,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    notHelpful: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    response: {
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      message: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      respondedAt: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

/* ---------- ATTRIBUTE VALUE (for Color/Image swatches) ---------- */
const attributeValueSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
      default: null
    },
    image: {
      type: String,
      trim: true,
      default: null
    },
  },
  { _id: false }
);

/* ---------- ATTRIBUTE ---------- */
const attributeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'color', 'image'],
      default: 'text',
      required: true,
    },
    values: {
      type: [attributeValueSchema],
      required: true,
      default: [],
    },
  },
  { _id: false }
);

/* ---------- VARIATION ---------- */
const variationSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      trim: true,
    },
    attributes: {
      type: Map,
      of: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
      default: 0
    },
    stock: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      default: null
    },
  },
  { _id: true }
);

/* ---------- PRODUCT ---------- */
const productSchema = new mongoose.Schema(
  {
    metatitle: {
      type: String,
      trim: true,
    },
    metadescription: {
      type: String,
      trim: true,
    },
    metakeywords: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    categoryid: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    }],
    subcategoryid: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubCategory',
    }],
    content: {
      type: String,
    },
    price: {
      type: Number,
      default: 0
    },
    discountPrice: {
      type: Number,
      default: 0
    },
    stock: {
      type: Number,
      default: 0,
    },
    soldCount: {
      type: Number,
      default: 0
    },
    
    /* ---------- DIMENSIONS & WEIGHT (Main Product Only) ---------- */
    dimensions: {
      length: {
        type: Number,
        default: 0,
        min: 0,
      },
      width: {
        type: Number,
        default: 0,
        min: 0,
      },
      height: {
        type: Number,
        default: 0,
        min: 0,
      },
      unit: {
        type: String,
        enum: ['cm'],
        default: 'cm',
      },
    },
    weight: {
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
      unit: {
        type: String,
        enum: ['kg'],
        default: 'kg',
      },
    },
    
    /* ---------- REVIEWS ---------- */
    reviews: {
      type: [reviewSchema],
      default: [],
    },
    
    /* ---------- RATING STATISTICS ---------- */
    ratingStats: {
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
      ratingCounts: {
        1: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        5: { type: Number, default: 0 },
      },
    },
    
    mainImage: {
      type: String,
      required: true,
    },
    gallery: {
      type: [String],
      default: [],
    },
    attributes: {
      type: [attributeSchema],
      default: [],
    },
    variations: {
      type: [variationSchema],
      default: [],
    },
    slug: {
      type: String,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/* ---------- VIRTUALS ---------- */

/// Virtual for total stock (main + variations)
productSchema.virtual('totalStock').get(function() {
  if (this.variations && this.variations.length > 0) {
    return this.variations.reduce((sum, v) => sum + (v.stock || 0), 0);
  }
  return this.stock || 0;
});

// Virtual for calculated volume
productSchema.virtual('dimensions.volume').get(function() {
  if (!this.dimensions) return 0;
  
  const { length = 0, width = 0, height = 0, unit } = this.dimensions;
  
  // Convert to cm³ for consistent calculation
  let multiplier = 1;
  switch (unit) {
    case 'mm': multiplier = 0.001; break;
    case 'inch': multiplier = 16.3871; break; // 1 inch³ = 16.3871 cm³
    case 'm': multiplier = 1000000; break; // 1 m³ = 1,000,000 cm³
    default: multiplier = 1; // cm
  }
  
  return length * width * height * multiplier;
});

// Virtual for weight in grams
productSchema.virtual('weight.inGrams').get(function() {
  if (!this.weight) return 0;
  
  const { value = 0, unit } = this.weight;
  
  switch (unit) {
    case 'kg': return value * 1000;
    case 'lb': return value * 453.592;
    case 'oz': return value * 28.3495;
    default: return value; // grams
  }
});

/* ---------- METHODS ---------- */

// Method to check if product is in stock
productSchema.methods.isInStock = function(variationId = null) {
  if (variationId && this.variations) {
    const variation = this.variations.find(v => v._id.toString() === variationId.toString());
    return variation ? variation.stock > 0 : false;
  }
  return this.totalStock > 0;
};

// Method to decrease stock
productSchema.methods.decreaseStock = async function(quantity, variationId = null) {
  if (variationId && this.variations) {
    const variationIndex = this.variations.findIndex(v => v._id.toString() === variationId.toString());
    if (variationIndex === -1) throw new Error('Variation not found');
    
    if (this.variations[variationIndex].stock < quantity) {
      throw new Error('Insufficient stock for variation');
    }
    
    this.variations[variationIndex].stock -= quantity;
  } else {
    if (this.stock < quantity) {
      throw new Error('Insufficient stock');
    }
    this.stock -= quantity;
  }
  
  this.soldCount += quantity;
  return this.save();
};

// Method to increase stock (for cancellations/returns)
productSchema.methods.increaseStock = async function(quantity, variationId = null) {
  if (variationId && this.variations) {
    const variationIndex = this.variations.findIndex(v => v._id.toString() === variationId.toString());
    if (variationIndex !== -1) {
      this.variations[variationIndex].stock += quantity;
    }
  } else {
    this.stock += quantity;
  }
  
  return this.save();
};

// Method to add a review
productSchema.methods.addReview = async function(reviewData) {
  const review = {
    ...reviewData,
    status: 'pending', // Default to pending for admin approval
  };
  
  this.reviews.push(review);
  await this.save();
  
  // Update rating stats when review is approved (can be done via admin panel)
  return review;
};

// Method to approve/reject review
productSchema.methods.updateReviewStatus = async function(reviewId, status, adminId = null) {
  const reviewIndex = this.reviews.findIndex(r => r._id.toString() === reviewId);
  
  if (reviewIndex === -1) {
    throw new Error('Review not found');
  }
  
  const oldStatus = this.reviews[reviewIndex].status;
  const oldRating = this.reviews[reviewIndex].rating;
  
  this.reviews[reviewIndex].status = status;
  
  // If admin provided a response
  if (adminId && status === 'approved') {
    this.reviews[reviewIndex].response = {
      adminId,
      respondedAt: new Date(),
    };
  }
  
  // Update rating statistics
  if (oldStatus === 'approved' && status !== 'approved') {
    // Remove from stats
    this.ratingStats.totalReviews -= 1;
    this.ratingStats.ratingCounts[oldRating] -= 1;
  } else if (oldStatus !== 'approved' && status === 'approved') {
    // Add to stats
    this.ratingStats.totalReviews += 1;
    this.ratingStats.ratingCounts[this.reviews[reviewIndex].rating] += 1;
  } else if (oldStatus === 'approved' && status === 'approved') {
    // Rating changed on existing approved review
    if (oldRating !== this.reviews[reviewIndex].rating) {
      this.ratingStats.ratingCounts[oldRating] -= 1;
      this.ratingStats.ratingCounts[this.reviews[reviewIndex].rating] += 1;
    }
  }
  
  // Recalculate average rating
  if (this.ratingStats.totalReviews > 0) {
    let total = 0;
    let count = 0;
    
    for (let i = 1; i <= 5; i++) {
      total += i * this.ratingStats.ratingCounts[i];
      count += this.ratingStats.ratingCounts[i];
    }
    
    this.ratingStats.averageRating = count > 0 ? total / count : 0;
  } else {
    this.ratingStats.averageRating = 0;
  }
  
  return this.save();
};

// Method to mark review as helpful/not helpful
productSchema.methods.markReviewHelpful = async function(reviewId, helpful = true) {
  const reviewIndex = this.reviews.findIndex(r => r._id.toString() === reviewId);
  
  if (reviewIndex === -1) {
    throw new Error('Review not found');
  }
  
  if (helpful) {
    this.reviews[reviewIndex].helpful += 1;
  } else {
    this.reviews[reviewIndex].notHelpful += 1;
  }
  
  return this.save();
};

// Method to get approved reviews only
productSchema.methods.getApprovedReviews = function() {
  return this.reviews.filter(review => review.status === 'approved');
};

/* ---------- MIDDLEWARE ---------- */

// SKU Generation
productSchema.pre('validate', function(next) {
  try {
    const hasAttributes = this.attributes && Array.isArray(this.attributes) && this.attributes.length > 0;
    const hasVariations = this.variations && Array.isArray(this.variations) && this.variations.length > 0;

    if (!hasAttributes && !hasVariations) {
      if (!this.sku) {
        this.sku = `PROD-${this.slug || Date.now()}`;
      }
    }

    if (hasAttributes || hasVariations) {
      this.sku = undefined;
      
      if (hasVariations) {
        this.variations.forEach((variation, index) => {
          if (!variation.sku) {
            variation.sku = `${this.slug || 'VAR'}-${index + 1}`;
          }
        });
      }
    }
    
    if (typeof next === 'function') {
      next();
    }
  } catch (error) {
    if (typeof next === 'function') {
      next(error);
    } else {
      throw error;
    }
  }
});

// Validate variations match attributes
productSchema.pre('save', function(next) {
  try {
    if (this.variations && Array.isArray(this.variations) && this.variations.length > 0) {
      const attributeNames = this.attributes.map(attr => attr.name);
      
      for (const variation of this.variations) {
        let variationAttrs = {};
        
        if (variation.attributes instanceof Map) {
          variationAttrs = Object.fromEntries(variation.attributes);
        } else if (typeof variation.attributes === 'object') {
          variationAttrs = variation.attributes;
        }
        
        const attrKeys = Object.keys(variationAttrs);
        
        for (const attrName of attrKeys) {
          if (!attributeNames.includes(attrName)) {
            const error = new Error(`Variation uses invalid attribute: ${attrName}`);
            if (typeof next === 'function') {
              return next(error);
            }
            throw error;
          }
          
          const attr = this.attributes.find(a => a.name === attrName);
          const attrValue = variationAttrs[attrName];
          
          if (attr && Array.isArray(attr.values)) {
            const valueExists = attr.values.find(v => v.value === attrValue);
            if (!valueExists) {
              const error = new Error(`Invalid value "${attrValue}" for attribute "${attrName}"`);
              if (typeof next === 'function') {
                return next(error);
              }
              throw error;
            }
          }
        }
      }
    }
    
    if (typeof next === 'function') {
      next();
    }
  } catch (error) {
    if (typeof next === 'function') {
      next(error);
    } else {
      throw error;
    }
  }
});

// Ensure variation SKUs are unique
productSchema.post('validate', function(doc) {
  if (doc.variations && doc.variations.length > 0) {
    const skus = doc.variations.map(v => v.sku).filter(Boolean);
    const uniqueSkus = [...new Set(skus)];
    if (skus.length !== uniqueSkus.length) {
      throw new Error('Variation SKUs must be unique');
    }
  }
});

// Indexes for better query performance
productSchema.index({ slug: 1 });
productSchema.index({ categoryid: 1 });
productSchema.index({ subcategoryid: 1 });
productSchema.index({ status: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ 'ratingStats.averageRating': -1 });
productSchema.index({ 'reviews.status': 1 });
productSchema.index({ 'reviews.userId': 1 });

module.exports = mongoose.model('Product', productSchema);