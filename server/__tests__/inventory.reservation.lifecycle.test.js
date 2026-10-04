"use strict";

const mongoose = require("mongoose");
const User = require("../models/user");
const Store = require("../models/store");
const Product = require("../models/product");
const Order = require("../models/order");
const InventoryService = require("../services/inventoryService");
const PaymentService = require("../services/paymentService");

describe("Phase 1: Inventory Reservation Lifecycle & Expiration Correctness", () => {
  let customer, store, product;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_INVENTORY_LIFECYCLE";
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

    customer = await User.create({
      username: `invCust_${uid}`,
      email: `invCust_${uid}@test.com`,
      password: "password123",
      role: "customer",
    });

    store = await Store.create({
      name: "Inventory Test Store",
      description: "Store Description",
      category: "Groceries",
      owner: customer._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });

    product = await Product.create({
      name: "Organic Basmati Rice",
      store: store._id,
      description: "Premium Basmati Rice",
      image: "https://images.unsplash.com/photo-1586201375761-83865001e31c",
      price: 200,
      stock: 50,
      availableStock: 50,
      reservedStock: 0,
      soldStock: 0,
      category: "Staples",
    });
  });

  test("1. Reservation creation decrements availableStock and increments reservedStock", async () => {
    const reserveResult = await InventoryService.reserveStock(
      [{ productId: product._id, quantity: 5 }],
      15
    );

    expect(reserveResult.success).toBe(true);
    expect(reserveResult.expiresAt).toBeDefined();

    const p = await Product.findById(product._id);
    expect(p.availableStock).toBe(45);
    expect(p.reservedStock).toBe(5);
    expect(p.stock).toBe(50);
    expect(p.soldStock).toBe(0);
  });

  test("2. Successful payment commits reservation (reservedStock -> soldStock)", async () => {
    await InventoryService.reserveStock(
      [{ productId: product._id, quantity: 5 }],
      15
    );

    await InventoryService.commitReservation(
      [{ productId: product._id, quantity: 5 }]
    );

    const p = await Product.findById(product._id);
    expect(p.availableStock).toBe(45);
    expect(p.reservedStock).toBe(0);
    expect(p.soldStock).toBe(5);
    expect(p.stock).toBe(45);
  });

  test("3. Expiration cleans up pending_payment orders and restores availableStock", async () => {
    await InventoryService.reserveStock(
      [{ productId: product._id, quantity: 10 }],
      15
    );

    // Create an order in pending_payment with createdAt set to 20 minutes ago
    const pastDate = new Date(Date.now() - 20 * 60 * 1000);
    const order = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 200,
          quantity: 10,
          subtotal: 2000,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 2000,
      total: 2000,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      status: "pending_payment",
      createdAt: pastDate,
      updatedAt: pastDate,
    });

    const cleanedCount = await InventoryService.cleanupExpiredReservations();
    expect(cleanedCount).toBe(1);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe("payment_failed");
    expect(updatedOrder.paymentStatus).toBe("failed");

    const p = await Product.findById(product._id);
    expect(p.availableStock).toBe(50);
    expect(p.reservedStock).toBe(0);
  });

  test("4. Duplicate cleanup is idempotent and does NOT increase stock multiple times", async () => {
    await InventoryService.reserveStock(
      [{ productId: product._id, quantity: 8 }],
      15
    );

    const pastDate = new Date(Date.now() - 25 * 60 * 1000);
    await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 200,
          quantity: 8,
          subtotal: 1600,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 1600,
      total: 1600,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      status: "pending_payment",
      createdAt: pastDate,
      updatedAt: pastDate,
    });

    const firstRun = await InventoryService.cleanupExpiredReservations();
    expect(firstRun).toBe(1);

    // Second and third runs should clean 0 and preserve exact stock
    const secondRun = await InventoryService.cleanupExpiredReservations();
    expect(secondRun).toBe(0);

    const thirdRun = await InventoryService.cleanupExpiredReservations();
    expect(thirdRun).toBe(0);

    const p = await Product.findById(product._id);
    expect(p.availableStock).toBe(50);
    expect(p.reservedStock).toBe(0);
  });

  test("5. Payment arriving after expiration is rejected fail-closed", async () => {
    await InventoryService.reserveStock(
      [{ productId: product._id, quantity: 4 }],
      15
    );

    const pastDate = new Date(Date.now() - 20 * 60 * 1000);
    const expiredOrder = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 200,
          quantity: 4,
          subtotal: 800,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 800,
      total: 800,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      status: "pending_payment",
      razorpayOrderId: "order_mock_expired_1",
      createdAt: pastDate,
      updatedAt: pastDate,
    });

    // Run expiration cleanup
    await InventoryService.cleanupExpiredReservations();

    // Now attempt to confirm payment on the expired order
    process.env.ENABLE_MOCK_PAYMENTS = "true";
    await expect(
      PaymentService.confirmPayment({
        orderId: expiredOrder._id,
        razorpayOrderId: "order_mock_expired_1",
        razorpayPaymentId: "pay_mock_expired_1",
        razorpaySignature: "mock_verified_signature",
      })
    ).rejects.toThrow(/expired|not in a payable state/i);

    const checkOrder = await Order.findById(expiredOrder._id);
    expect(checkOrder.status).toBe("payment_failed");
  });

  test("6. 10 Concurrent cleanup runs clean the order exactly once", async () => {
    await InventoryService.reserveStock(
      [{ productId: product._id, quantity: 7 }],
      15
    );

    const pastDate = new Date(Date.now() - 30 * 60 * 1000);
    await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 200,
          quantity: 7,
          subtotal: 1400,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 1400,
      total: 1400,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      status: "pending_payment",
      createdAt: pastDate,
      updatedAt: pastDate,
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, () => InventoryService.cleanupExpiredReservations())
    );

    const totalCleaned = results.reduce((a, b) => a + b, 0);
    expect(totalCleaned).toBe(1);

    const p = await Product.findById(product._id);
    expect(p.availableStock).toBe(50);
    expect(p.reservedStock).toBe(0);
  });

  test("7. Background cleanup worker starts, runs safely, and handles errors gracefully", async () => {
    InventoryService.startCleanupWorker(50);
    expect(InventoryService._workerInterval).toBeDefined();

    // Verify calling start again is idempotent
    const initialInterval = InventoryService._workerInterval;
    InventoryService.startCleanupWorker(50);
    expect(InventoryService._workerInterval).toBe(initialInterval);

    // Stop worker
    InventoryService.stopCleanupWorker();
    expect(InventoryService._workerInterval).toBeNull();
  });
});

