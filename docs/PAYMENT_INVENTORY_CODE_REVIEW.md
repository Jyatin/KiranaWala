# Payment and Inventory Implementation Code Review

This document contains verbatim code extracts with file:line headers for the core payment, inventory, order lifecycle, and middleware stack of KiranaWala.

---

## Complete List of Order Status and PaymentStatus Mutations

The following is an exhaustive inventory of every location in the codebase that mutates `order.status` or `order.paymentStatus`:

1. **`server/routes/customerRoutes.js:1042-1043`** (`POST /api/customer/orders`):
   - `paymentStatus: paymentMethod === "cod" ? "pending" : "pending"`
   - `status: paymentMethod === "cod" ? "placed" : "pending_payment"`
2. **`server/routes/customerRoutes.js:1163`** (`PATCH /api/customer/orders/:orderId/cancel`):
   - `existingOrder.status = "cancelled"`
3. **`server/routes/storeRoutes.js:527`** (`PATCH /api/store/orders/:orderId/status`):
   - `order.status = status` (transitions: `placed`/`confirmed` $\rightarrow$ `packing` $\rightarrow$ `ready`)
4. **`server/routes/deliveryRoutes.js:108`** (`PATCH /api/delivery/orders/:id/claim`):
   - `order.status = "assigned"`
5. **`server/routes/deliveryRoutes.js:283`** (`PATCH /api/delivery/orders/:id/status`):
   - `order.status = status` (transitions: `ready` $\rightarrow$ `assigned` $\rightarrow$ `picked_up` $\rightarrow$ `out_for_delivery` $\rightarrow$ `delivered` / `cancelled`)
6. **`server/services/paymentService.js:314-315`** (`PaymentService.confirmPayment`):
   - `order.paymentStatus = "paid"`
   - `order.status = "confirmed"`
7. **`server/services/paymentService.js:368-369`** (`PaymentService._failOrder`):
   - `order.paymentStatus = "failed"`
   - `order.status = "payment_failed"`
8. **`server/services/paymentService.js:415-416`** (`PaymentService.processRefund` atomic claim):
   - `$set: { paymentStatus: "refund_pending", status: "refund_pending" }`
9. **`server/services/paymentService.js:470-471`** (`PaymentService.processRefund` rollback on error):
   - `$set: { paymentStatus: "paid", status: "confirmed" }`
10. **`server/services/paymentService.js:491-492`** (`PaymentService.processRefund` success):
    - `$set: { paymentStatus: "refunded", status: "refunded" }`
11. **`server/routes/paymentRoutes.js:211-212`** (`POST /api/payments/webhook` refund.created event):
    - `order.paymentStatus = "refund_pending"`
    - `order.status = "refund_pending"`
12. **`server/routes/paymentRoutes.js:233-234`** (`POST /api/payments/webhook` refund.processed event):
    - `order.paymentStatus = "refunded"`
    - `order.status = "refunded"`
13. **`server/services/inventoryService.js:143`** (`InventoryService.cleanupExpiredReservations`):
    - `order.status = "payment_failed"`

---

## 1. Order Model Schema (`server/models/order.js:1-158`)

```javascript
// file: server/models/order.js:1-158
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productNameSnapshot: {
    type: String,
    required: true,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  subtotal: {
    type: Number,
    required: true,
  },
});

const deliveryAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    default: "",
    trim: true,
  },
  pincode: {
    type: String,
    default: "",
    trim: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    items: [orderItemSchema],
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    couponCode: {
      type: String,
      default: "",
    },
    total: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["razorpay", "upi", "cod", "cards"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "refund_pending"],
      default: "pending",
    },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    signatureVerified: { type: Boolean, default: false },
    webhookVerified: { type: Boolean, default: false },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deliveryPartnerName: { type: String, default: "" },
    deliveryPartnerPhone: { type: String, default: "" },
    deliveryEtaMinutes: { type: Number, default: 18 },
    deliveryOtp: { type: String, default: "4291" },
    otpAttempts: { type: Number, default: 0 },
    otpLockedUntil: { type: Date, default: null },
    status: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "packing",
        "ready",
        "assigned",
        "picked_up",
        "out_for_delivery",
        "delivered",
        "pending_payment",
        "payment_failed",
        "cancelled",
        "refund_pending",
        "refunded",
        "processing",
        "completed",
      ],
      default: "placed",
      index: true,
    },
    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true },
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ store: 1, status: 1 });
orderSchema.index({ deliveryPartner: 1, status: 1 });

module.exports = mongoose.model("Order", orderSchema);
```

---

## 2. Inventory Service (`server/services/inventoryService.js:1-163`)

```javascript
// file: server/services/inventoryService.js:1-163
"use strict";

const mongoose = require("mongoose");
const Product = require("../models/product");
const Order = require("../models/order");

/**
 * Smart Inventory Service
 * Manages atomic inventory reservations, commits upon payment, and safe rollbacks.
 */
class InventoryService {
  /**
   * Atomically reserve stock for checkout.
   * @param {Array<{productId: string, quantity: number}>} items 
   * @param {number} ttlMinutes 
   * @returns {Promise<{success: boolean, expiresAt: Date, reservedItems: Array}>}
   */
  static async reserveStock(items, ttlMinutes = 15) {
    const reservedItems = [];
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    try {
      for (const item of items) {
        const pid = item.productId || item.product || item._id;
        const qty = parseInt(item.quantity, 10);

        if (!pid || !mongoose.Types.ObjectId.isValid(pid) || isNaN(qty) || qty <= 0) {
          throw new Error(`Invalid product ID or quantity: ${pid}`);
        }

        // Atomic reservation: check availableStock >= qty
        const updated = await Product.findOneAndUpdate(
          {
            _id: pid,
            available: true,
            availableStock: { $gte: qty }
          },
          {
            $inc: {
              availableStock: -qty,
              reservedStock: qty
            }
          },
          { new: true }
        );

        if (!updated) {
          const product = await Product.findById(pid);
          const currentAvailable = product ? product.availableStock : 0;
          const prodName = product ? product.name : "Product";
          throw new Error(
            `Insufficient available stock for "${prodName}". Requested: ${qty}, Available: ${currentAvailable}`
          );
        }

        reservedItems.push({
          productId: pid,
          productName: updated.name,
          quantity: qty,
          unitPrice: updated.price
        });
      }

      return {
        success: true,
        expiresAt,
        reservedItems
      };
    } catch (err) {
      // Rollback any reserved items in this batch
      for (const rollbackItem of reservedItems) {
        await Product.updateOne(
          { _id: rollbackItem.productId },
          {
            $inc: {
              availableStock: rollbackItem.quantity,
              reservedStock: -rollbackItem.quantity
            }
          }
        ).catch(() => {});
      }
      throw err;
    }
  }

  /**
   * Commit reserved stock to sold stock upon successful payment verification.
   * @param {Array<{product: string, quantity: number}>} items 
   */
  static async commitReservation(items) {
    for (const item of items) {
      const pid = item.product || item.productId;
      const qty = parseInt(item.quantity, 10);
      if (!pid || !qty) continue;

      await Product.updateOne(
        { _id: pid },
        {
          $inc: {
            reservedStock: -qty,
            soldStock: qty,
            stock: -qty
          }
        }
      );
    }
  }

  /**
   * Release reserved stock back to available stock (e.g., checkout abandoned or payment failed).
   * @param {Array<{product: string, quantity: number}>} items 
   */
  static async releaseReservation(items) {
    for (const item of items) {
      const pid = item.product || item.productId;
      const qty = parseInt(item.quantity, 10);
      if (!pid || !qty) continue;

      await Product.updateOne(
        { _id: pid },
        {
          $inc: {
            availableStock: qty,
            reservedStock: -qty
          }
        }
      );
    }
  }

  /**
   * Scan for expired pending_payment orders and release their reservations.
   */
  static async cleanupExpiredReservations() {
    try {
      const expirationThreshold = new Date(Date.now() - 15 * 60 * 1000);
      const expiredOrders = await Order.find({
        status: "pending_payment",
        createdAt: { $lt: expirationThreshold }
      });

      for (const order of expiredOrders) {
        order.status = "payment_failed";
        order.timeline = order.timeline || [];
        order.timeline.push({
          status: "payment_failed",
          note: "Reservation expired after 15 minutes of inactivity",
          timestamp: new Date()
        });
        await order.save();
        await this.releaseReservation(order.items);
      }

      return expiredOrders.length;
    } catch (err) {
      console.error("Cleanup expired reservations error:", err);
      return 0;
    }
  }
}

module.exports = InventoryService;
```

---

## 3. POST /api/customer/orders (`server/routes/customerRoutes.js:900-1094`)

```javascript
// file: server/routes/customerRoutes.js:900-1094
// POST /api/customer/orders - Production Checkout with Atomic Reservation & Server-side Coupons
router.post("/orders", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const {
      deliveryAddress,
      couponCode,
      paymentMethod = "razorpay",
      customerNotes,
    } = req.body;

    if (
      !deliveryAddress ||
      !deliveryAddress.fullName ||
      !deliveryAddress.phone ||
      !deliveryAddress.address
    ) {
      return res.status(400).json({
        success: false,
        message: "Full name, phone number, and delivery address are required",
      });
    }

    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || !cart.items || cart.items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot place order with an empty cart" });
    }

    let subtotal = 0;
    const reservationItems = [];

    // Recalculate subtotal server-side strictly from active database prices
    for (const item of cart.items) {
      if (!item.product) {
        return res.status(400).json({
          success: false,
          message: "One or more items in your cart no longer exist",
        });
      }

      const product = await Product.findById(item.product._id);
      if (!product || !product.available) {
        return res.status(400).json({
          success: false,
          message: `Product "${item.product.name}" is currently unavailable`,
        });
      }

      if (product.availableStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.availableStock}, requested: ${item.quantity}`,
        });
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      reservationItems.push({
        productId: product._id,
        quantity: item.quantity,
        productNameSnapshot: product.name,
        unitPrice: product.price,
        subtotal: itemSubtotal,
      });
    }

    // Dynamic Delivery Fee: Free above ₹499, otherwise ₹30
    let deliveryFee = subtotal >= 499 ? 0 : 30;
    let discount = 0;
    let appliedCoupon = null;

    // Server-Authoritative Coupon Validation
    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      try {
        const couponResult = await CouponService.validateAndCalculateDiscount(
          couponCode.trim(),
          {
            userId,
            storeId: cart.store,
            subtotal,
            deliveryFee,
          }
        );
        discount = couponResult.discountAmount;
        appliedCoupon = couponResult.code;
        if (couponResult.discountType === "free_delivery") {
          deliveryFee = 0;
        }
      } catch (couponErr) {
        return res.status(400).json({
          success: false,
          message: `Coupon error: ${couponErr.message}`,
        });
      }
    }

    const total = Math.max(0, subtotal + deliveryFee - discount);

    // Atomic Inventory Reservation via InventoryService
    // Decrements availableStock and increments reservedStock atomically
    try {
      await InventoryService.reserveStock(reservationItems, 15);
    } catch (stockErr) {
      return res.status(400).json({
        success: false,
        message: stockErr.message,
      });
    }

    // Generate cryptographically secure 4-digit Delivery OTP
    const deliveryOtp = crypto.randomInt(1000, 10000).toString();

    const initialStatus = paymentMethod === "cod" ? "placed" : "pending_payment";

    const orderItems = reservationItems.map((r) => ({
      product: r.productId,
      productNameSnapshot: r.productNameSnapshot,
      unitPrice: r.unitPrice,
      quantity: r.quantity,
      subtotal: r.subtotal,
    }));

    const order = new Order({
      customer: userId,
      store: cart.store,
      items: orderItems,
      deliveryAddress: {
        fullName: deliveryAddress.fullName.trim(),
        phone: deliveryAddress.phone.trim(),
        address: deliveryAddress.address.trim(),
        city: (deliveryAddress.city || "").trim(),
        pincode: (deliveryAddress.pincode || "").trim(),
      },
      subtotal,
      deliveryFee,
      discount,
      couponCode: appliedCoupon,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
      status: initialStatus,
      deliveryOtp,
      customerNotes: customerNotes ? customerNotes.trim() : undefined,
      timeline: [
        {
          status: initialStatus,
          note: paymentMethod === "cod" ? "Order placed with Cash on Delivery" : "Order initiated, awaiting Razorpay payment",
          timestamp: new Date(),
        },
      ],
    });

    await order.save();

    // If COD, commit the reservation immediately
    if (paymentMethod === "cod") {
      await InventoryService.commitReservation(reservationItems);
      if (appliedCoupon) {
        await CouponService.recordCouponUsage(appliedCoupon);
      }
    }

    // Clear customer cart
    cart.items = [];
    cart.store = null;
    await cart.save();

    await order.populate("store", "name category description location");

    res.status(201).json({
      success: true,
      message: paymentMethod === "cod" ? "Order placed successfully" : "Order initiated. Please complete Razorpay payment.",
      order: {
        _id: order._id,
        store: order.store,
        items: order.items,
        deliveryAddress: order.deliveryAddress,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        discount: order.discount,
        couponCode: order.couponCode,
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## 4. POST /api/payments/create-order (`server/routes/paymentRoutes.js:13-51`)

```javascript
// file: server/routes/paymentRoutes.js:13-51
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
```

---

## 5. POST /api/payments/verify (`server/routes/paymentRoutes.js:54-105`)

```javascript
// file: server/routes/paymentRoutes.js:54-105
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
```

---

## 6. POST /api/payments/webhook (`server/routes/paymentRoutes.js:108-292`)

```javascript
// file: server/routes/paymentRoutes.js:108-292
// =====================================================
// POST /api/payments/webhook
// Idempotent Razorpay Webhook Handler.
// Handles: payment.captured, payment.failed, refund.created, refund.processed
// =====================================================
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    // Fail-closed: RAZORPAY_WEBHOOK_SECRET must be configured
    if (!webhookSecret) {
      console.error("[Webhook] RAZORPAY_WEBHOOK_SECRET is not configured. Rejecting webhook.");
      return res
        .status(500)
        .json({ success: false, message: "Webhook secret not configured on server" });
    }

    // Fail-closed: x-razorpay-signature header is mandatory
    if (!signature) {
      console.error("[Webhook] Missing x-razorpay-signature header");
      return res
        .status(400)
        .json({ success: false, message: "Missing x-razorpay-signature header" });
    }

    // Parse body — handle both raw buffer and already-parsed JSON
    let body;
    let rawBody;
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString("utf8");
      body = JSON.parse(rawBody);
    } else {
      body = req.body;
      rawBody = JSON.stringify(req.body);
    }

    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    // Timing-safe signature comparison
    const expectedBuf = Buffer.from(expectedSig, "utf8");
    const signatureBuf = Buffer.from(String(signature), "utf8");
    const isSignatureValid =
      expectedBuf.length === signatureBuf.length &&
      crypto.timingSafeEqual(expectedBuf, signatureBuf);

    if (!isSignatureValid) {
      console.error("[Webhook] Invalid signature");
      return res
        .status(400)
        .json({ success: false, message: "Invalid webhook signature" });
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
```

---

## 7. POST /api/payments/failure (`server/routes/paymentRoutes.js:295-324`)

```javascript
// file: server/routes/paymentRoutes.js:295-324
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
```

---

## 8. Customer Order Cancellation Route (`server/routes/customerRoutes.js:1136-1198`)

```javascript
// file: server/routes/customerRoutes.js:1136-1198
// PATCH /api/customer/orders/:orderId/cancel
router.patch("/orders/:orderId/cancel", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { orderId } = req.params;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    // Allow cancellation of placed or pending_payment orders
    const existingOrder = await Order.findOne({
      _id: orderId,
      customer: userId,
    });

    if (!existingOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!["placed", "pending_payment"].includes(existingOrder.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in its current status: ${existingOrder.status}`,
      });
    }

    const previousStatus = existingOrder.status;
    existingOrder.status = "cancelled";
    existingOrder.timeline = existingOrder.timeline || [];
    existingOrder.timeline.push({
      status: "cancelled",
      note: "Cancelled by customer",
      timestamp: new Date(),
    });
    await existingOrder.save();

    // Smart Inventory Restoration
    if (previousStatus === "pending_payment") {
      // Order had reserved stock, release back to available
      await InventoryService.releaseReservation(existingOrder.items);
    } else {
      // Order had committed stock, restore stock and availableStock
      for (const item of existingOrder.items) {
        if (item.product) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity, availableStock: item.quantity, soldStock: -item.quantity } },
          ).catch(() => {});
        }
      }
    }

    await existingOrder.populate("store", "name category description location");

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order: existingOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## 9. Middleware Order in Server (`server/server.js:27-34, 129-138`)

```javascript
// file: server/server.js:27-34, 129-138
// In order of execution:
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.static(path.join(__dirname, "../views")));

// Route Mounts (lines 129-138):
app.use("/api/customer", customerRoutes);
app.use("/api/customer/ai", aiRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/store-owner", storeRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
```
