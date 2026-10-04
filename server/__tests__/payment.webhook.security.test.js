"use strict";

const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const crypto = require("crypto");
const User = require("../models/user");
const Store = require("../models/store");
const Order = require("../models/order");
const paymentRoutes = require("../routes/paymentRoutes");

const app = express();
app.use(express.json());
app.use("/api/payments", paymentRoutes);

describe("Razorpay Webhook Fail-Closed Security Tests", () => {
  const WEBHOOK_SECRET = "rzp_webhook_secret_secure_123";
  let customer, store, order;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_WEBHOOK_SEC";
    if (!mongoUri.includes("TEST")) {
      throw new Error("Safety check: Database name must contain TEST");
    }
    await mongoose.connect(mongoUri);
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Store.deleteMany({});
    await Order.deleteMany({});

    const uid = Math.random().toString(36).substring(2, 7);

    customer = await User.create({
      username: `whCust_${uid}`,
      email: `whCust_${uid}@test.com`,
      password: "password123",
      role: "customer",
    });

    store = await Store.create({
      name: "Webhook Store",
      description: "Store",
      category: "Groceries",
      owner: customer._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });

    order = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          productNameSnapshot: "Test Item",
          unitPrice: 250,
          quantity: 1,
          subtotal: 250,
        },
      ],
      deliveryAddress: {
        fullName: "Webhook Customer",
        phone: "+91 99999 11111",
        address: "123 Street",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 250,
      total: 250,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      status: "pending_payment",
      razorpayOrderId: `order_rzp_${uid}`,
    });
  });

  test("1. Missing x-razorpay-signature header is REJECTED (400 or 401)", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test_123",
            order_id: order.razorpayOrderId,
            amount: 25000,
            status: "captured",
          },
        },
      },
    };

    const res = await request(app)
      .post("/api/payments/webhook")
      .send(payload); // No signature header

    expect([400, 401]).toContain(res.status);
    expect(res.body.success).toBe(false);

    // Verify order was NOT marked as paid
    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.paymentStatus).toBe("pending");
  });

  test("2. Invalid/wrong x-razorpay-signature header is REJECTED (400 or 401)", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test_123",
            order_id: order.razorpayOrderId,
            amount: 25000,
            status: "captured",
          },
        },
      },
    };

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("x-razorpay-signature", "invalid_signature_hex_1234567890abcdef")
      .send(payload);

    expect([400, 401]).toContain(res.status);
    expect(res.body.success).toBe(false);

    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.paymentStatus).toBe("pending");
  });

  test("3. When RAZORPAY_WEBHOOK_SECRET is UNSET in env, reject EVERYTHING (Fail-Closed, never accept unsigned events)", async () => {
    const originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;

    try {
      const payload = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_spoofed_attack",
              order_id: order.razorpayOrderId,
              amount: 25000,
              status: "captured",
            },
          },
        },
      };

      const res = await request(app)
        .post("/api/payments/webhook")
        .send(payload);

      // Must NOT return 200 or mark order as paid when webhook secret is unconfigured
      expect([400, 401, 500]).toContain(res.status);
      expect(res.body.status !== "ok" || res.body.success === false).toBe(true);

      const checkOrder = await Order.findById(order._id);
      expect(checkOrder.paymentStatus).toBe("pending");
    } finally {
      process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret;
    }
  });

  test("4. Valid HMAC-SHA256 signature over the payload is ACCEPTED and processes the event", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_valid_123",
            order_id: order.razorpayOrderId,
            amount: 25000,
            status: "captured",
          },
        },
      },
    };

    const rawPayloadString = JSON.stringify(payload);
    const validSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(rawPayloadString)
      .digest("hex");

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("x-razorpay-signature", validSignature)
      .set("Content-Type", "application/json")
      .send(rawPayloadString);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");

    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.paymentStatus).toBe("paid");
  });
});
