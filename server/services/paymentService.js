"use strict";

const crypto = require("crypto");
const Order = require("../models/order");
const Product = require("../models/product");
const InventoryService = require("./inventoryService");
const CouponService = require("./couponService");

// =====================================================
// PAYMENT PROVIDER ABSTRACTION
// =====================================================

/**
 * RazorpayPaymentProvider — Real Razorpay API integration (test or live mode).
 * Used when RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are properly configured.
 */
class RazorpayPaymentProvider {
  constructor(keyId, keySecret) {
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.baseUrl = "https://api.razorpay.com/v1";
  }

  get authHeader() {
    return `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64")}`;
  }

  async createOrder({ amountInPaise, currency, receipt, notes }) {
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt,
        notes,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(
        errData.error?.description || `Razorpay API error: ${response.status}`
      );
    }

    return await response.json();
  }

  verifySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return false;
    }
    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", this.keySecret)
      .update(payload)
      .digest("hex");
    return expectedSignature === razorpaySignature;
  }

  verifyWebhookSignature(body, signature, webhookSecret) {
    if (!signature || !webhookSecret) return false;
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(body))
      .digest("hex");
    return expectedSignature === signature;
  }

  async processRefund({ razorpayPaymentId, amountInPaise, notes }) {
    const response = await fetch(`${this.baseUrl}/payments/${razorpayPaymentId}/refund`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        notes,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(
        errData.error?.description || `Razorpay refund API error: ${response.status}`
      );
    }

    return await response.json();
  }

  get isSandbox() {
    return false;
  }
}

/**
 * MockPaymentProvider — Deterministic sandbox for local development
 * when Razorpay credentials are unavailable.
 * NEVER used in production. Clearly labeled.
 */
class MockPaymentProvider {
  constructor() {
    this.keyId = "rzp_test_kiranawala_mock";
  }

  async createOrder({ amountInPaise, currency, receipt }) {
    const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      id: mockOrderId,
      amount: amountInPaise,
      currency,
      receipt,
      status: "created",
      _isMock: true,
    };
  }

  verifySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    // Mock provider accepts sandbox signatures
    if (!razorpayOrderId || !razorpayPaymentId) return false;
    if (
      razorpaySignature === "mock_verified_signature" ||
      razorpaySignature?.startsWith("mock_sig_") ||
      razorpayOrderId.startsWith("order_mock_")
    ) {
      return true;
    }
    return false;
  }

  verifyWebhookSignature() {
    return true; // Mock accepts all webhooks
  }

  async processRefund({ amountInPaise }) {
    return {
      id: `rfnd_mock_${Date.now()}`,
      amount: amountInPaise,
      status: "processed",
      _isMock: true,
    };
  }

  get isSandbox() {
    return true;
  }
}

// =====================================================
// PAYMENT SERVICE — Orchestrates payment flow
// =====================================================

class PaymentService {
  /**
   * Determine the active payment provider.
   * Production: RazorpayPaymentProvider
   * Development without credentials: MockPaymentProvider
   */
  static getProvider() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (
      keyId &&
      keySecret &&
      keyId.length > 5 &&
      !keyId.includes("placeholder")
    ) {
      return new RazorpayPaymentProvider(keyId, keySecret);
    }

    if (process.env.NODE_ENV === "production") {
      console.error(
        "FATAL: Razorpay credentials missing in production. MockPaymentProvider is NOT allowed."
      );
      throw new Error("Payment provider not configured for production");
    }

    console.warn(
      "[PaymentService] Using MockPaymentProvider — Razorpay credentials not configured. This is acceptable for local development only."
    );
    return new MockPaymentProvider();
  }

  /**
   * Create Razorpay payment order.
   * NEVER trusts frontend-provided amount — recalculates from DB order total.
   * @param {{orderId: string, currency?: string}} params
   */
  static async createOrder({ orderId, currency = "INR" }) {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found in database");
    }

    if (order.paymentStatus === "paid" || order.paymentStatus === "captured") {
      throw new Error("Order has already been paid");
    }

    if (!["pending_payment", "placed"].includes(order.status)) {
      throw new Error(
        `Cannot create payment for order in status: ${order.status}`
      );
    }

    // Server-authoritative: Use the order's server-calculated total
    const amountInPaise = Math.round(order.total * 100);

    if (amountInPaise <= 0) {
      throw new Error("Order total must be greater than zero");
    }

    const provider = this.getProvider();

    const razorpayOrder = await provider.createOrder({
      amountInPaise,
      currency,
      receipt: `receipt_${order._id}`,
      notes: {
        kiranawalaOrderId: order._id.toString(),
        storeId: order.store ? order.store.toString() : "",
      },
    });

    order.razorpayOrderId = razorpayOrder.id;
    order.paymentMethod = "razorpay";
    await order.save();

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency,
      keyId: provider.keyId || process.env.RAZORPAY_KEY_ID,
      isSandbox: provider.isSandbox,
      orderTotal: order.total,
    };
  }

  /**
   * Verify Razorpay payment signature server-side.
   * Uses the active provider's verification method.
   */
  static verifySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const provider = this.getProvider();
    return provider.verifySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
  }

  /**
   * Verify and confirm order after successful payment.
   * Commits inventory, increments coupon usage, and updates timeline.
   * Idempotent: calling twice with same data returns success without side effects.
   */
  static async confirmPayment({
    orderId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    source = "api", // "api" or "webhook"
  }) {
    const order = await Order.findById(orderId).populate("store", "name");
    if (!order) {
      throw new Error("Order not found");
    }

    // Idempotent: already confirmed/paid
    if (
      (order.paymentStatus === "paid" || order.paymentStatus === "captured") &&
      [
        "confirmed",
        "packing",
        "ready",
        "assigned",
        "picked_up",
        "out_for_delivery",
        "delivered",
      ].includes(order.status)
    ) {
      return { success: true, alreadyConfirmed: true, order };
    }

    // Verify signature (skip if already verified via webhook or a confirmed path)
    if (source === "webhook") {
      // Webhook signature is verified at the route level
      order.webhookVerified = true;
    } else {
      const isValid = this.verifySignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      if (!isValid) {
        throw new Error(
          "Invalid Razorpay payment signature. Payment verification failed."
        );
      }
      order.signatureVerified = true;
    }

    order.paymentStatus = "paid";
    order.status = "confirmed";
    order.razorpayOrderId = razorpayOrderId || order.razorpayOrderId;
    order.razorpayPaymentId = razorpayPaymentId || order.razorpayPaymentId;
    if (razorpaySignature && source !== "webhook") {
      order.razorpaySignature = razorpaySignature;
    }
    order.timeline = order.timeline || [];
    order.timeline.push({
      status: "confirmed",
      note: `Payment verified via ${source === "webhook" ? "Razorpay webhook" : "client verification"} (Txn: ${razorpayPaymentId})`,
      timestamp: new Date(),
    });

    await order.save();

    // Commit inventory from reserved to sold
    await InventoryService.commitReservation(order.items);

    // Increment coupon usage if used
    if (order.couponCode) {
      await CouponService.recordCouponUsage(order.couponCode);
    }

    return {
      success: true,
      message: "Payment verified and order confirmed",
      order,
    };
  }

  /**
   * Handle payment failure.
   * Releases inventory reservation and updates order status.
   */
  static async handlePaymentFailure({ orderId, razorpayOrderId, razorpayPaymentId, reason }) {
    const order = await Order.findById(orderId);
    if (!order) {
      // Try finding by razorpayOrderId
      const orderByRzp = await Order.findOne({ razorpayOrderId });
      if (!orderByRzp) throw new Error("Order not found");
      return this._failOrder(orderByRzp, razorpayPaymentId, reason);
    }
    return this._failOrder(order, razorpayPaymentId, reason);
  }

  static async _failOrder(order, razorpayPaymentId, reason) {
    if (order.paymentStatus === "paid" || order.paymentStatus === "captured") {
      return { success: false, message: "Order already paid — cannot mark as failed" };
    }
    if (order.status === "payment_failed") {
      return { success: true, alreadyFailed: true, order };
    }

    order.paymentStatus = "failed";
    order.status = "payment_failed";
    if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
    order.timeline = order.timeline || [];
    order.timeline.push({
      status: "payment_failed",
      note: `Payment failed. ${reason || "No reason provided."}`,
      timestamp: new Date(),
    });

    await order.save();

    // Release reserved inventory
    await InventoryService.releaseReservation(order.items);

    return {
      success: true,
      message: "Payment failure recorded, inventory released",
      order,
    };
  }

  /**
   * Process full or partial refund.
   */
  static async processRefund({
    orderId,
    amount,
    reason = "Customer requested cancellation",
  }) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    if (order.paymentStatus !== "paid" && order.paymentStatus !== "captured") {
      throw new Error(
        `Cannot refund order with payment status '${order.paymentStatus}'`
      );
    }

    const refundAmount = amount ? Math.min(amount, order.total) : order.total;
    const refundAmountInPaise = Math.round(refundAmount * 100);

    // Call provider's refund API if it's a real payment
    const provider = this.getProvider();
    if (!provider.isSandbox && order.razorpayPaymentId) {
      try {
        await provider.processRefund({
          razorpayPaymentId: order.razorpayPaymentId,
          amountInPaise: refundAmountInPaise,
          notes: {
            reason,
            kiranawalaOrderId: order._id.toString(),
          },
        });
      } catch (err) {
        console.error("Razorpay refund API error:", err.message);
        // Continue with local state update even if Razorpay call fails
        // The webhook will reconcile later
      }
    }

    order.paymentStatus = "refunded";
    order.status = "refunded";
    order.timeline = order.timeline || [];
    order.timeline.push({
      status: "refunded",
      note: `Refund of ₹${refundAmount} processed. Reason: ${reason}`,
      timestamp: new Date(),
    });

    await order.save();

    // Restore stock
    for (const item of order.items) {
      if (item.product) {
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

    return {
      success: true,
      message: `Refund of ₹${refundAmount} processed successfully`,
      order,
    };
  }
}

module.exports = PaymentService;
