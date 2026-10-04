"use strict";

const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Store = require("../models/store");
const Product = require("../models/product");
const Order = require("../models/order");
const paymentRoutes = require("../routes/paymentRoutes");
const PaymentService = require("../services/paymentService");
const InventoryService = require("../services/inventoryService");
const ReconciliationService = require("../services/reconciliationService");

const JWT_SECRET = "kiranawala-dev-secret-key-12345";
const WEBHOOK_SECRET = "test_webhook_secret_xyz123";

describe("Phase 6 & 7: Payment Failure Injection & Reconciliation Test Suite", () => {
  let app, customer, store, product;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_FAILURE_INJECTION";
    if (!mongoUri.includes("TEST")) {
      throw new Error("Safety check: Database name must contain TEST");
    }
    await mongoose.connect(mongoUri);
    await mongoose.connection.db.dropDatabase();

    app = express();
    app.use(
      express.json({
        verify: (req, res, buf) => {
          req.rawBody = buf;
        },
      })
    );
    app.use("/api/payments", paymentRoutes);
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    process.env.ENABLE_MOCK_PAYMENTS = "true";
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

    await User.deleteMany({});
    await Store.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    customer = await User.create({
      username: "failCust",
      email: "failCust@test.com",
      password: "password123",
      role: "customer",
    });

    store = await Store.create({
      name: "Failover Store",
      description: "Store Description",
      category: "Groceries",
      owner: customer._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });

    product = await Product.create({
      name: "Basmati Rice 5kg",
      store: store._id,
      description: "Premium Basmati Rice",
      image: "https://images.unsplash.com/photo-rice",
      price: 400,
      stock: 50,
      availableStock: 50,
      reservedStock: 0,
      soldStock: 0,
      category: "Staples",
    });
  });

  test("1. Scenario: Payment provider times out during refund -> Order remains safe in refund_pending", async () => {
    const order = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 400,
          quantity: 1,
          subtotal: 400,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 400,
      total: 400,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "confirmed",
      razorpayPaymentId: "pay_timeout_test_1",
    });

    // Mock provider throwing a timeout error
    const originalGetProvider = PaymentService.getProvider;
    PaymentService.getProvider = () => ({
      isSandbox: false,
      processRefund: async () => {
        const err = new Error("ETIMEDOUT: Connection timed out to Razorpay API");
        err.code = "ETIMEDOUT";
        throw err;
      },
    });

    try {
      await expect(
        PaymentService.processRefund({
          orderId: order._id,
          reason: "Customer timeout test",
        })
      ).rejects.toThrow(/ambiguous due to network\/timeout error/i);

      // Verify order is parked safely in refund_pending without double execution
      const checkOrder = await Order.findById(order._id);
      expect(checkOrder.paymentStatus).toBe("refund_pending");
      expect(checkOrder.status).toBe("refund_pending");
    } finally {
      PaymentService.getProvider = originalGetProvider;
    }
  });

  test("2. Scenario: Webhook arrives twice for payment.captured -> Idempotent execution", async () => {
    await InventoryService.reserveStock(
      [{ productId: product._id, quantity: 1 }],
      15
    );

    const order = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 400,
          quantity: 1,
          subtotal: 400,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 400,
      total: 400,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      status: "pending_payment",
      razorpayOrderId: "order_rzp_dup_webhook",
    });

    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_dup_1",
            order_id: "order_rzp_dup_webhook",
            amount: 40000,
            status: "captured",
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    // First webhook delivery
    const res1 = await request(app)
      .post("/api/payments/webhook")
      .set("x-razorpay-signature", signature)
      .set("Content-Type", "application/json")
      .send(rawBody);
    expect(res1.status).toBe(200);

    // Second duplicate webhook delivery
    const res2 = await request(app)
      .post("/api/payments/webhook")
      .set("x-razorpay-signature", signature)
      .set("Content-Type", "application/json")
      .send(rawBody);
    expect(res2.status).toBe(200);

    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.paymentStatus).toBe("paid");
    expect(checkOrder.status).toBe("confirmed");

    const p = await Product.findById(product._id);
    // Stock committed exactly once (soldStock = 1, stock = 49)
    expect(p.soldStock).toBe(1);
    expect(p.stock).toBe(49);
    expect(p.availableStock).toBe(49);
  });

  test("3. Scenario: Webhook and client verification callback arrive concurrently -> Handled safely exactly once", async () => {
    await InventoryService.reserveStock(
      [{ productId: product._id, quantity: 2 }],
      15
    );

    const order = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 400,
          quantity: 2,
          subtotal: 800,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 800,
      total: 800,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      status: "pending_payment",
      razorpayOrderId: "order_rzp_race_confirm",
    });

    const webhookPayload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_race_1",
            order_id: "order_rzp_race_confirm",
            amount: 80000,
            status: "captured",
          },
        },
      },
    };
    const rawBody = JSON.stringify(webhookPayload);
    const webhookSig = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    // Race webhook and client confirmation simultaneously
    const [webhookRes, clientRes] = await Promise.all([
      request(app)
        .post("/api/payments/webhook")
        .set("x-razorpay-signature", webhookSig)
        .set("Content-Type", "application/json")
        .send(rawBody),
      PaymentService.confirmPayment({
        orderId: order._id,
        razorpayOrderId: "order_rzp_race_confirm",
        razorpayPaymentId: "pay_race_1",
        razorpaySignature: "mock_verified_signature",
        source: "api",
      }),
    ]);

    expect(webhookRes.status).toBe(200);
    expect(clientRes.success).toBe(true);

    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.paymentStatus).toBe("paid");
    expect(checkOrder.status).toBe("confirmed");

    const p = await Product.findById(product._id);
    expect(p.soldStock).toBe(2);
    expect(p.stock).toBe(48);
  });

  test("4. Scenario: Invalid webhook signature is rejected with 400 and does not mutate order state", async () => {
    const order = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 400,
          quantity: 1,
          subtotal: 400,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 400,
      total: 400,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      status: "pending_payment",
      razorpayOrderId: "order_rzp_forged_webhook",
    });

    const forgedPayload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_forged_1",
            order_id: "order_rzp_forged_webhook",
            amount: 40000,
            status: "captured",
          },
        },
      },
    };

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("x-razorpay-signature", "invalid_forged_signature_hex_123")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(forgedPayload));

    expect(res.status).toBe(400);

    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.paymentStatus).toBe("pending");
    expect(checkOrder.status).toBe("pending_payment");
  });

  test("5. Scenario: Stale payment arrival after cancellation is rejected fail-closed", async () => {
    const order = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 400,
          quantity: 1,
          subtotal: 400,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 400,
      total: 400,
      paymentMethod: "razorpay",
      paymentStatus: "failed",
      status: "cancelled",
      razorpayOrderId: "order_rzp_stale_1",
    });

    await expect(
      PaymentService.confirmPayment({
        orderId: order._id,
        razorpayOrderId: "order_rzp_stale_1",
        razorpayPaymentId: "pay_stale_1",
        razorpaySignature: "mock_verified_signature",
      })
    ).rejects.toThrow(/order is in 'cancelled' state/i);
  });

  test("6. Scenario: Payment reconciliation resolves pending_payment order", async () => {
    const pastDate = new Date(Date.now() - 20 * 60 * 1000);
    const order = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 400,
          quantity: 1,
          subtotal: 400,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 400,
      total: 400,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      status: "pending_payment",
      razorpayOrderId: "order_recon_test_1",
      createdAt: pastDate,
      updatedAt: pastDate,
    });

    const result = await ReconciliationService.reconcilePendingPayments(10);
    expect(result.checked).toBeGreaterThanOrEqual(1);

    const checkOrder = await Order.findById(order._id);
    expect(["payment_failed", "confirmed"]).toContain(checkOrder.status);
  });
});
