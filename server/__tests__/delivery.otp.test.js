"use strict";

const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Store = require("../models/store");
const Order = require("../models/order");
const deliveryRoutes = require("../routes/deliveryRoutes");

const app = express();
app.use(express.json());
app.use("/api/delivery", deliveryRoutes);

describe("Delivery Completion OTP & Rate Limiting Security Tests", () => {
  const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
  let runner, customer, store, order, tokenRunner;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_DELIVERY_OTP";
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

    // Customer
    customer = await User.create({
      username: `otpCust_${uid}`,
      email: `otpCust_${uid}@test.com`,
      password: "password123",
      role: "customer",
    });

    // Delivery Runner
    runner = await User.create({
      username: `otpRunner_${uid}`,
      email: `otpRunner_${uid}@test.com`,
      password: "password123",
      role: "delivery-partner",
    });
    tokenRunner = jwt.sign(
      { userId: runner._id, id: runner._id, role: runner.role, email: runner.email },
      JWT_SECRET
    );

    // Store
    store = await Store.create({
      name: "OTP Test Store",
      description: "Store",
      category: "Groceries",
      owner: customer._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });

    // Out for delivery order with 4-digit OTP
    order = await Order.create({
      customer: customer._id,
      store: store._id,
      deliveryPartner: runner._id,
      deliveryPartnerName: runner.username,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          productNameSnapshot: "Test Item",
          unitPrice: 100,
          quantity: 1,
          subtotal: 100,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Indiranagar",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 100,
      total: 100,
      paymentMethod: "cod",
      paymentStatus: "paid",
      status: "out_for_delivery",
      deliveryOtp: "5829",
      otpAttempts: 0,
    });
  });

  test("(i) Marking order delivered WITHOUT otp field must be rejected (400) when order has deliveryOtp", async () => {
    const res = await request(app)
      .patch(`/api/delivery/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${tokenRunner}`)
      .send({ status: "delivered" }); // Missing otp field

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/otp.*required/i);

    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.status).toBe("out_for_delivery");
  });

  test("(ii) Marking order delivered with WRONG OTP must be rejected (400)", async () => {
    const res = await request(app)
      .patch(`/api/delivery/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${tokenRunner}`)
      .send({ status: "delivered", otp: "0000" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid.*otp/i);

    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.status).toBe("out_for_delivery");
  });

  test("(iii) After 5 wrong OTP attempts on the same order, further attempts are rejected with 429 even with the correct OTP", async () => {
    // 15-minute lockout cooldown is enforced after 5 failed attempts
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .patch(`/api/delivery/orders/${order._id}/status`)
        .set("Authorization", `Bearer ${tokenRunner}`)
        .send({ status: "delivered", otp: `111${i}` });

      if (i < 5) {
        expect(res.status).toBe(400);
      } else {
        // 5th attempt triggers lockout
        expect([400, 429]).toContain(res.status);
      }
    }

    // 6th attempt with the CORRECT OTP must be rejected with 429 due to lockout cooldown
    const lockedRes = await request(app)
      .patch(`/api/delivery/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${tokenRunner}`)
      .send({ status: "delivered", otp: "5829" }); // Correct OTP

    expect(lockedRes.status).toBe(429);
    expect(lockedRes.body.success).toBe(false);
    expect(lockedRes.body.message).toMatch(/too many.*attempts|locked/i);

    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.status).toBe("out_for_delivery");
  });

  test("(iv) Marking order delivered with CORRECT OTP succeeds (200)", async () => {
    const res = await request(app)
      .patch(`/api/delivery/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${tokenRunner}`)
      .send({ status: "delivered", otp: "5829" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.status).toBe("delivered");

    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.status).toBe("delivered");
  });

  test("(v) An order with no deliveryOtp configured CANNOT be marked delivered and is rejected (fail-closed)", async () => {
    // Create an order explicitly with no deliveryOtp (empty string or null)
    const orderNoOtp = await Order.create({
      customer: customer._id,
      store: store._id,
      deliveryPartner: runner._id,
      deliveryPartnerName: runner.username,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          productNameSnapshot: "Test Item",
          unitPrice: 100,
          quantity: 1,
          subtotal: 100,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Indiranagar",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 100,
      total: 100,
      paymentMethod: "cod",
      paymentStatus: "paid",
      status: "out_for_delivery",
      deliveryOtp: "",
      otpAttempts: 0,
    });

    const res = await request(app)
      .patch(`/api/delivery/orders/${orderNoOtp._id}/status`)
      .set("Authorization", `Bearer ${tokenRunner}`)
      .send({ status: "delivered", otp: "5829" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/otp.*configuration|missing.*otp/i);

    const checkOrder = await Order.findById(orderNoOtp._id);
    expect(checkOrder.status).toBe("out_for_delivery");
  });
});
