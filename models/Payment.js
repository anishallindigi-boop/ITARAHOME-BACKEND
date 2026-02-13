const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber: { type: String, required: true },
    
    // HDFC Payment Gateway Fields
    transactionId: { type: String, unique: true, sparse: true }, // HDFC Transaction ID
    paymentId: { type: String, unique: true, sparse: true }, // Our payment reference
    bankRefNo: { type: String }, // HDFC Bank Reference
    trackingId: { type: String }, // HDFC Tracking ID
    
    // Amount Details
    amount: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    shippingCharge: { type: Number, default: 0 },
    
    // Payment Status
    status: {
      type: String,
      enum: [
        'pending',      // Initial state
        'initiated',    // Payment request sent
        'processing',   // Payment in progress
        'authorized',   // Payment authorized
        'captured',     // Payment successful
        'failed',       // Payment failed
        'refunded',     // Payment refunded
        'cancelled'     // Payment cancelled
      ],
      default: 'pending'
    },
    
    // HDFC Response Data
    hdfcResponse: {
      order_id: String,
      tracking_id: String,
      bank_ref_no: String,
      order_status: String,
      failure_message: String,
      payment_mode: String,
      card_name: String,
      merchant_param1: String,
      merchant_param2: String,
      merchant_param3: String,
      merchant_param4: String,
      merchant_param5: String,
      raw_response: mongoose.Schema.Types.Mixed
    },
    
    // Refund Details
    refunds: [{
      refundId: String,
      amount: Number,
      reason: String,
      status: { type: String, enum: ['pending', 'processed', 'failed'] },
      initiatedAt: Date,
      completedAt: Date,
      bankRefNo: String
    }],
    
    // Payment Method
    paymentMethod: { 
      type: String, 
      enum: ['hdfc', 'razorpay', 'paytm', 'upi', 'netbanking', 'card', 'wallet'],
      default: 'hdfc'
    },
    
    // Timestamps
    initiatedAt: { type: Date },
    completedAt: { type: Date },
    failedAt: { type: Date },
    
    // Error Tracking
    error: {
      code: String,
      message: String,
      details: mongoose.Schema.Types.Mixed,
      occurredAt: Date
    },
    
    // Metadata
    ipAddress: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

// Indexes for faster queries


module.exports = mongoose.model("Payment", PaymentSchema);