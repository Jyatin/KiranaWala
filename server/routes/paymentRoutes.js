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
  let eventId;
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.get("x-razorpay-signature");
    eventId = req.get("x-razorpay-event-id");

    if (!secret) return res.status(503).json({ success: false, message: "Webhook verification is not configured" });
    if (!signature) return res.status(400).json({ success: false, message: "Missing webhook signature" });
    if (!eventId) return res.status(400).json({ success: false, message: "Missing Razorpay event ID" });
    if (!Buffer.isBuffer(req.body)) return res.status(400).json({ success: false, message: "Expected raw JSON request body" });

    const expected = crypto.createHmac("sha256", secret).update(req.body).digest();
    const supplied = Buffer.from(signature, "hex");
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(expected, supplied)) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    let body;
    try { body = JSON.parse(req.body.toString("utf8")); }
    catch { return res.status(400).json({ success: false, message: "Malformed webhook JSON" }); }

    const WebhookEvent = require("../models/webhookEvent");
    const now = new Date();
    const staleBefore = new Date(now.getTime() - 5 * 60 * 1000);
    try {
      await WebhookEvent.create({ eventId, eventType: body.event || "unknown", status: "processing", processingStartedAt: now });
    } catch (err) {
      if (err.code !== 11000) throw err;
      const existing = await WebhookEvent.findOne({ eventId });
      if (existing?.status === "processed") return res.status(200).json({ status: "ok", duplicate: true });
      const reclaimed = await WebhookEvent.findOneAndUpdate(
        { eventId, $or: [{ status: "failed" }, { status: "processing", processingStartedAt: { $lt: staleBefore } }] },
        { $set: { status: "processing", processingStartedAt: now, lastError: "" }, $inc: { attempts: 1 } },
        { new: true },
      );
      if (!reclaimed) return res.status(500).json({ success: false, message: "Webhook event is already being processed" });
    }

    try {
      const event = body.event;
      const payment = body.payload?.payment?.entity;
      if (event === "payment.captured" && payment) {
        const order = await Order.findOne({ razorpayOrderId: payment.order_id });
        if (order && order.paymentStatus !== "paid" && order.paymentStatus !== "captured") {
          await PaymentService.confirmPayment({ orderId: order._id, razorpayOrderId: payment.order_id, razorpayPaymentId: payment.id, razorpaySignature: "webhook_verified", source: "webhook" });
        }
      } else if (event === "payment.failed" && payment) {
        const order = await Order.findOne({ razorpayOrderId: payment.order_id });
        if (order && order.paymentStatus !== "paid" && order.paymentStatus !== "captured") {
          await PaymentService.handlePaymentFailure({ orderId: order._id, razorpayOrderId: payment.order_id, razorpayPaymentId: payment.id, reason: payment.error_description || "Payment failed via webhook" });
        }
      } else if (event === "refund.created") {
        const refund = body.payload?.refund?.entity;
        if (refund) {
          const order = await Order.findOne({ razorpayPaymentId: refund.payment_id });
          if (order && !["refunded", "refund_pending"].includes(order.paymentStatus)) {
            order.paymentStatus = "refund_pending";
            order.status = "refund_pending";
            order.timeline = order.timeline || [];
            order.timeline.push({ status: "refund_pending", note: `Refund initiated (Refund ID: ${refund.id})`, timestamp: new Date() });
            order.webhookVerified = true;
            await order.save();
          }
        }
      } else if (event === "refund.processed") {
        const refund = body.payload?.refund?.entity;
        if (refund) {
          const order = await Order.findOne({ razorpayPaymentId: refund.payment_id });
          if (order && order.paymentStatus !== "refunded") {
            order.paymentStatus = "refunded";
            order.status = "refunded";
            order.timeline = order.timeline || [];
            order.timeline.push({ status: "refunded", note: `Refund processed (Refund ID: ${refund.id}, Amount: ₹${refund.amount / 100})`, timestamp: new Date() });
            order.webhookVerified = true;
            await order.save();
            const Product = require("../models/product");
            for (const item of order.items) {
              if (item.product) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity, availableStock: item.quantity, soldStock: -item.quantity } });
            }
          }
        }
      }
      await WebhookEvent.updateOne({ eventId, status: "processing" }, { $set: { status: "processed", processedAt: new Date(), lastError: "" } });
      return res.status(200).json({ status: "ok" });
    } catch (err) {
      await WebhookEvent.updateOne({ eventId, status: "processing" }, { $set: { status: "failed", lastError: String(err.message || err).slice(0, 1000) } }).catch((ledgerErr) => console.error("[Webhook] Could not record failure:", ledgerErr.message));
      throw err;
    }
  } catch (err) {
    console.error("[Webhook] processing error:", err);
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
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
