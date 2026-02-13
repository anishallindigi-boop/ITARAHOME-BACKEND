const axios = require('axios');
const Order = require('../models/Order');

// ============================================
// SHIPROCKET CONFIGURATION
// ============================================
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const SHIPROCKET_BASE_URL = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';
const SHIPROCKET_PICKUP_LOCATION = process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary';
const MAX_RETRY_ATTEMPTS = parseInt(process.env.SHIPROCKET_MAX_RETRY || '3');
const RETRY_DELAY_MS = parseInt(process.env.SHIPROCKET_RETRY_DELAY || '5000');

// Token cache
let shiprocketToken = null;
let tokenExpiry = null;

// ============================================
// SHIPROCKET API SERVICE
// ============================================
class ShiprocketService {
  
  static async getToken(forceRefresh = false) {
    try {
      if (!forceRefresh && shiprocketToken && tokenExpiry && Date.now() < tokenExpiry) {
        return shiprocketToken;
      }

      if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
        throw new Error('Shiprocket credentials not configured');
      }

      const response = await axios.post(`${SHIPROCKET_BASE_URL}/auth/login`, {
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data?.token) {
        shiprocketToken = response.data.token;
        tokenExpiry = Date.now() + (23 * 60 * 60 * 1000); // 23 hours
        return shiprocketToken;
      }
      
      throw new Error('Invalid response from Shiprocket');
    } catch (error) {
      console.error('❌ Shiprocket Auth Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Shiprocket authentication failed: ${error.message}`);
    }
  }

  static async createOrder(orderData, retryCount = 0) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${SHIPROCKET_BASE_URL}/orders/create/adhoc`,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );

      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      // Token expired - refresh and retry once
      if (error.response?.status === 401 && retryCount === 0) {
        await this.getToken(true);
        return this.createOrder(orderData, retryCount + 1);
      }

      throw error;
    }
  }

  static async trackOrder(awbCode) {
    try {
      const token = await this.getToken();
      
      const response = await axios.get(
        `${SHIPROCKET_BASE_URL}/courier/track/awb/${awbCode}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Shiprocket Tracking Error:', error.response?.data || error.message);
      throw error;
    }
  }

  static async cancelOrder(shipmentId) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${SHIPROCKET_BASE_URL}/orders/cancel`,
        { shipment_id: shipmentId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Shiprocket Cancel Error:', error.response?.data || error.message);
      throw error;
    }
  }

  static async generateLabel(shipmentId) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${SHIPROCKET_BASE_URL}/courier/generate/label`,
        { shipment_id: shipmentId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Shiprocket Label Generation Error:', error.response?.data || error.message);
      throw error;
    }
  }

  static async generateManifest(shipmentIds) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(
        `${SHIPROCKET_BASE_URL}/manifests/generate`,
        { shipment_id: shipmentIds },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Shiprocket Manifest Generation Error:', error.response?.data || error.message);
      throw error;
    }
  }

  static async checkServiceability(pincode, weight = 0.5, cod = false) {
    try {
      const token = await this.getToken();
      
      const response = await axios.get(
        `${SHIPROCKET_BASE_URL}/courier/serviceability/`,
        {
          params: {
            pickup_postcode: process.env.SHIPROCKET_PICKUP_PINCODE || '110001',
            delivery_postcode: pincode,
            weight: weight,
            cod: cod ? 1 : 0,
            declared_value: 1000
          },
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Shiprocket Serviceability Error:', error.response?.data || error.message);
      throw error;
    }
  }
}

// ============================================
// SHIPROCKET ORDER PREPARATION
// ============================================
const prepareShiprocketOrderPayload = (order) => {
  if (!order) throw new Error('Order is required');

  // Calculate total weight (default 0.5kg per item if not specified)
  const totalWeight = order.items.reduce((acc, item) => {
    const itemWeight = item.productId?.weight || 0.5;
    return acc + (itemWeight * item.quantity);
  }, 0);

  // Prepare order items
  const orderItems = order.items.map(item => ({
    name: (item.name || item.productId?.name || 'Product').substring(0, 100),
    sku: item.sku || item.productId?.sku || `SKU${item.productId}`,
    units: item.quantity,
    selling_price: Math.round(item.price),
    discount: 0,
    tax: Math.round((item.price * (order.tax || 0)) / 100)
  }));

  // Prepare payload
  return {
    order_id: order.orderNumber,
    order_date: order.createdAt.toISOString().split('T')[0],
    pickup_location: SHIPROCKET_PICKUP_LOCATION,
    billing_customer_name: (order.customerName || 'Customer').substring(0, 50),
    billing_last_name: '',
    billing_address: (order.shippingAddress.addressLine1 || '').substring(0, 100),
    billing_address_2: (order.shippingAddress.addressLine2 || '').substring(0, 100),
    billing_city: (order.shippingAddress.city || '').substring(0, 50),
    billing_pincode: (order.shippingAddress.postalCode || '').substring(0, 10),
    billing_state: (order.shippingAddress.state || '').substring(0, 50),
    billing_country: (order.shippingAddress.country || 'India').substring(0, 50),
    billing_email: (order.customerEmail || '').substring(0, 100),
    billing_phone: (order.customerPhone || '').substring(0, 15),
    shipping_is_billing: true,
    shipping_customer_name: (order.customerName || 'Customer').substring(0, 50),
    shipping_last_name: '',
    shipping_address: (order.shippingAddress.addressLine1 || '').substring(0, 100),
    shipping_address_2: (order.shippingAddress.addressLine2 || '').substring(0, 100),
    shipping_city: (order.shippingAddress.city || '').substring(0, 50),
    shipping_pincode: (order.shippingAddress.postalCode || '').substring(0, 10),
    shipping_state: (order.shippingAddress.state || '').substring(0, 50),
    shipping_country: (order.shippingAddress.country || 'India').substring(0, 50),
    shipping_email: (order.customerEmail || '').substring(0, 100),
    shipping_phone: (order.customerPhone || '').substring(0, 15),
    order_items: orderItems,
    payment_method: 'Prepaid',
    sub_total: Math.round(order.subtotal || 0),
    length: parseInt(process.env.SHIPROCKET_DEFAULT_LENGTH || '10'),
    breadth: parseInt(process.env.SHIPROCKET_DEFAULT_BREADTH || '10'),
    height: parseInt(process.env.SHIPROCKET_DEFAULT_HEIGHT || '10'),
    weight: Math.max(0.5, Math.round(totalWeight * 100) / 100),
    ...(order.notes && { comment: order.notes.substring(0, 200) })
  };
};

// ============================================
// CREATE SHIPROCKET ORDER (EXPORTED FUNCTION)
// ============================================
const createShiprocketOrder = async (order) => {
  try {
    console.log(`🚀 [Shiprocket] Creating order for: ${order.orderNumber}`);
    
    const payload = prepareShiprocketOrderPayload(order);
    console.log(`📦 [Shiprocket] Payload prepared for: ${order.orderNumber}`);
    
    const result = await ShiprocketService.createOrder(payload);
    
    console.log(`✅ [Shiprocket] Order created successfully:`, {
      orderId: result.data.order_id,
      shipmentId: result.data.shipment_id,
      awbCode: result.data.awb_code
    });
    
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error(`❌ [Shiprocket] Order creation failed:`, {
      orderNumber: order.orderNumber,
      error: error.response?.data || error.message
    });
    
    return {
      success: false,
      error: {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      }
    };
  }
};

// ============================================
// RETRY FAILED SHIPROCKET ORDERS
// ============================================
const retryFailedShiprocketOrders = async () => {
  try {
    console.log('🔄 [Cron] Checking for failed Shiprocket orders...');
    
    const failedOrders = await Order.findFailedShiprocketOrders();
    
    console.log(`📊 [Cron] Found ${failedOrders.length} failed orders to retry`);
    
    for (const order of failedOrders) {
      try {
        if (order.shiprocketDetails?.retryCount >= MAX_RETRY_ATTEMPTS) {
          console.log(`⚠️ [Cron] Order ${order.orderNumber} exceeded max retry attempts`);
          continue;
        }

        console.log(`🔄 [Cron] Retrying order ${order.orderNumber}, attempt ${order.shiprocketDetails?.retryCount + 1}/${MAX_RETRY_ATTEMPTS}`);
        
        order.incrementShiprocketRetry();
        await order.save();
        
        const result = await createShiprocketOrder(order);
        
        if (result.success) {
          order.updateShiprocketDetails(result.data);
          await order.save();
          console.log(`✅ [Cron] Successfully retried order ${order.orderNumber}`);
        } else {
          order.addShiprocketError(result.error, order.shiprocketDetails.retryCount);
          await order.save();
        }
        
        // Delay between retries
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        
      } catch (error) {
        console.error(`❌ [Cron] Error retrying order ${order.orderNumber}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ [Cron] Failed to retry Shiprocket orders:', error.message);
  }
};

// ============================================
// SHIPPING CALCULATION API
// ============================================
const calculateShipping = async (req, res) => {
  try {
    const { 
      delivery_postcode, 
      weight = 0.5, 
      cod = false 
    } = req.body;

    if (!delivery_postcode) {
      return res.status(400).json({
        success: false,
        message: 'Delivery pincode is required'
      });
    }

    const result = await ShiprocketService.checkServiceability(delivery_postcode, weight, cod);
    
    if (!result.success || !result.data?.data?.available_courier_companies) {
      return res.status(200).json({
        success: true,
        data: [],
        serviceable: false,
        message: 'No shipping options available for this pincode'
      });
    }

    const couriers = result.data.data.available_courier_companies;
    
    const shippingOptions = couriers.map(courier => ({
      courier_id: courier.id || courier.courier_company_id,
      courier_name: courier.courier_name || 'Standard Courier',
      rate: courier.rate || courier.freight_charge || 50,
      estimated_delivery_days: courier.estimated_delivery_days || '3-5',
      etd: courier.etd || '3-5 business days',
      cod_available: courier.cod_available === 1,
      is_surface: courier.is_surface === true,
      is_air: courier.mode === 1,
      realtime_tracking: courier.realtime_tracking === 1,
      pickup_availability: courier.pickup_availability
    }));

    // Sort by cheapest rate
    shippingOptions.sort((a, b) => a.rate - b.rate);

    return res.status(200).json({
      success: true,
      data: shippingOptions,
      serviceable: shippingOptions.length > 0,
      message: shippingOptions.length > 0 
        ? 'Shipping options fetched successfully' 
        : 'No shipping options available',
      total_options: shippingOptions.length
    });

  } catch (error) {
    console.error('❌ Shipping calculation error:', error.message);
    
    // Return fallback shipping option on error
    return res.status(200).json({
      success: true,
      data: [{
        courier_id: 'standard',
        courier_name: 'Standard Shipping',
        rate: 50,
        estimated_delivery_days: '5-7',
        etd: '5-7 business days',
        is_fallback: true
      }],
      serviceable: true,
      message: 'Using fallback shipping rates'
    });
  }
};

// ============================================
// WEBHOOK HANDLER FOR SHIPROCKET UPDATES
// ============================================
const handleShiprocketWebhook = async (req, res) => {
  try {
    const { order_id, shipment_id, awb, status, data } = req.body;

    console.log(`📦 [Webhook] Shiprocket update received:`, { order_id, shipment_id, awb, status });

    const order = await Order.findOne({ 
      $or: [
        { orderNumber: order_id },
        { 'shiprocketDetails.shipmentId': shipment_id },
        { 'shiprocketDetails.awbCode': awb }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Initialize shiprocketDetails if not exists
    if (!order.shiprocketDetails) {
      order.shiprocketDetails = {};
    }

    // Update status
    const statusMap = {
      'PICKUP': 'pickup',
      'SHIPPED': 'shipped',
      'DELIVERED': 'delivered',
      'CANCELLED': 'cancelled',
      'RTO': 'cancelled',
      'OUT_FOR_DELIVERY': 'shipped'
    };

    order.shiprocketDetails.status = statusMap[status] || order.shiprocketDetails.status;
    
    // Add to webhook events
    if (!order.shiprocketDetails.webhookEvents) {
      order.shiprocketDetails.webhookEvents = [];
    }
    
    order.shiprocketDetails.webhookEvents.push({
      event: status,
      data: req.body,
      receivedAt: new Date()
    });

    // Update timestamps
    if (status === 'SHIPPED' || status === 'OUT_FOR_DELIVERY') {
      order.shippedAt = new Date();
      order.shiprocketDetails.shippedAt = new Date();
      order.status = 'shipped';
    } else if (status === 'DELIVERED') {
      order.deliveredAt = new Date();
      order.shiprocketDetails.deliveredAt = new Date();
      order.status = 'delivered';
    } else if (status === 'CANCELLED' || status === 'RTO') {
      order.shiprocketDetails.cancelledAt = new Date();
      order.shiprocketDetails.rtoReason = data?.reason;
      order.shiprocketDetails.isRto = status === 'RTO';
    }

    await order.save();

    res.status(200).json({ success: true, message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('❌ Shiprocket webhook error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process webhook' });
  }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================
module.exports = {
  // Main export - used by orderController
  createShiprocketOrder,
  
  // API endpoints
  calculateShipping,
  handleShiprocketWebhook,
  
  // Retry mechanism
  retryFailedShiprocketOrders,
  
  // Shiprocket service for advanced operations
  ShiprocketService,
  prepareShiprocketOrderPayload
};