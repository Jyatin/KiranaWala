"use strict";

const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const Store = require("../models/store");
const User = require("../models/user");
const Order = require("../models/order");
const customerRoutes = require("../routes/customerRoutes");
const storeRoutes = require("../routes/storeRoutes");
const deliveryRoutes = require("../routes/deliveryRoutes");

const app = express();
app.use(express.json());
app.use("/api/customer", customerRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/store-owner", storeRoutes);
app.use("/api/delivery", deliveryRoutes);

describe("Delivery OTP Exposure Prevention Security Tests", () => {
  const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
  let customer, storeOwner, runner, otherCustomer;
  let tokenCustomer, tokenStoreOwner, tokenRunner;
  let store, order;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_OTP_EXPOSURE";
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
      username: `cust_${uid}`,
      email: `cust_${uid}@test.com`,
      password: "password123",
      role: "customer",
    });
    tokenCustomer = jwt.sign(
      { userId: customer._id, id: customer._id, role: "customer", email: customer.email },
      JWT_SECRET
    );

    // Store Owner
    storeOwner = await User.create({
      username: `owner_${uid}`,
      email: `owner_${uid}@test.com`,
      password: "password123",
      role: "store-owner",
    });
    tokenStoreOwner = jwt.sign(
      { userId: storeOwner._id, id: storeOwner._id, role: "store-owner", email: storeOwner.email },
      JWT_SECRET
    );

    // Store
    store = await Store.create({
      name: "OTP Test Store",
      description: "Store Description",
      category: "Groceries",
      owner: storeOwner._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });

    // Delivery Runner
    runner = await User.create({
      username: `runner_${uid}`,
      email: `runner_${uid}@test.com`,
      password: "password123",
      role: "delivery-partner",
    });
    tokenRunner = jwt.sign(
      { userId: runner._id, id: runner._id, role: "delivery-partner", email: runner.email },
      JWT_SECRET
    );

    // Create Order with explicit deliveryOtp
    order = await Order.create({
      customer: customer._id,
      store: store._id,
      deliveryPartner: runner._id,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          productNameSnapshot: "Test Item",
          unitPrice: 100,
          quantity: 2,
          subtotal: 200,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 200,
      total: 200,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "assigned",
      deliveryOtp: "7890",
    });
  });

  test("1. GET /api/delivery/orders as assigned runner must NOT expose deliveryOtp anywhere in the response", async () => {
    const res = await request(app)
      .get("/api/delivery/orders")
      .set("Authorization", `Bearer ${tokenRunner}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toBeDefined();
    expect(res.body.orders.length).toBeGreaterThan(0);

    // Check raw JSON string does not contain deliveryOtp
    const rawResponse = JSON.stringify(res.body);
    expect(rawResponse).not.toContain("deliveryOtp");
    expect(rawResponse).not.toContain("7890");

    // Check object field
    const fetchedOrder = res.body.orders.find((o) => o._id === order._id.toString());
    expect(fetchedOrder.deliveryOtp).toBeUndefined();
  });

  test("2. GET /api/store/orders as owning store owner must NOT expose deliveryOtp anywhere in the response", async () => {
    const res = await request(app)
      .get("/api/store/orders")
      .set("Authorization", `Bearer ${tokenStoreOwner}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const rawResponse = JSON.stringify(res.body);
    expect(rawResponse).not.toContain("deliveryOtp");
    expect(rawResponse).not.toContain("7890");

    const fetchedOrder = res.body.find((o) => o._id === order._id.toString());
    expect(fetchedOrder.deliveryOtp).toBeUndefined();
  });

  test("3. GET /api/store/orders/:orderId as owning store owner must NOT expose deliveryOtp anywhere in the response", async () => {
    const res = await request(app)
      .get(`/api/store/orders/${order._id}`)
      .set("Authorization", `Bearer ${tokenStoreOwner}`);

    expect(res.status).toBe(200);

    const rawResponse = JSON.stringify(res.body);
    expect(rawResponse).not.toContain("deliveryOtp");
    expect(rawResponse).not.toContain("7890");
    expect(res.body.deliveryOtp).toBeUndefined();
  });

  test("4. GET /api/customer/orders as owning customer MUST contain deliveryOtp", async () => {
    const res = await request(app)
      .get("/api/customer/orders")
      .set("Authorization", `Bearer ${tokenCustomer}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const fetchedOrder = res.body.find((o) => o._id === order._id.toString());
    expect(fetchedOrder).toBeDefined();
    expect(fetchedOrder.deliveryOtp).toBe("7890");
  });

  test("5. GET /api/customer/orders/:orderId as owning customer MUST contain deliveryOtp", async () => {
    const res = await request(app)
      .get(`/api/customer/orders/${order._id}`)
      .set("Authorization", `Bearer ${tokenCustomer}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(order._id.toString());
    expect(res.body.deliveryOtp).toBe("7890");
  });
});
