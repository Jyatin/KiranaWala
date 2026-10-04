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

describe("Delivery Status IDOR & Transition Security Tests", () => {
  const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
  let customer, ownerA, ownerB, runner1, runner2, storeA, storeB, orderA;
  let tokenOwnerA, tokenOwnerB, tokenRunner1, tokenRunner2;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_DELIVERY_STATUS";
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
      username: `cust_${uid}`,
      email: `cust_${uid}@test.com`,
      password: "password123",
      role: "customer",
    });

    // Store Owner A (owns Store A)
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
      description: "Store Alpha",
      category: "Groceries",
      owner: ownerA._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });

    // Store Owner B (owns Store B - Attacker)
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
      description: "Store Beta",
      category: "Groceries",
      owner: ownerB._id,
      location: { type: "Point", coordinates: [77.6400, 12.9150] },
    });

    // Delivery Partner 1 (Assigned Runner)
    runner1 = await User.create({
      username: `runner1_${uid}`,
      email: `runner1_${uid}@test.com`,
      password: "password123",
      role: "delivery-partner",
    });
    tokenRunner1 = jwt.sign(
      { userId: runner1._id, id: runner1._id, role: runner1.role, email: runner1.email },
      JWT_SECRET
    );

    // Delivery Partner 2 (Unassigned Runner - Attacker)
    runner2 = await User.create({
      username: `runner2_${uid}`,
      email: `runner2_${uid}@test.com`,
      password: "password123",
      role: "delivery-partner",
    });
    tokenRunner2 = jwt.sign(
      { userId: runner2._id, id: runner2._id, role: runner2.role, email: runner2.email },
      JWT_SECRET
    );

    const productA = await Product.create({
      name: "Aashirvaad Atta 5kg",
      price: 260,
      description: "Atta",
      image: "http://example.com/atta.jpg",
      category: "Groceries",
      store: storeA._id,
    });

    // Order A at Store A, assigned to runner1
    orderA = await Order.create({
      customer: customer._id,
      store: storeA._id,
      items: [
        {
          product: productA._id,
          productNameSnapshot: productA.name,
          unitPrice: productA.price,
          quantity: 1,
          subtotal: 260,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 88888",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560102",
      },
      subtotal: 260,
      total: 290,
      paymentMethod: "cod",
      status: "assigned",
      deliveryPartner: runner1._id,
      deliveryOtp: "5555",
    });
  });

  test("1. Unauthenticated request to PATCH /api/delivery/orders/:id/status is rejected with 401", async () => {
    const res = await request(app)
      .patch(`/api/delivery/orders/${orderA._id}/status`)
      .send({ status: "picked_up" });

    expect(res.status).toBe(401);
  });

  test("2. Store Owner B advancing Store A's order must be REJECTED with 404 (IDOR Protection)", async () => {
    const res = await request(app)
      .patch(`/api/delivery/orders/${orderA._id}/status`)
      .set("Authorization", `Bearer ${tokenOwnerB}`)
      .send({ status: "cancelled" });

    // Must be 404 (non-owner does not get order existence revealed)
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    // Verify order status unchanged in DB
    const reloaded = await Order.findById(orderA._id);
    expect(reloaded.status).toBe("assigned");
  });

  test("3. Delivery partner not assigned to the order (Runner 2) must be REJECTED with 404", async () => {
    const res = await request(app)
      .patch(`/api/delivery/orders/${orderA._id}/status`)
      .set("Authorization", `Bearer ${tokenRunner2}`)
      .send({ status: "picked_up" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    // Verify order status unchanged in DB
    const reloaded = await Order.findById(orderA._id);
    expect(reloaded.status).toBe("assigned");
  });

  test("4. Rightful Store Owner A CAN advance status of Store A's order", async () => {
    // Transition assigned -> cancelled by rightful store owner
    const res = await request(app)
      .patch(`/api/delivery/orders/${orderA._id}/status`)
      .set("Authorization", `Bearer ${tokenOwnerA}`)
      .send({ status: "cancelled" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.status).toBe("cancelled");

    const reloaded = await Order.findById(orderA._id);
    expect(reloaded.status).toBe("cancelled");
  });

  test("5. Assigned Delivery Partner (Runner 1) CAN advance status of assigned order", async () => {
    // Transition assigned -> picked_up by assigned runner
    const res = await request(app)
      .patch(`/api/delivery/orders/${orderA._id}/status`)
      .set("Authorization", `Bearer ${tokenRunner1}`)
      .send({ status: "picked_up" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.status).toBe("picked_up");

    const reloaded = await Order.findById(orderA._id);
    expect(reloaded.status).toBe("picked_up");
  });
});
