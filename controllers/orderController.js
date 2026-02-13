const Order = require("../models/Order");
const Product = require("../models/Product");
const ShippingMethod = require("../models/ShippingMethod");
const Coupon = require("../models/Coupon");
const transporter = require("../lib/mailer");
const orderSuccessTemplate = require("../lib/emailTemplates/orderSuccess");
const orderStatusTemplate = require("../lib/emailTemplates/orderStatusTemplate");
const mongoose = require("mongoose");
const { Juspay, APIError } = require('expresscheckout-nodejs');
const fs = require('fs');
const { createShiprocketOrder } = require("./shippingController");
const dotenv = require('dotenv');

dotenv.config();

// ============================================
// HDFC/JUSPAY SDK INITIALIZATION
// ============================================
const config = {
  MERCHANT_ID: process.env.HDFC_MERCHANT_ID,
  KEY_UUID: process.env.HDFC_KEY_UUID,
  PUBLIC_KEY_PATH: process.env.HDFC_PUBLIC_KEY_PATH,
  PRIVATE_KEY_PATH: process.env.HDFC_PRIVATE_KEY_PATH,
  PAYMENT_PAGE_CLIENT_ID: process.env.HDFC_PAYMENT_PAGE_CLIENT_ID,
  ENVIRONMENT: process.env.HDFC_ENVIRONMENT || 'SANDBOX'
};

// Read JWT keys
const publicKey = process.env.HDFC_PUBLIC_KEY_PATH;
const privateKey = process.env.HDFC_PRIVATE_KEY_PATH;

// Environment URLs
const SANDBOX_BASE_URL = "https://smartgateway.hdfcuat.bank.in";
const PRODUCTION_BASE_URL = "https://smartgateway.hdfc.bank.in";
const BASE_URL = config.ENVIRONMENT === 'PRODUCTION' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;

// Initialize Juspay SDK
const juspay = new Juspay({
  merchantId: config.MERCHANT_ID,
  baseUrl: BASE_URL,
  jweAuth: {
    keyId: config.KEY_UUID,
    publicKey: publicKey,
    privateKey: privateKey
  }
});

console.log(`✓ HDFC Payment Gateway initialized (${config.ENVIRONMENT})`);

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateOrderNumber = async () => {
  const date = new Date();
  const prefix = 'ORD';
  const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestamp = date.getTime().toString().slice(-4);
  
  let orderNumber = `${prefix}-${dateStr}-${timestamp}${random}`;
  let exists = await Order.findOne({ orderNumber });
  let attempts = 0;
  
  while (exists && attempts < 5) {
    const newRandom = Math.random().toString(36).substring(2, 6).toUpperCase();
    orderNumber = `${prefix}-${dateStr}-${timestamp}${newRandom}`;
    exists = await Order.findOne({ orderNumber });
    attempts++;
  }
  
  return orderNumber;
};

const validateAndEnrichItems = async (items, session) => {
  const enrichedItems = [];
  
  for (const item of items) {
    const product = await Product.findById(item.productId).session(session);
    
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    if (!product.isActive || product.status !== 'published') {
      throw new Error(`Product ${product.name} is not available`);
    }

    let variation = null;
    if (item.productVariationId) {
      variation = product.variations.find(
        v => v._id.toString() === item.productVariationId.toString()
      );
      
      if (!variation) {
        throw new Error(`Variation not found for product: ${product.name}`);
      }
      
      if (variation.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}. Available: ${variation.stock}, Requested: ${item.quantity}`
        );
      }
    } else {
      if (product.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        );
      }
    }

    enrichedItems.push({
      productId: item.productId,
      productVariationId: item.productVariationId || null,
      quantity: item.quantity,
      price: item.price,
      originalPrice: variation ? variation.price : product.price,
      name: product.name,
      image: variation?.image || product.mainImage,
      attributes: variation ? Object.fromEntries(variation.attributes) : {},
      sku: variation?.sku || product.sku,
    });
  }

  return enrichedItems;
};

const updateInventory = async (order, session, restore = false) => {
  for (const item of order.items) {
    const product = await Product.findById(item.productId).session(session);
    
    if (product) {
      const delta = restore ? item.quantity : -item.quantity;
      
      if (item.productVariationId) {
        const variation = product.variations.find(
          v => v._id.toString() === item.productVariationId.toString()
        );
        if (variation) {
          variation.stock += delta;
          variation.soldCount = Math.max(0, (variation.soldCount || 0) - delta);
        }
      } else {
        product.stock += delta;
      }
      
      product.soldCount = Math.max(0, (product.soldCount || 0) - delta);
      await product.save({ session });
    }
  }
};

const validateCoupon = async (couponCode, subtotal, session) => {
  if (!couponCode) return null;

  const coupon = await Coupon.findOne({ 
    code: couponCode.toUpperCase(),
    isActive: true 
  }).session(session);

  if (!coupon) {
    throw new Error("Invalid or expired coupon");
  }

  const now = new Date();
  if (coupon.validFrom && now < new Date(coupon.validFrom)) {
    throw new Error("Coupon not yet active");
  }
  if (coupon.validUntil && now > new Date(coupon.validUntil)) {
    throw new Error("Coupon has expired");
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new Error("Coupon usage limit reached");
  }
  if (coupon.minOrderAmount > 0 && subtotal < coupon.minOrderAmount) {
    throw new Error(`Minimum order amount ₹${coupon.minOrderAmount} required`);
  }

  return coupon;
};

// ============================================
// CREATE ORDER
// ============================================
exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      customerEmail,
      customerName,
      customerPhone,
      shippingAddress,
      billingAddress,
      shippingMethodId,
      shippingCost,
      subtotal,
      tax,
      discount = 0,
      total,
      notes,
      items,
      couponCode,
      ipAddress,
      userAgent,
    } = req.body;

    const user = req.user?._id;

    // Validation
    if (!customerEmail || !customerName || !customerPhone || !shippingAddress || !items?.length) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Validate shipping method
    const shipping = await ShippingMethod.findById(shippingMethodId).session(session);
    if (!shipping) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Invalid shipping method" });
    }

    // Validate coupon
    let couponDetails = null;
    const coupon = await validateCoupon(couponCode, subtotal, session);
    if (coupon) {
      coupon.usedCount += 1;
      await coupon.save({ session });

      couponDetails = {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount: discount
      };
    }

    // Validate and enrich items
    const enrichedItems = await validateAndEnrichItems(items, session);
    const orderNumber = await generateOrderNumber();

    // Create order
    const order = new Order({
      orderNumber,
      customerEmail,
      customerName,
      customerPhone,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      shippingMethodId,
      shippingCost,
      subtotal,
      tax,
      discount,
      total,
      notes,
      user,
      items: enrichedItems,
      couponCode: couponCode || null,
      couponDetails,
      status: 'pending_payment',
      inventoryUpdated: false,
      ipAddress,
      userAgent,
      payment: {
        status: 'pending',
        orderId: orderNumber,
      },
      shiprocketDetails: {
        status: 'pending'
      }
    });

    await order.save({ session });
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Order created successfully. Please proceed with payment.",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        status: order.status,
        paymentStatus: order.payment.status
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Create order error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Server error"
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// INITIATE PAYMENT
// ============================================
exports.initiatePayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.payment.status === 'charged') {
      return res.status(400).json({ 
        success: false, 
        message: "Order is already paid" 
      });
    }

    const returnUrl = `${process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`}/api/orders/payment-callback`;

    const sessionResponse = await juspay.orderSession.create({
      order_id: order.orderNumber,
      amount: order.total,
      payment_page_client_id: config.PAYMENT_PAGE_CLIENT_ID,
      customer_id: order.user?.toString() || order.customerEmail,
      customer_email: order.customerEmail,
      customer_phone: order.customerPhone,
      action: 'paymentPage',
      return_url: returnUrl,
      currency: 'INR',
      udf1: order._id.toString(),
      udf2: order.orderNumber,
    });

    order.payment.sessionId = sessionResponse.id;
    order.payment.paymentUrl = sessionResponse.payment_links?.web;
    order.payment.status = 'initiated';
    order.payment.initiatedAt = new Date();
    order.payment.attemptCount = (order.payment.attemptCount || 0) + 1;
    order.payment.lastAttemptAt = new Date();
    order.status = 'payment_initiated';

    await order.save();

    console.log(`✓ Payment initiated for order: ${order.orderNumber}`);

    res.json({
      success: true,
      message: "Payment session created successfully",
      paymentUrl: sessionResponse.payment_links.web,
      sessionId: sessionResponse.id,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total
      }
    });

  } catch (error) {
    console.error('✗ Payment initiation failed:', error);
    
    if (error instanceof APIError) {
      return res.status(error.statusCode || 500).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to initiate payment" 
    });
  }
};

// ============================================
// PAYMENT CALLBACK - PRODUCTION READY
// ============================================
exports.paymentCallback = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderNumber = req.body.order_id || req.query.order_id;
    
    if (!orderNumber) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: "Order ID not provided" 
      });
    }

    console.log(`💰 Checking payment status for: ${orderNumber}`);

    // Fetch order status from Juspay
    const statusResponse = await juspay.order.status(orderNumber);
    console.log(`📊 Payment status from gateway: ${statusResponse.status}`);

    // Find order
    const order = await Order.findOne({ orderNumber }).session(session);
    
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    // Update order with gateway response
    order.updatePaymentFromGateway(statusResponse);

    // ========== PAYMENT SUCCESS HANDLING ==========
    if (order.payment.status === 'charged' && !order.inventoryUpdated) {
      
      // 1. Update inventory
      await updateInventory(order, session, false);
      order.inventoryUpdated = true;
      order.inventoryUpdatedAt = new Date();
      order.status = 'order_success';

      console.log(`✅ Payment successful - Inventory updated for: ${orderNumber}`);

      // 2. Save order and commit transaction
      await order.save({ session });
      await session.commitTransaction();
      session.endSession();

      // 3. Create Shiprocket order (async - don't await)
      console.log(`🚀 Triggering Shiprocket order creation for: ${order.orderNumber}`);
      
      createShiprocketOrder(order)
        .then(async (shiprocketResult) => {
          try {
            const orderToUpdate = await Order.findOne({ orderNumber: order.orderNumber });
            
            if (!orderToUpdate) {
              console.error(`❌ Order not found for Shiprocket update: ${order.orderNumber}`);
              return;
            }

            if (shiprocketResult.success) {
              orderToUpdate.updateShiprocketDetails(shiprocketResult.data);
              await orderToUpdate.save();
              console.log(`✅ Shiprocket order created & saved: ${order.orderNumber}, AWB: ${shiprocketResult.data.awb_code}`);
            } else {
              orderToUpdate.addShiprocketError(shiprocketResult.error);
              await orderToUpdate.save();
              console.log(`❌ Shiprocket order failed: ${order.orderNumber}`);
            }
          } catch (error) {
            console.error(`❌ Error updating order with Shiprocket details:`, error.message);
          }
        })
        .catch(error => {
          console.error(`❌ Shiprocket promise error:`, error.message);
        });

      // 4. Send success email (async - don't await)
      transporter.sendMail({
        from: `"Itara Home" <${process.env.SMTP_FROM_EMAIL || 'orders@itarahome.com'}>`,
        to: order.customerEmail,
        subject: `Payment Successful - Order ${order.orderNumber} ✅`,
        html: orderSuccessTemplate({
          customerName: order.customerName,
          orderNumber: order.orderNumber,
          items: order.items,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          tax: order.tax,
          discount: order.discount,
          total: order.total,
          couponCode: order.couponCode,
          trackingNumber: order.trackingNumber
        }),
      }).catch(err => console.error("❌ Email send failed:", err.message));

      // Update notification status
      Order.findOneAndUpdate(
        { orderNumber: order.orderNumber },
        {
          'notifications.paymentSuccessSent': true,
          'notifications.orderConfirmationSent': true
        }
      ).catch(err => console.error("❌ Failed to update notification status:", err.message));

    } else {
      // Payment not successful
      await order.save({ session });
      await session.commitTransaction();
      session.endSession();
    }

    // ========== REDIRECT TO FRONTEND ==========
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    if (order.payment.status === 'charged') {
      return res.redirect(`${frontendUrl}/orders/order-success?orderNumber=${order.orderNumber}`);
    } else {
      return res.redirect(`${frontendUrl}/orders/order-failed?orderNumber=${order.orderNumber}&status=${order.payment.status}`);
    }

  } catch (error) {
    console.error('✗ Payment callback error:', error);
    
    await session.abortTransaction();
    session.endSession();

    // Redirect to error page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/orders/order-failed?error=processing_error`);
  }
};

// ============================================
// RETRY SHIPROCKET ORDER
// ============================================
exports.retryShiprocketOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.payment.status !== 'charged') {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot create shipment for unpaid order" 
      });
    }

    if (order.shiprocketDetails?.orderId && order.shiprocketDetails?.status !== 'failed') {
      return res.status(400).json({ 
        success: false, 
        message: "Shiprocket order already exists",
        shiprocketOrderId: order.shiprocketDetails.orderId,
        awbCode: order.shiprocketDetails.awbCode
      });
    }

    console.log(`🔄 Retrying Shiprocket order for: ${order.orderNumber}`);

    order.incrementShiprocketRetry();
    await order.save();

    const shiprocketResult = await createShiprocketOrder(order);
    
    if (shiprocketResult.success) {
      order.updateShiprocketDetails(shiprocketResult.data);
      await order.save();

      return res.json({
        success: true,
        message: "Shiprocket order created successfully",
        data: {
          orderId: order.shiprocketDetails.orderId,
          shipmentId: order.shiprocketDetails.shipmentId,
          awbCode: order.shiprocketDetails.awbCode,
          courierName: order.shiprocketDetails.courierName
        }
      });
    } else {
      order.addShiprocketError(shiprocketResult.error, order.shiprocketDetails.retryCount);
      await order.save();

      return res.status(500).json({
        success: false,
        message: "Failed to create Shiprocket order",
        error: shiprocketResult.error,
        retryCount: order.shiprocketDetails.retryCount
      });
    }

  } catch (error) {
    console.error('❌ Shiprocket retry error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ============================================
// CHECK PAYMENT STATUS
// ============================================
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber });
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    // Fetch latest status from gateway
    try {
      const statusResponse = await juspay.order.status(orderNumber);
      order.updatePaymentFromGateway(statusResponse);
      await order.save();
    } catch (error) {
      console.error('❌ Failed to fetch latest payment status:', error.message);
    }

    res.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.payment.status,
        paymentMethod: order.paymentMethodDisplay,
        total: order.total,
        createdAt: order.createdAt,
        txnId: order.payment.txnId,
        shiprocketStatus: order.shiprocketDetails?.status,
        trackingNumber: order.trackingNumber || order.shiprocketDetails?.awbCode,
        trackingUrl: order.trackingUrl
      }
    });

  } catch (error) {
    console.error('❌ Check payment status error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to check payment status" 
    });
  }
};

// ============================================
// CANCEL ORDER
// ============================================
exports.cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id).session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (['delivered', 'cancelled', 'refunded'].includes(order.status)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: `Cannot cancel order with status: ${order.status}` 
      });
    }

    if (order.payment.status === 'charged') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: "Order is paid. Please initiate refund instead." 
      });
    }

    if (order.inventoryUpdated) {
      await updateInventory(order, session, true);
      order.inventoryUpdated = false;
      order.inventoryRestoredAt = new Date();
    }

    if (order.couponCode) {
      const coupon = await Coupon.findOne({ code: order.couponCode }).session(session);
      if (coupon && coupon.usedCount > 0) {
        coupon.usedCount -= 1;
        await coupon.save({ session });
      }
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = reason;
    order.cancelledBy = req.user?._id;
    await order.save({ session });

    await session.commitTransaction();

    // Send cancellation email (async)
    transporter.sendMail({
      from: `"Itara Home" <${process.env.SMTP_FROM_EMAIL || 'orders@itarahome.com'}>`,
      to: order.customerEmail,
      subject: `Order Cancelled – ${order.orderNumber}`,
      html: orderStatusTemplate({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        status: 'cancelled',
        items: order.items,
        total: order.total,
        message: reason || 'Order has been cancelled',
      }),
    }).catch(err => console.error("❌ Email send failed:", err.message));

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Cancel order error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ============================================
// INITIATE REFUND
// ============================================
exports.initiateRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.payment.status !== 'charged') {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot refund unpaid order" 
      });
    }

    const refundAmount = amount || (order.total - (order.payment.totalRefunded || 0));
    const availableAmount = order.total - (order.payment.totalRefunded || 0);

    if (refundAmount > availableAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Refund amount exceeds available balance. Maximum refund: ₹${availableAmount}` 
      });
    }

    const refundResponse = await juspay.refund.create({
      order_id: order.orderNumber,
      amount: refundAmount,
      unique_request_id: `refund_${order.orderNumber}_${Date.now()}`
    });

    const refund = order.initiateRefund(refundAmount, reason);
    refund.refundId = refundResponse.id;
    refund.status = 'processing';
    
    order.payment.totalRefunded = (order.payment.totalRefunded || 0) + refundAmount;
    
    if (order.payment.totalRefunded >= order.total) {
      order.payment.status = 'refunded';
      order.status = 'refunded';
    } else {
      order.payment.status = 'partially_refunded';
    }

    await order.save();

    console.log(`✓ Refund initiated: ${order.orderNumber}, Amount: ₹${refundAmount}`);

    res.json({
      success: true,
      message: "Refund initiated successfully",
      refund: {
        id: refundResponse.id,
        amount: refundAmount,
        status: 'processing'
      }
    });

  } catch (error) {
    console.error('❌ Refund initiation error:', error);
    
    if (error instanceof APIError) {
      return res.status(error.statusCode || 500).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to initiate refund" 
    });
  }
};

// ============================================
// GET ALL ORDERS
// ============================================
exports.getAllOrders = async (req, res) => {
  try {
    const { 
      status, 
      paymentStatus, 
      shiprocketStatus,
      page = 1, 
      limit = 20, 
      search,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (paymentStatus) query['payment.status'] = paymentStatus;
    if (shiprocketStatus) query['shiprocketDetails.status'] = shiprocketStatus;
    
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }
    
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } },
        { 'shiprocketDetails.awbCode': { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate("shippingMethodId", "name price")
      .populate({
        path: "items.productId",
        select: "name slug mainImage price sku weight"
      })
      .sort(sort)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      orders: orders.map(order => ({
        ...order,
        shipmentStatus: order.shiprocketDetails?.status || 'pending',
        hasTracking: !!(order.trackingNumber || order.shiprocketDetails?.awbCode)
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("❌ Get orders error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// GET SINGLE ORDER
// ============================================
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("shippingMethodId", "name price estimatedDays")
      .populate({
        path: "items.productId",
        select: "name mainImage price slug sku weight",
      })
      .populate("user", "name email")
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ 
      success: true, 
      order: {
        ...order,
        shipmentStatus: order.shiprocketDetails?.status || 'pending',
        canRetryShiprocket: order.payment.status === 'charged' && 
                           (!order.shiprocketDetails?.orderId || 
                            order.shiprocketDetails?.status === 'failed')
      }
    });
  } catch (error) {
    console.error("❌ Get order error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// GET ORDER BY ORDER NUMBER
// ============================================
exports.getOrderByOrderNumber = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate("shippingMethodId", "name price estimatedDays")
      .populate({
        path: "items.productId",
        select: "name mainImage price slug sku weight",
      })
      .populate("user", "name email")
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ 
      success: true, 
      order: {
        ...order,
        shipmentStatus: order.shiprocketDetails?.status || 'pending'
      }
    });
  } catch (error) {
    console.error("❌ Get order by number error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// UPDATE ORDER STATUS
// ============================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber, trackingUrl, carrier } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.status = status || order.status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (trackingUrl) order.trackingUrl = trackingUrl;
    if (carrier) order.carrier = carrier;
    
    if (status === 'shipped' && !order.shippedAt) {
      order.shippedAt = new Date();
    }
    if (status === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Send email notification (async)
    const populatedOrder = await Order.findById(order._id)
      .populate("items.productId", "name");

    transporter.sendMail({
      from: `"Itara Home" <${process.env.SMTP_FROM_EMAIL || 'orders@itarahome.com'}>`,
      to: order.customerEmail,
      subject: `Order ${status.toUpperCase()} – ${order.orderNumber}`,
      html: orderStatusTemplate({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        status,
        items: populatedOrder.items,
        total: order.total,
        trackingNumber: order.trackingNumber || order.shiprocketDetails?.awbCode,
        trackingUrl: order.trackingUrl,
      }),
    }).catch(err => console.error("❌ Email send failed:", err.message));

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order
    });
  } catch (error) {
    console.error("❌ Update status error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// GET ORDERS BY CUSTOMER
// ============================================
exports.getOrdersByCustomer = async (req, res) => {
  try {
    const user = req.user?._id;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const orders = await Order.find({ user })
      .populate("shippingMethodId", "name price")
      .populate("items.productId", "name mainImage slug")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ 
      success: true, 
      orders: orders.map(order => ({
        ...order,
        shipmentStatus: order.shiprocketDetails?.status || 'pending',
        trackingNumber: order.trackingNumber || order.shiprocketDetails?.awbCode
      }))
    });
  } catch (error) {
    console.error("❌ Get customer orders error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// DELETE ORDER
// ============================================
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.payment.status === 'charged') {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot delete paid orders. Please refund first." 
      });
    }

    await Order.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error("❌ Delete order error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// GET ORDER STATS
// ============================================
exports.getOrderStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [
      totalOrders,
      todayOrders,
      monthOrders,
      yearOrders,
      totalRevenue,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      paidOrders,
      shiprocketFailed
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfDay } }),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.countDocuments({ createdAt: { $gte: startOfYear } }),
      Order.aggregate([
        { $match: { 'payment.status': 'charged' } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]),
      Order.countDocuments({ status: 'processing' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.countDocuments({ 'payment.status': 'charged' }),
      Order.countDocuments({ 'shiprocketDetails.status': 'failed' })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        todayOrders,
        monthOrders,
        yearOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        paidOrders,
        shiprocketFailed,
        pendingShipments: await Order.countDocuments({ 
          'payment.status': 'charged',
          'shiprocketDetails.status': { $in: ['pending', 'failed', null] }
        })
      }
    });
  } catch (error) {
    console.error("❌ Get order stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================
module.exports = exports;