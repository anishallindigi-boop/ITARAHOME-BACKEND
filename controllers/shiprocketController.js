const axios = require('axios');
const Order = require('../models/Order');
const { EMAIL, PASSWORD, BASE_URL, PICKUP_LOCATION, DEFAULT_LENGTH, DEFAULT_BREADTH, DEFAULT_HEIGHT, DEFAULT_WEIGHT } = require('../config/shiprocket');

// Token management
let shiprocketToken = null;
let tokenExpiry = null;
let tokenPromise = null;

/**
 * Get Shiprocket token with caching and race condition prevention
 */
const getShiprocketToken = async (forceRefresh = false) => {
  // Return existing token if valid
  if (!forceRefresh && shiprocketToken && tokenExpiry && Date.now() < tokenExpiry) {
    return shiprocketToken;
  }

  // Prevent multiple simultaneous token requests
  if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = (async () => {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: EMAIL,
        password: PASSWORD
      }, { timeout: 10000 });

      if (response.data.token) {
        shiprocketToken = response.data.token;
        tokenExpiry = Date.now() + (23 * 60 * 60 * 1000); // 23 hours
        return shiprocketToken;
      }
      throw new Error('No token in response');
    } catch (error) {
      console.error('Shiprocket auth error:', error.response?.data || error.message);
      throw new Error('Shiprocket authentication failed');
    } finally {
      tokenPromise = null;
    }
  })();

  return tokenPromise;
};

/**
 * Calculate shipping with fallback
 */
exports.calculateShipping = async (req, res) => {
  try {
    const { 
      pickup_postcode, 
      delivery_postcode, 
      weight = DEFAULT_WEIGHT,
      length = DEFAULT_LENGTH,
      breadth = DEFAULT_BREADTH,
      height = DEFAULT_HEIGHT,
      declared_value = 0
    } = req.body;

    // Validate required fields
    if (!delivery_postcode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Delivery pincode is required' 
      });
    }

    let token;
    try {
      token = await getShiprocketToken();
    } catch (authError) {
      // Return fallback shipping if auth fails
      return res.json({
        success: true,
        data: [getFallbackShipping()],
        serviceable: true,
        isFallback: true,
        message: 'Using standard shipping rates'
      });
    }

    try {
      const response = await axios.get(`${BASE_URL}/courier/serviceability`, {
        params: {
          pickup_postcode: pickup_postcode || process.env.PICKUP_PINCODE || '110001',
          delivery_postcode,
          weight: parseFloat(weight),
          length: parseInt(length),
          breadth: parseInt(breadth),
          height: parseInt(height),
          declared_value: parseFloat(declared_value),
          cod: 0 // No COD
        },
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 8000
      });

      if (response.data.status !== 200 || !response.data.data?.available_courier_companies?.length) {
        return res.json({
          success: true,
          data: [getFallbackShipping()],
          serviceable: true,
          isFallback: true,
          message: 'No couriers available, using standard shipping'
        });
      }

      const couriers = response.data.data.available_courier_companies;
      
      const shippingOptions = couriers
        .map(courier => ({
          courier_id: courier.id || courier.courier_company_id,
          courier_name: courier.courier_name,
          rate: courier.rate || calculateTotalRate(courier),
          estimated_delivery_days: courier.estimated_delivery_days || '3-5',
          etd: courier.etd || '3-5 business days',
          courier_company_id: courier.courier_company_id,
          is_air: courier.mode === 1
        }))
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 3); // Return top 3 cheapest

      res.json({
        success: true,
        data: shippingOptions,
        serviceable: true,
        isFallback: false
      });

    } catch (apiError) {
      console.error('Shiprocket API error:', apiError.message);
      
      res.json({
        success: true,
        data: [getFallbackShipping()],
        serviceable: true,
        isFallback: true,
        message: 'Using standard shipping rates'
      });
    }

  } catch (error) {
    console.error('Shipping calculation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to calculate shipping' 
    });
  }
};

/**
 * Create Shiprocket order with fallback and retry mechanism
 */
exports.createShiprocketOrder = async (orderId, options = {}) => {
  const { immediate = true, maxRetries = 3, delayMs = 2000 } = options;
  
  if (!immediate) {
    // Schedule for background processing
    setTimeout(() => {
      createShiprocketOrderWithRetry(orderId, maxRetries, 1);
    }, delayMs);
    return;
  }

  return createShiprocketOrderWithRetry(orderId, maxRetries, 1);
};

/**
 * Create Shiprocket order with retry logic
 */
const createShiprocketOrderWithRetry = async (orderId, maxRetries, attempt) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId)
      .populate('items.productId', 'name sku weight length breadth height hsnCode')
      .session(session);

    if (!order) {
      throw new Error('Order not found');
    }

    // Check if already synced
    if (order.shiprocket?.synced && order.shiprocket?.orderId) {
      await session.commitTransaction();
      return order.shiprocket;
    }

    // Get token
    const token = await getShiprocketToken();

    // Prepare order items
    const orderItems = order.items.map(item => {
      const product = item.productId || {};
      return {
        name: item.name || product.name,
        sku: item.sku || product.sku || `SKU-${item.productId}`,
        units: item.quantity,
        selling_price: item.price,
        discount: item.originalPrice ? (item.originalPrice - item.price) * item.quantity : 0,
        tax: 0,
        hsn: product.hsnCode || '0000'
      };
    });

    // Prepare pickup location
    const pickupLocation = PICKUP_LOCATION || 'Primary';

    // Shiprocket order payload
    const shiprocketPayload = {
      order_id: order.orderNumber,
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: pickupLocation,
      channel_id: '',
      comment: order.notes || '',
      billing_customer_name: order.customerName,
      billing_last_name: '',
      billing_address: order.shippingAddress.address || order.shippingAddress,
      billing_address_2: order.shippingAddress.address2 || '',
      billing_city: order.shippingAddress.city,
      billing_pincode: order.shippingAddress.pincode,
      billing_state: order.shippingAddress.state,
      billing_country: order.shippingAddress.country || 'India',
      billing_email: order.customerEmail,
      billing_phone: order.customerPhone,
      shipping_is_billing: true,
      shipping_address: order.shippingAddress.address || order.shippingAddress,
      shipping_address_2: order.shippingAddress.address2 || '',
      shipping_city: order.shippingAddress.city,
      shipping_pincode: order.shippingAddress.pincode,
      shipping_state: order.shippingAddress.state,
      shipping_country: order.shippingAddress.country || 'India',
      shipping_email: order.customerEmail,
      shipping_phone: order.customerPhone,
      order_items: orderItems,
      payment_method: 'Prepaid',
      shipping_charge: order.shippingCost || 0,
      giftwrap_charge: 0,
      transaction_charge: 0,
      adjustment_amount: 0,
      total_discount: order.discount || 0,
      sub_total: order.subtotal || order.total,
      length: DEFAULT_LENGTH,
      breadth: DEFAULT_BREADTH,
      height: DEFAULT_HEIGHT,
      weight: DEFAULT_WEIGHT,
      customer_gstin: '',
      invoice_number: '',
      invoice_date: ''
    };

    // Create order in Shiprocket
    const response = await axios.post(`${BASE_URL}/orders/create/adhoc`, shiprocketPayload, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 15000
    });

    if (response.data) {
      // Update order with Shiprocket details
      order.shiprocket = {
        orderId: response.data.order_id,
        shipmentId: response.data.shipment_id,
        awbCode: response.data.awb_code,
        courierName: response.data.courier_name,
        courierCompanyId: response.data.courier_company_id,
        status: 'created',
        synced: true,
        syncedAt: new Date(),
        syncAttempts: attempt
      };

      // Update order status
      order.status = 'processing';
      
      await order.save({ session });
      await session.commitTransaction();

      console.log(`✅ Shiprocket order created: ${order.orderNumber} (Attempt ${attempt})`);
      
      return order.shiprocket;
    }

    throw new Error('Shiprocket order creation failed');

  } catch (error) {
    await session.abortTransaction();

    // Update sync attempt count
    await Order.updateOne(
      { _id: orderId },
      { 
        $inc: { 'shiprocket.syncAttempts': 1 },
        $set: { 
          'shiprocket.lastSyncError': error.message,
          'shiprocket.synced': false
        }
      }
    );

    // Retry logic
    if (attempt < maxRetries) {
      console.log(`🔄 Retry ${attempt + 1}/${maxRetries} for order ${orderId} in ${attempt * 3000}ms`);
      
      setTimeout(() => {
        createShiprocketOrderWithRetry(orderId, maxRetries, attempt + 1);
      }, attempt * 3000); // Exponential backoff
    } else {
      console.error(`❌ Max retries (${maxRetries}) reached for order ${orderId}`);
      
      // Notify admin about sync failure
      notifyAdminShiprocketFailure(orderId, error.message);
    }

    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Public wrapper with fallback
 */
exports.createShiprocketOrderWithFallback = async (orderId, options = {}) => {
  try {
    return await exports.createShiprocketOrder(orderId, options);
  } catch (error) {
    console.error(`Shiprocket order creation failed for ${orderId}:`, error.message);
    
    // Mark as not synced but don't block order
    await Order.updateOne(
      { _id: orderId },
      { 
        $set: { 
          'shiprocket.synced': false,
          'shiprocket.lastSyncError': error.message,
          'shiprocket.syncAttempts': 1
        }
      }
    );
    
    return { synced: false, error: error.message };
  }
};

/**
 * Track shipment
 */
exports.trackShipment = async (req, res) => {
  try {
    const { awbCode } = req.params;

    if (!awbCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'AWB code is required' 
      });
    }

    const token = await getShiprocketToken();

    const response = await axios.get(`${BASE_URL}/courier/track/awb/${awbCode}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 8000
    });

    // Update order tracking info if found
    const order = await Order.findOne({ 'shiprocket.awbCode': awbCode });
    if (order) {
      order.tracking = {
        number: awbCode,
        currentStatus: response.data.tracking_data?.shipment_status || 'in_transit',
        location: response.data.tracking_data?.current_location,
        lastUpdate: new Date()
      };
      await order.save();
    }

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('Tracking error:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tracking details' 
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

const getFallbackShipping = () => ({
  courier_id: 'standard',
  courier_name: 'Standard Shipping',
  rate: process.env.FLAT_SHIPPING_RATE ? parseFloat(process.env.FLAT_SHIPPING_RATE) : 50,
  estimated_delivery_days: '5-7',
  etd: '5-7 business days',
  is_fallback: true
});

const calculateTotalRate = (courier) => {
  return (courier.freight_charge || 0) + 
         (courier.fuel_surcharge || 0) + 
         (courier.cod_charges || 0) + 
         (courier.rto_charges || 0) + 
         (courier.other_charges || 0);
};

const notifyAdminShiprocketFailure = (orderId, error) => {
  // Implement admin notification (email, slack, etc.)
  console.error(`🚨 SHIPROCKET SYNC FAILED - Order: ${orderId}, Error: ${error}`);
};