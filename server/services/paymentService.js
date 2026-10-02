"use strict";

const crypto = require("crypto");
const Order = require("../models/order");
const Product = require("../models/product");
const InventoryService = require("./inventoryService");
const CouponService = require("./couponService");
const { transitionOrder } = require("./orderStateService");

// Statuses that mean "payment already recorded and the order is live".
const CONFIRMED_STATUSES = [
  "confirmed",
  "packing",
  "ready",
  "assigned",
  "picked_up",
  "out_for_delivery",
  "delivered",
];

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
   *
   * Concurrency-safe and idempotent: the pending -> confirmed transition is a
   * single atomic compare-and-set (see orderStateService), so when the client
   * verify call and the Razorpay webhook arrive together exactly one of them
   * commits inventory / records coupon usage and the other reports
   * `alreadyConfirmed`.
   *
   * Late payments are handled explicitly instead of corrupting stock:
   *  - order was marked payment_failed (earlier failure / expired reservation)
   *    and the customer then paid successfully: stock is re-reserved and the
   *    order is confirmed; if the stock is gone the order moves to
   *    refund_pending.
   *  - order was cancelled before the payment arrived: the order moves to
   *    refund_pending (money was received, stock was already released).
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
    if (this._isConfirmed(order)) {
      return { success: true, alreadyConfirmed: true, order };
    }

    // Verify signature (webhook signatures are verified at the route level)
    const paymentFields = {
      paymentStatus: "paid",
      razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
      razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId,
    };
    if (source === "webhook") {
      paymentFields.webhookVerified = true;
    } else {
      const isValid = this.verifySignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      if (!isValid) {
        throw new Error(
          "Invalid Razorpay payment signature. Payment verification failed.",
        );
      }
      paymentFields.signatureVerified = true;
      if (razorpaySignature) {
        paymentFields.razorpaySignature = razorpaySignature;
      }
    }

    const viaLabel =
      source === "webhook" ? "Razorpay webhook" : "client verification";
    const notPaidYet = { paymentStatus: { $ne: "paid" } };

    // Re-evaluate against fresh state if another request changes the order
    // between our attempts.
    for (let attempt = 0; attempt < 3; attempt++) {
      // 1) Normal path: the order is waiting for payment (stock is reserved).
      //    "placed" covers an order whose stock was already committed at
      //    checkout (COD): it is confirmed without touching stock again.
      const won = await transitionOrder(orderId, {
        from: ["pending_payment", "placed"],
        to: "confirmed",
        set: paymentFields,
        note: `Payment verified via ${viaLabel} (Txn: ${razorpayPaymentId})`,
        filter: notPaidYet,
      });

      if (won) {
        if (won.previous.status === "pending_payment") {
          await InventoryService.commitReservation(won.previous.items);
          if (won.previous.couponCode) {
            await CouponService.recordCouponUsage(won.previous.couponCode);
          }
        }
        await won.order.populate("store", "name");
        return {
          success: true,
          message: "Payment verified and order confirmed",
          order: won.order,
        };
      }

      // 2) Lost (or the order was never payable): look at the current state.
      const latest = await Order.findById(orderId).populate("store", "name");
      if (!latest) {
        throw new Error("Order not found");
      }

      if (latest.paymentStatus === "paid") {
        if (this._isConfirmed(latest)) {
          return { success: true, alreadyConfirmed: true, order: latest };
        }
        return {
          success: false,
          requiresRefund: latest.status === "refund_pending",
          message: `Payment was already recorded for this order (status: ${latest.status})`,
          order: latest,
        };
      }

      // 3) Earlier failure / expired reservation, then the customer paid:
      //    re-reserve the stock and confirm if it is still available.
      if (latest.status === "payment_failed") {
        let reserved = true;
        try {
          await InventoryService.reserveStock(latest.items, 15);
        } catch {
          reserved = false;
        }

        if (reserved) {
          const revived = await transitionOrder(orderId, {
            from: ["payment_failed"],
            to: "confirmed",
            set: paymentFields,
            note: `Payment verified via ${viaLabel} after an earlier failure; stock re-reserved (Txn: ${razorpayPaymentId})`,
            filter: notPaidYet,
          });
          if (revived) {
            await InventoryService.commitReservation(revived.previous.items);
            if (revived.previous.couponCode) {
              await CouponService.recordCouponUsage(
                revived.previous.couponCode,
              );
            }
            await revived.order.populate("store", "name");
            return {
              success: true,
              message: "Payment verified and order confirmed",
              order: revived.order,
            };
          }
          // Someone else changed the order first: give the stock back, retry.
          await InventoryService.releaseReservation(latest.items);
          continue;
        }
      }

      // 4) Payment received but the order cannot be fulfilled (cancelled, or
      //    stock sold out in the meantime): queue a refund.
      if (["cancelled", "payment_failed"].includes(latest.status)) {
        const queued = await transitionOrder(orderId, {
          from: [latest.status],
          to: "refund_pending",
          set: paymentFields,
          note: `Payment received (Txn: ${razorpayPaymentId}) but the order was ${
            latest.status === "cancelled" ? "cancelled" : "no longer reservable"
          }; refund queued`,
          filter: notPaidYet,
        });
        if (queued) {
          await queued.order.populate("store", "name");
          return {
            success: false,
            requiresRefund: true,
            message:
              "Payment was received after the order could no longer be fulfilled. A refund has been queued.",
            order: queued.order,
          };
        }
        continue;
      }

      throw new Error(
        `Cannot confirm payment for order in status: ${latest.status}`,
      );
    }

    throw new Error(
      "Order state changed while confirming payment. Please retry.",
    );
  }

  static _isConfirmed(order) {
    return (
      order.paymentStatus === "paid" &&
      CONFIRMED_STATUSES.includes(order.status)
    );
  }

  /**
   * Handle payment failure.
   * Releases inventory reservation and updates order status.
   */
  static async handlePaymentFailure({
    orderId,
    razorpayOrderId,
    razorpayPaymentId,
    reason,
  }) {
    const order = await Order.findById(orderId);
    if (!order) {
      // Try finding by razorpayOrderId
      const orderByRzp = await Order.findOne({ razorpayOrderId });
      if (!orderByRzp) throw new Error("Order not found");
      return this._failOrder(orderByRzp, razorpayPaymentId, reason);
    }
    return this._failOrder(order, razorpayPaymentId, reason);
  }

  /**
   * Atomically fails an order that is still awaiting payment and releases its
   * reservation. A paid, cancelled or already-failed order is never touched,
   * and the reservation is released exactly once.
   */
  static async _failOrder(order, razorpayPaymentId, reason) {
    const won = await transitionOrder(order._id, {
      from: ["pending_payment"],
      to: "payment_failed",
      set: {
        paymentStatus: "failed",
        ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
      },
      note: `Payment failed. ${reason || "No reason provided."}`,
      filter: { paymentStatus: { $ne: "paid" } },
    });

    if (won) {
      // Release reserved inventory
      await InventoryService.releaseReservation(won.previous.items);
      return {
        success: true,
        message: "Payment failure recorded, inventory released",
        order: won.order,
      };
    }

    const latest = await Order.findById(order._id);
    if (!latest) throw new Error("Order not found");
    if (latest.paymentStatus === "paid") {
      return {
        success: false,
        message: "Order already paid — cannot mark as failed",
      };
    }
    if (latest.status === "payment_failed") {
      return { success: true, alreadyFailed: true, order: latest };
    }
    return {
      success: false,
      message: `Order is no longer awaiting payment (status: ${latest.status})`,
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
