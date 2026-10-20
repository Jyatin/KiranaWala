"use strict";

const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const Store = require("../models/store");
const User = require("../models/user");
const Product = require("../models/product");
const Order = require("../models/order");
const PaymentService = require("../services/paymentService");
const paymentRoutes = require("../routes/paymentRoutes");

const app = express();
app.use(express.json());
app.use("/api/payments", paymentRoutes);

describe("Double-Refund Concurrency & Race Condition Tests", () => {
  const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
  let customer, owner, store, product, paidOrder, tokenOwner;
  let mockRefundCalls = 0;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_CONCURRENCY";
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
    mockRefundCalls = 0;

    await User.deleteMany({});
    await Store.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    const uid = Math.random().toString(36).substring(2, 7);

    // Customer
    customer = await User.create({
      username: `concCust_${uid}`,
      email: `concCust_${uid}@test.com`,
      password: "password123",
      role: "customer",
    });

    // Store Owner
    owner = await User.create({
      username: `concOwner_${uid}`,
      email: `concOwner_${uid}@test.com`,
      password: "password123",
      role: "store-owner",
    });
    tokenOwner = jwt.sign(
      { userId: owner._id, id: owner._id, role: owner.role, email: owner.email },
      JWT_SECRET
    );

    store = await Store.create({
      name: "Concurrency Test Store",
      description: "Store",
      category: "Groceries",
      owner: owner._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });

    product = await Product.create({
      name: "Organic Honey 500g",
      price: 320,
      description: "Pure honey",
      image: "http://example.com/honey.jpg",
      category: "Groceries",
      store: store._id,
      stock: 10,
      availableStock: 9,
      soldStock: 1,
    });

    paidOrder = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: product.price,
          quantity: 1,
          subtotal: product.price,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "456 Test Ave",
        city: "Bengaluru",
        pincode: "560102",
      },
      subtotal: 320,
      deliveryFee: 0,
      total: 320,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "confirmed",
      razorpayOrderId: "order_mock_conc_123",
      razorpayPaymentId: "pay_mock_conc_123",
    });
  });

  test("10 simultaneous refund requests on the same paid order must call refund provider exactly once and succeed exactly once", async () => {
    // Mock the provider to count calls and add a tiny delay to expose race windows
    const mockProvider = {
      isSandbox: false,
      keyId: "rzp_test_mock",
      async processRefund() {
        mockRefundCalls++;
        // 20ms delay simulating network hop to Razorpay API
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { id: `rfnd_${Date.now()}`, status: "processed" };
      },
    };

    const originalGetProvider = PaymentService.getProvider;
    PaymentService.getProvider = () => mockProvider;

    try {
      // Fire 10 simultaneous refund requests for the exact same order
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post("/api/payments/refund")
          .set("Authorization", `Bearer ${tokenOwner}`)
          .send({ orderId: paidOrder._id, reason: `Concurrent refund attempt #${i + 1}` })
      );

      const results = await Promise.all(requests);

      const successCount = results.filter((r) => r.status === 200).length;
      const failureCount = results.filter((r) => r.status === 400 || r.status === 404).length;

      // Exactly ONE request must succeed; exactly NINE must be rejected
      expect(mockRefundCalls).toBe(1);
      expect(successCount).toBe(1);
      expect(failureCount).toBe(9);

      // Verify order final state in DB
      const finalOrder = await Order.findById(paidOrder._id);
      expect(finalOrder.paymentStatus).toBe("refunded");
      expect(finalOrder.status).toBe("refunded");
    } finally {
      PaymentService.getProvider = originalGetProvider;
    }
  });
});
