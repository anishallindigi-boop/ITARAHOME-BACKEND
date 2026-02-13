const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authorizationUser, authorizationRoles } = require('../middleware/authMiddleware');

// ============================================
// PUBLIC ROUTES (Customer)
// ============================================

/**
 * @route   POST /api/orders
 * @desc    Create a new order (without payment)
 * @access  Public/Private (optional authentication)
 */
router.post("/create", orderController.createOrder);

/**
 * @route   POST /api/orders/initiate-payment
 * @desc    Initiate payment for an order
 * @access  Public
 * @body    { orderId: "order_id" }
 */
router.post("/initiate-payment", orderController.initiatePayment);

/**
 * @route   POST /api/orders/payment-callback
 * @desc    Payment gateway callback/webhook
 * @access  Public (called by payment gateway)
 */
router.post("/payment-callback", orderController.paymentCallback);

/**
 * @route   GET /api/orders/payment-callback
 * @desc    Payment gateway redirect (GET method)
 * @access  Public (called by payment gateway)
 */
router.get("/payment-callback", orderController.paymentCallback);

/**
 * @route   GET /api/orders/payment-status/:orderNumber
 * @desc    Check payment status of an order
 * @access  Public
 */
router.get("/payment-status/:orderNumber", orderController.checkPaymentStatus);

/**
 * @route   GET /api/orders/order-number/:orderNumber
 * @desc    Get order by order number
 * @access  Public (for order tracking)
 */
router.get("/order-number/:orderNumber", orderController.getOrderByOrderNumber);

/**
 * @route   GET /api/orders/customer
 * @desc    Get all orders for logged-in customer
 * @access  Private (Customer)
 */
router.get("/customer", authorizationUser, orderController.getOrdersByCustomer);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * @route   GET /api/orders
 * @desc    Get all orders (with filters)
 * @access  Private (Admin)
 * @query   status, paymentStatus, page, limit, search
 */
router.get("/", authorizationUser, authorizationRoles("admin"), orderController.getAllOrders);

/**
 * @route   GET /api/orders/stats
 * @desc    Get order statistics
 * @access  Private (Admin)
 */
router.get("/stats", authorizationUser, authorizationRoles("admin"), orderController.getOrderStats);

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by ID
 * @access  Private (Admin)
 */
router.get("/:id", authorizationUser, authorizationRoles("admin"), orderController.getOrderById);

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status
 * @access  Private (Admin)
 * @body    { status, trackingNumber, trackingUrl, carrier }
 */
router.patch("/:id/status", authorizationUser, authorizationRoles("admin"), orderController.updateOrderStatus);

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel an order
 * @access  Private (Admin or Customer)
 * @body    { reason }
 */
router.post("/:id/cancel", authorizationUser, orderController.cancelOrder);

/**
 * @route   POST /api/orders/:id/refund
 * @desc    Initiate refund for an order
 * @access  Private (Admin)
 * @body    { amount, reason }
 */
router.post("/:id/refund", authorizationUser, authorizationRoles("admin"), orderController.initiateRefund);

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete an order (only unpaid orders)
 * @access  Private (Admin)
 */
router.delete("/:id", authorizationUser, authorizationRoles("admin"), orderController.deleteOrder);

module.exports = router;