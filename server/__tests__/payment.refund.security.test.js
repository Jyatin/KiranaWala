"use strict";

const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const Store = require("../models/store");
const User = require("../models/user");
const Product = require("../models/product");
const Order = require("../models/order");
const paymentRoutes = require("../routes/paymentRoutes");

const app = express();
app.use(express.json());
app.use("/api/payments", paymentRoutes);

describe("Refund IDOR & Authorization Security Tests", () => {
  const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
  let customer, ownerA, ownerB, storeA, storeB, paidOrderStoreA;
  let tokenCustomer, tokenOwnerA, tokenOwnerB;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_REFUND_SEC";
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
    await Product.deleteMany({});
    await Order.deleteMany({});

    const uid = Math.random().toString(36).substring(2, 7);

    // Customer
    customer = await User.create({
      username: `refundCust_${uid}`,
      email: `refundCust_${uid}@test.com`,
      password: "password123",
      role: "customer",
    });
    tokenCustomer = jwt.sign(
      { userId: customer._id, id: customer._id, role: customer.role, email: customer.email },
      JWT_SECRET
    );

    // Store Owner A
    ownerA = await User.create({
      username: `ownerA_${uid}`,
      email: `ownerA_${uid}@test.com`,
      password: "password123",
      role: "store-owner",
    });
    tokenOwnerA = jwt.sign(
      { userId: ownerA._id, id: ownerA._id, role: ownerA.role, email: ownerA.email },
      JWT_SECRET
    );

    storeA = await Store.create({
      name: "Store Alpha",
      description: "Store Alpha Groceries",
      category: "Groceries",
      owner: ownerA._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });

    // Store Owner B (Attacker / Unrelated Merchant)
    ownerB = await User.create({
      username: `ownerB_${uid}`,
      email: `ownerB_${uid}@test.com`,
      password: "password123",
      role: "store-owner",
    });
    tokenOwnerB = jwt.sign(
      { userId: ownerB._id, id: ownerB._id, role: ownerB.role, email: ownerB.email },
      JWT_SECRET
    );

    storeB = await Store.create({
      name: "Store Beta",
      description: "Store Beta Groceries",
      category: "Groceries",
      owner: ownerB._id,
      location: { type: "Point", coordinates: [77.6400, 12.9150] },
    });

    const productA = await Product.create({
      name: "Sunflower Oil 1L",
      price: 150,
      description: "Cooking oil",
      image: "http://example.com/oil.jpg",
      category: "Groceries",
      store: storeA._id,
      stock: 20,
      availableStock: 19,
      soldStock: 1,
    });

    // Paid Order belonging to Store A
    paidOrderStoreA = await Order.create({
      customer: customer._id,
      store: storeA._id,
      items: [
        {
          product: productA._id,
          productNameSnapshot: productA.name,
          unitPrice: productA.price,
          quantity: 1,
          subtotal: productA.price,
        },
      ],
      deliveryAddress: {
        fullName: "Customer One",
        phone: "+91 99999 11111",
        address: "123 Indiranagar",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 150,
      deliveryFee: 30,
      total: 180,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "confirmed",
      razorpayOrderId: "order_mock_test_123",
      razorpayPaymentId: "pay_mock_test_123",
    });
  });

  test("1. Unauthenticated request to POST /api/payments/refund is rejected with 401", async () => {
    const res = await request(app)
      .post("/api/payments/refund")
      .send({ orderId: paidOrderStoreA._id });

    expect(res.status).toBe(401);
  });

  test("2. Customer role attempting to call POST /api/payments/refund is rejected with 403", async () => {
    const res = await request(app)
      .post("/api/payments/refund")
      .set("Authorization", `Bearer ${tokenCustomer}`)
      .send({ orderId: paidOrderStoreA._id });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Access denied/i);
  });

  test("3. Store Owner B (unrelated merchant) refunding Store A's order must be REJECTED (IDOR Protection)", async () => {
    const res = await request(app)
      .post("/api/payments/refund")
      .set("Authorization", `Bearer ${tokenOwnerB}`)
      .send({ orderId: paidOrderStoreA._id, reason: "Unauthorized cross-store refund attempt" });

    // Must return 404 (or 400 with unauthorized / not found) and NOT process the refund
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);

    // Verify in database that order is still paid, not refunded
    const reloaded = await Order.findById(paidOrderStoreA._id);
    expect(reloaded.paymentStatus).toBe("paid");
    expect(reloaded.status).toBe("confirmed");
  });

  test("4. Rightful Store Owner A CAN refund Store A's paid order", async () => {
    const res = await request(app)
      .post("/api/payments/refund")
      .set("Authorization", `Bearer ${tokenOwnerA}`)
      .send({ orderId: paidOrderStoreA._id, reason: "Item out of stock after packing" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.paymentStatus).toBe("refunded");
    expect(res.body.order.status).toBe("refunded");

    // Verify DB update
    const reloaded = await Order.findById(paidOrderStoreA._id);
    expect(reloaded.paymentStatus).toBe("refunded");
    expect(reloaded.status).toBe("refunded");
  });

  test("5. Attempting to refund an unpaid order is rejected", async () => {
    const unpaidOrder = await Order.create({
      customer: customer._id,
      store: storeA._id,
      items: paidOrderStoreA.items,
      deliveryAddress: paidOrderStoreA.deliveryAddress,
      subtotal: 150,
      total: 180,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      status: "pending_payment",
    });

    const res = await request(app)
      .post("/api/payments/refund")
      .set("Authorization", `Bearer ${tokenOwnerA}`)
      .send({ orderId: unpaidOrder._id });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Cannot refund/i);
  });
});
