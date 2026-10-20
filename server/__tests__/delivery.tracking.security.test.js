"use strict";

const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const Store = require("../models/store");
const User = require("../models/user");
const Product = require("../models/product");
const Order = require("../models/order");
const deliveryRoutes = require("../routes/deliveryRoutes");

const app = express();
app.use(express.json());
app.use("/api/delivery", deliveryRoutes);

describe("Delivery Tracking Security & Authorization Tests", () => {
  const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
  let customerA, customerB, ownerA, ownerB, storeA, storeB, orderA;
  let tokenCustomerA, tokenCustomerB, tokenOwnerA, tokenOwnerB;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_DELIVERY_TRACK";
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

    // Customer A (Owner of Order A)
    customerA = await User.create({
      username: `custA_${uid}`,
      email: `custA_${uid}@test.com`,
      password: "password123",
      role: "customer",
      phone: "+91 91111 11111",
    });
    tokenCustomerA = jwt.sign(
      { userId: customerA._id, id: customerA._id, role: customerA.role, email: customerA.email },
      JWT_SECRET
    );

    // Customer B (Unrelated Customer)
    customerB = await User.create({
      username: `custB_${uid}`,
      email: `custB_${uid}@test.com`,
      password: "password123",
      role: "customer",
      phone: "+91 92222 22222",
    });
    tokenCustomerB = jwt.sign(
      { userId: customerB._id, id: customerB._id, role: customerB.role, email: customerB.email },
      JWT_SECRET
    );

    // Store Owner A (Owner of Store A)
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
      name: "Gupta Kirana Store A",
      description: "Local grocery store A",
      category: "Groceries",
      owner: ownerA._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });

    // Store Owner B (Owner of Store B)
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
      name: "Sharma Kirana Store B",
      description: "Local grocery store B",
      category: "Groceries",
      owner: ownerB._id,
      location: { type: "Point", coordinates: [77.6400, 12.9150] },
    });

    // Product in Store A
    const productA = await Product.create({
      name: "Aashirvaad Atta 5kg",
      price: 260,
      description: "Whole wheat atta",
      image: "http://example.com/atta.jpg",
      category: "Groceries",
      store: storeA._id,
    });

    // Order A placed by Customer A at Store A
    orderA = await Order.create({
      customer: customerA._id,
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
        fullName: "Ananya Sharma",
        phone: "+91 98888 88888",
        address: "Flat 402, Green Glen Layout, Bellandur",
        city: "Bengaluru",
        pincode: "560103",
      },
      subtotal: 260,
      deliveryFee: 30,
      total: 290,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "ready",
      deliveryOtp: "7842",
      deliveryEtaMinutes: 18,
    });
  });

  test("1. Unauthenticated request to GET /api/delivery/orders/:id/track is rejected with 401", async () => {
    const res = await request(app).get(`/api/delivery/orders/${orderA._id}/track`);
    expect(res.status).toBe(401);
    expect(res.body.deliveryOtp).toBeUndefined();
  });

  test("2. Unrelated customer (Customer B) gets 404 and cannot view Customer A's order tracking or OTP", async () => {
    const res = await request(app)
      .get(`/api/delivery/orders/${orderA._id}/track`)
      .set("Authorization", `Bearer ${tokenCustomerB}`);

    expect(res.status).toBe(404);
    expect(res.body.deliveryOtp).toBeUndefined();
    expect(res.body.stages).toBeUndefined();
  });

  test("3. Unrelated store owner (Store Owner B) gets 404 when querying Store A's order", async () => {
    const res = await request(app)
      .get(`/api/delivery/orders/${orderA._id}/track`)
      .set("Authorization", `Bearer ${tokenOwnerB}`);

    expect(res.status).toBe(404);
    expect(res.body.deliveryOtp).toBeUndefined();
  });

  test("4. Rightful Store Owner (Store Owner A) can track order but response MUST NOT leak deliveryOtp", async () => {
    const res = await request(app)
      .get(`/api/delivery/orders/${orderA._id}/track`)
      .set("Authorization", `Bearer ${tokenOwnerA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orderId).toBe(orderA._id.toString());
    // OTP MUST be stripped for store owner
    expect(res.body.deliveryOtp).toBeUndefined();
  });

  test("5. Rightful Customer (Customer A) can track order and receives deliveryOtp", async () => {
    const res = await request(app)
      .get(`/api/delivery/orders/${orderA._id}/track`)
      .set("Authorization", `Bearer ${tokenCustomerA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orderId).toBe(orderA._id.toString());
    expect(res.body.deliveryOtp).toBe("7842");
  });
});
