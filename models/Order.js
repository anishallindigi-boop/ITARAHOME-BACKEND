const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, required: true, index: true },
    
    // Order Status
    status: {
      type: String,
      enum: [
        "pending_payment",      // Order created, awaiting payment
        "payment_initiated",    // Payment session created
        "order_success",        // Payment successful, order confirmed
        "processing",           // Being prepared
        "shipped",              // Shipped
        "delivered",            // Delivered
        "cancelled",            // Cancelled
        "refunded"              // Refunded
      ],
      default: "pending_payment",
      index: true
    },

    // Customer Details
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    customerEmail: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    
    // Addresses
    shippingAddress: {
      addressLine1: { type: String, required: true },
      addressLine2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true, index: true },
      country: { type: String, default: "India" }
    },
    billingAddress: {
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },

    // Shipping Details
    shippingMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "ShippingMethod" },
    shippingCost: { type: Number, default: 0 },
    
    // Pricing
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true, index: true },
    notes: String,

    // Coupon Details
    couponCode: { type: String, default: null, index: true },
    couponDetails: {
      code: String,
      type: { type: String, enum: ['percentage', 'fixed', 'free_shipping'] },
      value: Number,
      discountAmount: Number
    },

    // Order Items
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        productVariationId: { type: mongoose.Schema.Types.ObjectId, default: null },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        originalPrice: { type: Number },
        name: String,
        image: String,
        attributes: { type: Map, of: String },
        sku: String,
        _id: false
      }
    ],

    // Inventory Management
    inventoryUpdated: { type: Boolean, default: false },
    inventoryUpdatedAt: { type: Date },
    inventoryRestoredAt: { type: Date },
    
    // ========== HDFC PAYMENT GATEWAY INTEGRATION ==========
    payment: {
      status: {
        type: String,
        enum: [
          'pending', 'initiated', 'processing', 'charged',
          'pending_vbv', 'authentication_failed', 'authorization_failed',
          'failed', 'refunded', 'partially_refunded'
        ],
        default: 'pending',
        index: true
      },
      method: {
        type: String,
        enum: ['card', 'netbanking', 'upi', 'wallet', 'emi', null],
        default: null
      },
      sessionId: { type: String, default: null, index: true },
      orderId: { type: String, default: null, index: true },
      txnId: { type: String, default: null, index: true },
      txnUuid: { type: String, default: null },
      gatewayReferenceId: { type: String, default: null },
      initiatedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      failedAt: { type: Date, default: null },
      paymentUrl: { type: String, default: null },
      cardDetails: {
        last4: String,
        cardType: String,
        cardBrand: String,
        expiryMonth: String,
        expiryYear: String
      },
      bankDetails: {
        bankName: String,
        bankCode: String,
        accountType: String
      },
      upiDetails: {
        vpa: String,
        rrn: String
      },
      errorCode: String,
      errorMessage: String,
      errorDescription: String,
      refunds: [{
        refundId: String,
        amount: Number,
        status: {
          type: String,
          enum: ['initiated', 'processing', 'completed', 'failed']
        },
        reason: String,
        initiatedAt: Date,
        completedAt: Date,
        failedAt: Date,
        errorMessage: String,
        _id: false
      }],
      totalRefunded: { type: Number, default: 0 },
      gatewayResponse: { type: mongoose.Schema.Types.Mixed },
      attemptCount: { type: Number, default: 0 },
      lastAttemptAt: { type: Date },
      authenticationStatus: String,
      authenticationTransactionId: String,
    },

    // ========== SHIPROCKET INTEGRATION ==========
    shiprocketDetails: {
      orderId: { type: String, index: true },
      shipmentId: { type: String, index: true },
      awbCode: { type: String, index: true },
      courierName: String,
      courierId: String,
      labelUrl: String,
      manifestUrl: String,
      pickupTokenNumber: String,
      status: { 
        type: String,
        enum: ['pending', 'created', 'pickup', 'shipped', 'delivered', 'cancelled', 'failed', 'retry'],
        default: 'pending',
        index: true
      },
      createdAt: Date,
      shippedAt: Date,
      deliveredAt: Date,
      estimatedDeliveryDate: Date,
      rtoReason: String,
      isRto: { type: Boolean, default: false },
      error: {
        message: String,
        response: mongoose.Schema.Types.Mixed,
        status: Number,
        code: String
      },
      failedAt: Date,
      retryCount: { type: Number, default: 0 },
      lastRetryAt: Date,
      response: { type: mongoose.Schema.Types.Mixed },
      webhookEvents: [{
        event: String,
        data: mongoose.Schema.Types.Mixed,
        receivedAt: { type: Date, default: Date.now },
        _id: false
      }]
    },

    // Shipping Tracking
    trackingNumber: { type: String, index: true },
    trackingUrl: String,
    carrier: String,
    shippedAt: Date,
    estimatedDeliveryDate: Date,
    deliveredAt: Date,
    
    // Cancellation
    cancelledAt: Date,
    cancelReason: String,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    // Internal Notes (Admin Only)
    internalNotes: String,
    adminNotes: [{
      note: String,
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      addedAt: { type: Date, default: Date.now },
      _id: false
    }],

    // Metadata
    ipAddress: String,
    userAgent: String,
    source: { type: String, enum: ['web', 'mobile', 'admin'], default: 'web' },
    
    // Notification Status
    notifications: {
      orderConfirmationSent: { type: Boolean, default: false },
      paymentSuccessSent: { type: Boolean, default: false },
      shippingUpdateSent: { type: Boolean, default: false },
      deliveryConfirmationSent: { type: Boolean, default: false },
      shiprocketFailedSent: { type: Boolean, default: false }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ========== INDEXES FOR PERFORMANCE ==========
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'payment.status': 1, createdAt: -1 });
OrderSchema.index({ 'shiprocketDetails.status': 1, createdAt: -1 });
OrderSchema.index({ customerEmail: 1, createdAt: -1 });
OrderSchema.index({ user: 1, createdAt: -1 });

// ========== VIRTUALS ==========
OrderSchema.virtual('paymentMethodDisplay').get(function() {
  const methodMap = {
    'card': 'Credit/Debit Card',
    'netbanking': 'Net Banking',
    'upi': 'UPI',
    'wallet': 'Wallet',
    'emi': 'EMI'
  };
  return methodMap[this.payment.method] || 'Not Specified';
});

OrderSchema.virtual('isPaid').get(function() {
  return this.payment.status === 'charged';
});

OrderSchema.virtual('canCancel').get(function() {
  return !['delivered', 'cancelled', 'refunded'].includes(this.status) && 
         this.payment.status !== 'charged';
});

OrderSchema.virtual('canRefund').get(function() {
  return this.payment.status === 'charged' && 
         this.status !== 'refunded' &&
         (this.payment.totalRefunded || 0) < this.total;
});

OrderSchema.virtual('shipmentStatus').get(function() {
  if (!this.shiprocketDetails) return 'pending';
  return this.shiprocketDetails.status;
});

OrderSchema.virtual('hasTracking').get(function() {
  return !!(this.trackingNumber || this.shiprocketDetails?.awbCode);
});

OrderSchema.pre('save', async function () {

  if (!this.payment) return;

  if (this.payment.status === 'charged' && this.status === 'pending_payment') {
    this.status = 'order_success';
  }

  if (['authentication_failed', 'authorization_failed', 'failed'].includes(this.payment.status)) {
    this.status = 'pending_payment';
  }

});

// ========== METHODS ==========
OrderSchema.methods.updatePaymentFromGateway = function(gatewayResponse) {
  const statusMap = {
    'CHARGED': 'charged',
    'PENDING': 'processing',
    'PENDING_VBV': 'pending_vbv',
    'AUTHORIZATION_FAILED': 'authorization_failed',
    'AUTHENTICATION_FAILED': 'authentication_failed',
    'FAILED': 'failed',
    'REFUNDED': 'refunded'
  };

  this.payment.status = statusMap[gatewayResponse.status] || 'processing';
  this.payment.txnId = gatewayResponse.txn_id || this.payment.txnId;
  this.payment.txnUuid = gatewayResponse.txn_uuid || this.payment.txnUuid;
  this.payment.gatewayReferenceId = gatewayResponse.gateway_reference_id || this.payment.gatewayReferenceId;
  this.payment.gatewayResponse = gatewayResponse;

  if (this.payment.status === 'charged') {
    this.payment.completedAt = new Date();
    this.status = 'order_success';
  } else if (['failed', 'authentication_failed', 'authorization_failed'].includes(this.payment.status)) {
    this.payment.failedAt = new Date();
  }

  if (gatewayResponse.payment_method_type) {
    const methodMap = {
      'CARD': 'card',
      'NB': 'netbanking',
      'UPI': 'upi',
      'WALLET': 'wallet',
      'EMI': 'emi'
    };
    this.payment.method = methodMap[gatewayResponse.payment_method_type];
  }

  if (gatewayResponse.card) {
    this.payment.cardDetails = {
      last4: gatewayResponse.card.last_four,
      cardType: gatewayResponse.card.card_type,
      cardBrand: gatewayResponse.card.card_brand,
      expiryMonth: gatewayResponse.card.expiry_month,
      expiryYear: gatewayResponse.card.expiry_year
    };
  }

  if (gatewayResponse.error_code) {
    this.payment.errorCode = gatewayResponse.error_code;
    this.payment.errorMessage = gatewayResponse.error_message;
    this.payment.errorDescription = gatewayResponse.error_description;
  }

  return this;
};

OrderSchema.methods.initiateRefund = function(amount, reason) {
  const refund = {
    amount: amount || this.total - (this.payment.totalRefunded || 0),
    status: 'initiated',
    reason: reason,
    initiatedAt: new Date()
  };
  
  this.payment.refunds.push(refund);
  return refund;
};

OrderSchema.methods.updateShiprocketDetails = function(shiprocketResponse) {
  if (!this.shiprocketDetails) {
    this.shiprocketDetails = {};
  }

  this.shiprocketDetails.orderId = shiprocketResponse.order_id;
  this.shiprocketDetails.shipmentId = shiprocketResponse.shipment_id;
  this.shiprocketDetails.awbCode = shiprocketResponse.awb_code;
  this.shiprocketDetails.courierName = shiprocketResponse.courier_name;
  this.shiprocketDetails.courierId = shiprocketResponse.courier_id;
  this.shiprocketDetails.labelUrl = shiprocketResponse.label_url;
  this.shiprocketDetails.manifestUrl = shiprocketResponse.manifest_url;
  this.shiprocketDetails.pickupTokenNumber = shiprocketResponse.pickup_token_number;
  this.shiprocketDetails.status = 'created';
  this.shiprocketDetails.createdAt = new Date();
  this.shiprocketDetails.response = shiprocketResponse;

  if (shiprocketResponse.awb_code) {
    this.trackingNumber = shiprocketResponse.awb_code;
    this.carrier = shiprocketResponse.courier_name;
    this.status = 'processing';
  }

  return this;
};

OrderSchema.methods.addShiprocketError = function(error, retryCount = 0) {
  if (!this.shiprocketDetails) {
    this.shiprocketDetails = {};
  }

  this.shiprocketDetails.status = 'failed';
  this.shiprocketDetails.error = {
    message: error.message || 'Unknown error',
    response: error.response?.data || null,
    status: error.response?.status || 500,
    code: error.code
  };
  this.shiprocketDetails.failedAt = new Date();
  this.shiprocketDetails.retryCount = retryCount;
  this.shiprocketDetails.lastRetryAt = new Date();

  return this;
};

OrderSchema.methods.incrementShiprocketRetry = function() {
  if (!this.shiprocketDetails) {
    this.shiprocketDetails = { retryCount: 0 };
  }
  this.shiprocketDetails.retryCount = (this.shiprocketDetails.retryCount || 0) + 1;
  this.shiprocketDetails.lastRetryAt = new Date();
  this.shiprocketDetails.status = 'retry';
  return this;
};

// ========== STATICS ==========
OrderSchema.statics.findByPaymentStatus = function(status) {
  return this.find({ 'payment.status': status });
};

OrderSchema.statics.findPendingPayments = function(hours = 24) {
  return this.find({
    'payment.status': { $in: ['pending', 'initiated', 'processing'] },
    createdAt: { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) }
  });
};

OrderSchema.statics.findFailedShiprocketOrders = function() {
  return this.find({
    'payment.status': 'charged',
    'shiprocketDetails.status': 'failed',
    'shiprocketDetails.retryCount': { $lt: 3 }
  });
};

module.exports = mongoose.model("Order", OrderSchema);