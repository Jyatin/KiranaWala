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
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use("/api/payments", paymentRoutes);

describe("Webhook Exact Raw Body HMAC Verification", () => {
  const WEBHOOK_SECRET = "rzp_webhook_secret_raw_test_999";
  let customer, store, order;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_WEBHOOK_RAW";
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
      username: `rawCust_${uid}`,
      email: `rawCust_${uid}@test.com`,
      password: "password123",
      role: "customer",
    });

    store = await Store.create({
      name: "Raw Webhook Store",
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
          unitPrice: 500,
          quantity: 1,
          subtotal: 500,
        },
      ],
      deliveryAddress: {
        fullName: "Raw Customer",
        phone: "+91 99999 11111",
        address: "123 Street",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 500,
      total: 500,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      status: "pending_payment",
      razorpayOrderId: `order_raw_rzp_${uid}`,
    });

    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  test("Webhook payload with whitespace, unicode escapes (\\u20b9), and slashes must be verified over exact wire bytes", async () => {
    // Raw wire string with formatting, unicode escape \u20b9, and escaped slash \/
    const exactWireBytes = `{\n  "event": "payment.captured",\n  "description": "Payment for \\u20b9500 goods at http:\\/\\/kiranawala.in",\n  "payload": {\n    "payment": {\n      "entity": {\n        "id": "pay_raw_123",\n        "order_id": "${order.razorpayOrderId}",\n        "amount": 50000,\n        "status": "captured"\n      }\n    }\n  }\n}`;

    // Prove that JSON.stringify(JSON.parse(exactWireBytes)) differs from exactWireBytes
    const reSerialized = JSON.stringify(JSON.parse(exactWireBytes));
    expect(reSerialized).not.toBe(exactWireBytes);

    // Compute signature over the EXACT wire bytes
    const validSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(exactWireBytes)
      .digest("hex");

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("x-razorpay-signature", validSignature)
      .set("Content-Type", "application/json")
      .send(exactWireBytes);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.paymentStatus).toBe("paid");
  });

  test("Webhook payload with one single character tampered must be rejected (400)", async () => {
    const exactWireBytes = `{\n  "event": "payment.captured",\n  "description": "Payment for \\u20b9500 goods",\n  "payload": {\n    "payment": {\n      "entity": {\n        "id": "pay_raw_123",\n        "order_id": "${order.razorpayOrderId}",\n        "amount": 50000,\n        "status": "captured"\n      }\n    }\n  }\n}`;

    const validSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(exactWireBytes)
      .digest("hex");

    // Tamper one character in the wire bytes
    const tamperedWireBytes = exactWireBytes.replace("50000", "50001");

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("x-razorpay-signature", validSignature)
      .set("Content-Type", "application/json")
      .send(tamperedWireBytes);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("Webhook request with non-JSON content-type (or missing req.rawBody) is REJECTED with 400", async () => {
    const rawPayload = `{"event":"payment.captured"}`;
    const validSig = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(rawPayload)
      .digest("hex");

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("x-razorpay-signature", validSig)
      .set("Content-Type", "text/plain")
      .send(rawPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
