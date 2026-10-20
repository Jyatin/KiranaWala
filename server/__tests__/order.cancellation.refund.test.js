"use strict";

const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Store = require("../models/store");
const Product = require("../models/product");
const Order = require("../models/order");
const customerRoutes = require("../routes/customerRoutes");
const storeRoutes = require("../routes/storeRoutes");
const PaymentService = require("../services/paymentService");
const InventoryService = require("../services/inventoryService");

const JWT_SECRET = "kiranawala-dev-secret-key-12345";

describe("Phase 3: Paid Order Cancellation & Automated Refund Lifecycle", () => {
  let app, customer, storeOwner, store, product, customerToken, storeOwnerToken;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_CANCEL_REFUND";
    if (!mongoUri.includes("TEST")) {
      throw new Error("Safety check: Database name must contain TEST");
    }
    await mongoose.connect(mongoUri);
    await mongoose.connection.db.dropDatabase();

    app = express();
    app.use(express.json());
    app.use("/api/customer", customerRoutes);
    app.use("/api/store-owner", storeRoutes);
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    process.env.ENABLE_MOCK_PAYMENTS = "true";
    process.env.JWT_SECRET = JWT_SECRET;

    await User.deleteMany({});
    await Store.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    customer = await User.create({
      username: "cancelCust",
      email: "cancelCust@test.com",
      password: "password123",
      role: "customer",
    });
    customerToken = jwt.sign(
      { id: customer._id.toString(), role: "customer" },
      JWT_SECRET
    );

    storeOwner = await User.create({
      username: "cancelOwner",
      email: "cancelOwner@test.com",
      password: "password123",
      role: "store-owner",
    });
    storeOwnerToken = jwt.sign(
      { id: storeOwner._id.toString(), role: "store-owner" },
      JWT_SECRET
    );

    store = await Store.create({
      name: "Cancellation Test Store",
      description: "Store Description",
      category: "Groceries",
      owner: storeOwner._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });

    product = await Product.create({
      name: "Sunflower Oil 1L",
      store: store._id,
      description: "Cooking Oil",
      image: "https://images.unsplash.com/photo-oil",
      price: 150,
      stock: 20,
      availableStock: 20,
      reservedStock: 0,
      soldStock: 0,
      category: "Oils",
    });
  });

  test("1. Unpaid pending_payment order cancellation releases reserved stock", async () => {
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
          unitPrice: 150,
          quantity: 2,
          subtotal: 300,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 300,
      total: 300,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      status: "pending_payment",
    });

    const res = await request(app)
      .patch(`/api/customer/orders/${order._id}/cancel`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.status).toBe("cancelled");
    expect(checkOrder.paymentStatus).toBe("failed");

    const p = await Product.findById(product._id);
    expect(p.availableStock).toBe(20);
    expect(p.reservedStock).toBe(0);
    expect(p.stock).toBe(20);
  });

  test("2. Unpaid placed order cancellation restores committed stock", async () => {
    await Product.updateOne(
      { _id: product._id },
      { $inc: { stock: -3, availableStock: -3, soldStock: 3 } }
    );

    const order = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 150,
          quantity: 3,
          subtotal: 450,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 450,
      total: 450,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "placed",
    });

    const res = await request(app)
      .patch(`/api/customer/orders/${order._id}/cancel`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.status).toBe("cancelled");

    const p = await Product.findById(product._id);
    expect(p.availableStock).toBe(20);
    expect(p.stock).toBe(20);
    expect(p.soldStock).toBe(0);
  });

  test("3. Paid order cancellation by customer triggers automated refund workflow and restores stock", async () => {
    // Commit stock for paid order
    await Product.updateOne(
      { _id: product._id },
      { $inc: { stock: -4, availableStock: -4, soldStock: 4 } }
    );

    const order = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 150,
          quantity: 4,
          subtotal: 600,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 600,
      total: 600,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
      razorpayOrderId: "order_mock_paid_1",
      razorpayPaymentId: "pay_mock_paid_1",
    });

    const res = await request(app)
      .patch(`/api/customer/orders/${order._id}/cancel`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.status).toBe("refunded");
    expect(checkOrder.paymentStatus).toBe("refunded");

    const p = await Product.findById(product._id);
    expect(p.availableStock).toBe(20);
    expect(p.stock).toBe(20);
    expect(p.soldStock).toBe(0);
  });

  test("4. Concurrent cancellation requests against a paid order process refund exactly once", async () => {
    await Product.updateOne(
      { _id: product._id },
      { $inc: { stock: -2, availableStock: -2, soldStock: 2 } }
    );

    const order = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 150,
          quantity: 2,
          subtotal: 300,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 300,
      total: 300,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
      razorpayOrderId: "order_mock_paid_race",
      razorpayPaymentId: "pay_mock_paid_race",
    });

    // Fire 5 concurrent cancellation requests
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .patch(`/api/customer/orders/${order._id}/cancel`)
          .set("Authorization", `Bearer ${customerToken}`)
      )
    );

    const successfulResponses = responses.filter((r) => r.status === 200);
    expect(successfulResponses.length).toBe(1);

    const p = await Product.findById(product._id);
    // Stock must be restored exactly once (+2), never multiplied (+4, +10)
    expect(p.stock).toBe(20);
    expect(p.availableStock).toBe(20);
    expect(p.soldStock).toBe(0);
  });

  test("5. Store owner cancelling a paid order triggers automated refund workflow", async () => {
    await Product.updateOne(
      { _id: product._id },
      { $inc: { stock: -1, availableStock: -1, soldStock: 1 } }
    );

    const order = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 150,
          quantity: 1,
          subtotal: 150,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 150,
      total: 150,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
      razorpayOrderId: "order_mock_store_cancel",
      razorpayPaymentId: "pay_mock_store_cancel",
    });

    const res = await request(app)
      .patch(`/api/store-owner/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${storeOwnerToken}`)
      .send({ status: "cancelled" });

    expect(res.status).toBe(200);

    const checkOrder = await Order.findById(order._id);
    expect(checkOrder.status).toBe("refunded");
    expect(checkOrder.paymentStatus).toBe("refunded");

    const p = await Product.findById(product._id);
    expect(p.stock).toBe(20);
    expect(p.availableStock).toBe(20);
  });
});
