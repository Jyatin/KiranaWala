"use strict";

const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const PaymentService = require("../services/paymentService");
const Order = require("../models/order");
const { authenticateToken, requireRole, requireCustomer } = require("../middleware/authMiddleware");

// =====================================================
// POST /api/payments/create-order
// Create Razorpay order for a pending-payment order.
// NEVER trusts frontend-provided amount.
// =====================================================
router.post("/create-order", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id || req.user.userId;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required",
      });
    }

    // Verify the order belongs to the authenticated user
    const order = await Order.findOne({ _id: orderId, customer: userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or unauthorized",
      });
    }

    // Create Razorpay order using SERVER-CALCULATED total (never frontend amount)
    const paymentOrder = await PaymentService.createOrder({
      orderId,
    });

    res.json({
      success: true,
      ...paymentOrder,
    });
  } catch (err) {
    console.error("[PaymentRoutes] create-order error:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// =====================================================
// POST /api/payments/verify
// Server-side Razorpay payment signature verification.
// Only transitions payment to paid AFTER cryptographic verification.
// =====================================================
router.post("/verify", authenticateToken, async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      req.body;
    const userId = req.user.id || req.user.userId;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message:
          "orderId, razorpayOrderId, and razorpayPaymentId are required",
      });
    }

    // Verify order ownership
    const order = await Order.findOne({ _id: orderId, customer: userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or unauthorized",
      });
    }

    // Verify that the razorpayOrderId matches
    if (order.razorpayOrderId && order.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order ID mismatch",
      });
    }

    const result = await PaymentService.confirmPayment({
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      source: "api",
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[PaymentRoutes] verify error:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// =====================================================
// POST /api/payments/webhook
// Idempotent Razorpay Webhook Handler.
// Handles: payment.captured, payment.failed, refund.created, refund.processed
// =====================================================
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    // Parse body — handle both raw buffer and already-parsed JSON
    let body;
    if (Buffer.isBuffer(req.body)) {
      body = JSON.parse(req.body.toString("utf8"));
    } else {
      body = req.body;
    }

    // Validate webhook signature if secret is configured
    if (webhookSecret && signature) {
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : JSON.stringify(req.body);
      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSig !== signature) {
        console.error("[Webhook] Invalid signature");
        return res
          .status(400)
          .json({ success: false, message: "Invalid webhook signature" });
      }
    }

    const event = body.event;
    const paymentEntity = body.payload?.payment?.entity;

    // ── payment.captured ──
    if (event === "payment.captured" && paymentEntity) {
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      const order = await Order.findOne({ razorpayOrderId });
      if (order && order.paymentStatus !== "paid" && order.paymentStatus !== "captured") {
        await PaymentService.confirmPayment({
          orderId: order._id,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: "webhook_verified",
          source: "webhook",
        });
        console.log(`[Webhook] payment.captured processed for order ${order._id}`);
      }
      // Idempotent: if already paid, silently acknowledge
    }

    // ── payment.failed ──
    if (event === "payment.failed" && paymentEntity) {
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;
      const failureReason =
        paymentEntity.error_description || "Payment failed via webhook";

      const order = await Order.findOne({ razorpayOrderId });
      if (order && order.paymentStatus !== "paid" && order.paymentStatus !== "captured") {
        await PaymentService.handlePaymentFailure({
          orderId: order._id,
          razorpayOrderId,
          razorpayPaymentId,
          reason: failureReason,
        });
        console.log(`[Webhook] payment.failed processed for order ${order._id}`);
      }
    }

    // ── refund.created ──
    if (event === "refund.created") {
      const refundEntity = body.payload?.refund?.entity;
      if (refundEntity) {
        const razorpayPaymentId = refundEntity.payment_id;
        const order = await Order.findOne({ razorpayPaymentId });
        if (order && order.paymentStatus !== "refunded") {
          order.paymentStatus = "refund_pending";
          order.status = "refund_pending";
          order.timeline = order.timeline || [];
          order.timeline.push({
            status: "refund_pending",
            note: `Refund initiated (Refund ID: ${refundEntity.id})`,
            timestamp: new Date(),
          });
          order.webhookVerified = true;
          await order.save();
          console.log(`[Webhook] refund.created processed for order ${order._id}`);
        }
      }
    }

    // ── refund.processed ──
    if (event === "refund.processed") {
      const refundEntity = body.payload?.refund?.entity;
      if (refundEntity) {
        const razorpayPaymentId = refundEntity.payment_id;
        const order = await Order.findOne({ razorpayPaymentId });
        if (order && order.paymentStatus !== "refunded") {
          order.paymentStatus = "refunded";
          order.status = "refunded";
          order.timeline = order.timeline || [];
          order.timeline.push({
            status: "refunded",
            note: `Refund processed (Refund ID: ${refundEntity.id}, Amount: ₹${refundEntity.amount / 100})`,
            timestamp: new Date(),
          });
          order.webhookVerified = true;
          await order.save();

          // Restore stock
          for (const item of order.items) {
            if (item.product) {
              const Product = require("../models/product");
              await Product.updateOne(
                { _id: item.product },
                {
                  $inc: {
                    stock: item.quantity,
                    availableStock: item.quantity,
                    soldStock: -item.quantity,
                  },
                }
              ).catch(() => {});
            }
          }
          console.log(`[Webhook] refund.processed for order ${order._id}`);
        }
      }
    }

    // Always respond 200 to acknowledge the webhook
    res.json({ status: "ok" });
  } catch (err) {
    console.error("[Webhook] processing error:", err);
    // Still return 200 to prevent Razorpay from retrying indefinitely
    res.status(200).json({ status: "error", message: err.message });
  }
});

// =====================================================
// POST /api/payments/failure
// Record payment failure from frontend (e.g., user cancelled Razorpay checkout)
// =====================================================
router.post("/failure", authenticateToken, async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, reason } = req.body;
    const userId = req.user.id || req.user.userId;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    const order = await Order.findOne({ _id: orderId, customer: userId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found or unauthorized" });
    }

    const result = await PaymentService.handlePaymentFailure({
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      reason: reason || "Payment cancelled by customer",
    });

    res.json(result);
  } catch (err) {
    console.error("[PaymentRoutes] failure error:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// =====================================================
// POST /api/payments/refund
// Process refund (Admin or Store Owner only)
// =====================================================
router.post(
  "/refund",
  authenticateToken,
  requireRole("admin", "store-owner"),
  async (req, res) => {
    try {
      const { orderId, amount, reason } = req.body;
      const result = await PaymentService.processRefund({
        orderId,
        amount,
        reason,
      });
      res.json(result);
    } catch (err) {
      console.error("[PaymentRoutes] refund error:", err.message);
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
