"use strict";

const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Store = require("../models/store");
const Product = require("../models/product");
const Cart = require("../models/cart");
const Order = require("../models/order");
const customerRoutes = require("../routes/customerRoutes");
const InventoryService = require("../services/inventoryService");

const JWT_SECRET = "kiranawala-dev-secret-key-12345";

describe("Phase 5: Race-Safe Inventory Concurrency & High-Contention Invariants", () => {
  let app, storeOwner, store;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_CONCURRENCY";
    if (!mongoUri.includes("TEST")) {
      throw new Error("Safety check: Database name must contain TEST");
    }
    await mongoose.connect(mongoUri);
    await mongoose.connection.db.dropDatabase();

    app = express();
    app.use(express.json());
    app.use("/api/customer", customerRoutes);
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await User.deleteMany({});
    await Store.deleteMany({});
    await Product.deleteMany({});
    await Cart.deleteMany({});
    await Order.deleteMany({});

    storeOwner = await User.create({
      username: "concStoreOwner",
      email: "concStoreOwner@test.com",
      password: "password123",
      role: "store-owner",
    });

    store = await Store.create({
      name: "High Concurrency Flash Sale Store",
      description: "Store Description",
      category: "Groceries",
      owner: storeOwner._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });
  });

  jest.setTimeout(30000);

  test("1. Invariant Verification: 100 concurrent checkout attempts competing for stock = 1", async () => {
    // Single unit flash-sale item
    const singleItem = await Product.create({
      name: "Limited Edition Saffron 1g",
      store: store._id,
      description: "Rare Kashmiri Saffron",
      image: "https://images.unsplash.com/photo-saffron",
      price: 500,
      stock: 1,
      availableStock: 1,
      reservedStock: 0,
      soldStock: 0,
      category: "Spices",
    });

    const NUM_CUSTOMERS = 100;
    const customerTokens = [];

    // Create 100 distinct customers with active carts
    for (let i = 0; i < NUM_CUSTOMERS; i++) {
      const cust = await User.create({
        username: `flashCust_${i}_${Date.now()}_${Math.random()}`,
        email: `flashCust_${i}_${Date.now()}_${Math.random()}@test.com`,
        password: "password123",
        role: "customer",
      });
      const token = jwt.sign(
        { id: cust._id.toString(), role: "customer" },
        JWT_SECRET
      );
      customerTokens.push({ cust, token });

      await Cart.create({
        user: cust._id,
        store: store._id,
        items: [
          {
            product: singleItem._id,
            quantity: 1,
          },
        ],
      });
    }

    const deliveryAddress = {
      fullName: "Flash Sale Buyer",
      phone: "+91 99999 00000",
      address: "100 Race Track Rd",
      city: "Bengaluru",
      pincode: "560001",
    };

    const startTime = Date.now();

    // Fire 100 concurrent checkout requests simultaneously
    const results = await Promise.all(
      customerTokens.map(({ token }) =>
        request(app)
          .post("/api/customer/orders")
          .set("Authorization", `Bearer ${token}`)
          .send({
            paymentMethod: "cod",
            deliveryAddress,
          })
      )
    );

    const elapsedMs = Date.now() - startTime;

    const successfulCheckouts = results.filter((r) => r.status === 201);
    const failedCheckouts = results.filter((r) => r.status === 400);

    // Precise invariant assertions
    expect(successfulCheckouts.length).toBe(1);
    expect(failedCheckouts.length).toBe(99);

    // Database post-condition assertions
    const finalProduct = await Product.findById(singleItem._id);
    expect(finalProduct.availableStock).toBe(0);
    expect(finalProduct.reservedStock).toBe(0);
    expect(finalProduct.soldStock).toBe(1);
    expect(finalProduct.stock).toBe(0); // For COD, stock committed to 0

    // Database invariants: stock must NEVER be negative
    expect(finalProduct.availableStock).toBeGreaterThanOrEqual(0);
    expect(finalProduct.stock).toBeGreaterThanOrEqual(0);

    const createdOrders = await Order.find({});
    expect(createdOrders.length).toBe(1);

    console.log(
      `[Concurrency Benchmark Result] 100 concurrent checkouts for stock=1: 1 SUCCESS, 99 REJECTED in ${elapsedMs}ms. Zero oversell.`
    );
  });

  test("2. Multi-Item Cart Atomic Reservation Rollback under Concurrency", async () => {
    // Product A has ample stock (10), Product B has zero stock (0)
    const prodA = await Product.create({
      name: "Available Rice",
      store: store._id,
      description: "Organic Rice",
      image: "https://images.unsplash.com/photo-rice",
      price: 100,
      stock: 10,
      availableStock: 10,
      reservedStock: 0,
      soldStock: 0,
      category: "Staples",
    });

    const prodB = await Product.create({
      name: "Out-Of-Stock Dal",
      store: store._id,
      description: "Organic Dal",
      image: "https://images.unsplash.com/photo-dal",
      price: 120,
      stock: 0,
      availableStock: 0,
      reservedStock: 0,
      soldStock: 0,
      category: "Staples",
    });

    // 20 concurrent reservation attempts requesting [ProdA (1), ProdB (1)]
    const reservationPromises = Array.from({ length: 20 }, () =>
      InventoryService.reserveStock(
        [
          { productId: prodA._id, quantity: 1 },
          { productId: prodB._id, quantity: 1 },
        ],
        15
      ).catch((err) => ({ error: err.message }))
    );

    const outcomes = await Promise.all(reservationPromises);
    const successCount = outcomes.filter((o) => !o.error).length;
    const failureCount = outcomes.filter((o) => o.error).length;

    expect(successCount).toBe(0);
    expect(failureCount).toBe(20);

    // Verify ProdA was rolled back and retained all 10 stock units (no partial reservation leak)
    const checkA = await Product.findById(prodA._id);
    expect(checkA.availableStock).toBe(10);
    expect(checkA.reservedStock).toBe(0);
    expect(checkA.stock).toBe(10);
  });
});
