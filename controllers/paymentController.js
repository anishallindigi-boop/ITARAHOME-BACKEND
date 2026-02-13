const crypto = require('crypto');
const axios = require('axios');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { MERCHANT_ID, ACCESS_CODE, ENCRYPTION_KEY, PAYMENT_URL, REDIRECT_URL, CANCEL_URL } = require('../config/hdfc');
const { createShiprocketOrderWithFallback } = require('./shiprocketController');

// ==================== HDFC ENCRYPTION UTILITIES ====================
const encrypt = (plainText, workingKey) => {
  try {
    const m = crypto.createHash('md5');
    m.update(workingKey);
    const key = m.digest('hex');
    const iv = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f';
    
    const cipher = crypto.createCipheriv('aes-128-cbc', key.slice(0, 16), iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Payment encryption failed');
  }
};

const decrypt = (encryptedText, workingKey) => {
  try {
    const m = crypto.createHash('md5');
    m.update(workingKey);
    const key = m.digest('hex');
    const iv = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f';
    
    const decipher = crypto.createDecipheriv('aes-128-cbc', key.slice(0, 16), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Payment decryption failed');
  }
};

// ==================== HDFC PAYMENT FLOW ====================

/**
 * Step 1: Initiate Payment - Generate encrypted payment data
 */
exports.initiatePayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.params;
    
    // Get order details
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ 
      orderId: order._id,
      status: { $in: ['pending', 'initiated', 'processing', 'authorized', 'captured'] }
    }).session(session);

    if (existingPayment) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: 'Payment already in progress',
        paymentId: existingPayment.paymentId
      });
    }

    // Generate unique payment ID
    const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Create payment record
    const payment = new Payment({
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentId,
      amount: order.total,
      tax: order.tax,
      discount: order.discount,
      shippingCharge: order.shippingCost,
      status: 'initiated',
      initiatedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await payment.save({ session });

    // Prepare HDFC merchant data
    const merchantData = {
      merchant_id: MERCHANT_ID,
      order_id: paymentId,
      currency: 'INR',
      amount: order.total.toFixed(2),
      redirect_url: REDIRECT_URL,
      cancel_url: CANCEL_URL,
      language: 'EN',
      billing_name: order.customerName,
      billing_address: order.shippingAddress?.address || '',
      billing_city: order.shippingAddress?.city || '',
      billing_state: order.shippingAddress?.state || '',
      billing_zip: order.shippingAddress?.pincode || '',
      billing_country: order.shippingAddress?.country || 'India',
      billing_tel: order.customerPhone,
      billing_email: order.customerEmail,
      delivery_name: order.customerName,
      delivery_address: order.shippingAddress?.address || '',
      delivery_city: order.shippingAddress?.city || '',
      delivery_state: order.shippingAddress?.state || '',
      delivery_zip: order.shippingAddress?.pincode || '',
      delivery_country: order.shippingAddress?.country || 'India',
      delivery_tel: order.customerPhone,
      merchant_param1: order._id.toString(),
      merchant_param2: order.orderNumber,
      merchant_param3: paymentId,
      merchant_param4: 'website',
      merchant_param5: req.user?._id?.toString() || 'guest'
    };

    // Convert to query string and encrypt
    const merchantDataString = Object.entries(merchantData)
      .map(([key, value]) => `${key}=${encodeURIComponent(value || '')}`)
      .join('&');

    const encRequest = encrypt(merchantDataString, ENCRYPTION_KEY);
    const accessCode = ACCESS_CODE;

    await session.commitTransaction();

    res.json({
      success: true,
      data: {
        encRequest,
        accessCode,
        paymentUrl: PAYMENT_URL,
        paymentId: payment.paymentId,
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.total
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Payment initiation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initiate payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

/**
 * Step 2: Handle HDFC Response - After user completes payment
 */
exports.handlePaymentResponse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { encResp } = req.body;
    
    if (!encResp) {
      return res.status(400).send('Invalid response from payment gateway');
    }

    // Decrypt response
    const decryptedResponse = decrypt(encResp, ENCRYPTION_KEY);
    const responseParams = Object.fromEntries(
      decryptedResponse.split('&').map(pair => {
        const [key, value] = pair.split('=');
        return [key, decodeURIComponent(value || '')];
      })
    );

    const {
      order_id,           // Our paymentId
      tracking_id,        // HDFC tracking ID
      bank_ref_no,        // HDFC bank reference
      order_status,       // Success/Failure
      failure_message,
      payment_mode,
      card_name,
      merchant_param1,    // Order ID
      merchant_param2,    // Order Number
      merchant_param3,    // Payment ID
      amount
    } = responseParams;

    // Find payment
    const payment = await Payment.findOne({ paymentId: order_id }).session(session);
    if (!payment) {
      await session.abortTransaction();
      return res.status(404).send('Payment record not found');
    }

    // Update payment with HDFC response
    payment.transactionId = tracking_id;
    payment.bankRefNo = bank_ref_no;
    payment.trackingId = tracking_id;
    payment.hdfcResponse = {
      ...responseParams,
      raw_response: responseParams
    };

    const order = await Order.findById(payment.orderId).session(session);
    
    if (order_status === 'Success') {
      // Payment successful
      payment.status = 'captured';
      payment.completedAt = new Date();
      
      // Update order status
      order.status = 'confirmed';
      order.paymentStatus = 'paid';
      
      await payment.save({ session });
      await order.save({ session });
      
      await session.commitTransaction();
      
      // NON-BLOCKING: Create Shiprocket order
      createShiprocketOrderWithFallback(order._id, {
        immediate: false,
        maxRetries: 3
      }).catch(err => {
        console.error('Background Shiprocket order creation failed:', err.message);
        // Log to admin notification system
      });
      
      // Redirect to success page
      res.redirect(`${process.env.FRONTEND_URL}/order-success?order=${order.orderNumber}`);
      
    } else {
      // Payment failed
      payment.status = 'failed';
      payment.failedAt = new Date();
      payment.error = {
        code: 'PAYMENT_FAILED',
        message: failure_message || 'Payment failed',
        details: responseParams,
        occurredAt: new Date()
      };
      
      order.status = 'failed';
      
      await payment.save({ session });
      await order.save({ session });
      await session.commitTransaction();
      
      // Redirect to failure page
      res.redirect(`${process.env.FRONTEND_URL}/payment-failed?order=${order.orderNumber}&reason=${encodeURIComponent(failure_message || 'Payment failed')}`);
    }

  } catch (error) {
    await session.abortTransaction();
    console.error('Payment response handling error:', error);
    res.status(500).send('Error processing payment response');
  } finally {
    session.endSession();
  }
};

/**
 * Step 3: Check Payment Status
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const payment = await Payment.findOne({ orderId })
      .sort({ createdAt: -1 })
      .lean();

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }

    const response = {
      success: true,
      payment: {
        paymentId: payment.paymentId,
        transactionId: payment.transactionId,
        status: payment.status,
        amount: payment.amount,
        completedAt: payment.completedAt,
        failedAt: payment.failedAt,
        error: payment.error
      }
    };

    // If failed, include reason
    if (payment.status === 'failed' && payment.error) {
      response.payment.failureReason = payment.error.message;
    }

    res.json(response);

  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check payment status' 
    });
  }
};