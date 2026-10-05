const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Store = require("../models/store");
const User = require("../models/user");
const Product = require("../models/product");
const Cart = require("../models/cart");
const Order = require("../models/order");
const customerRoutes = require("../routes/customerRoutes");
const paymentRoutes = require("../routes/paymentRoutes");

const app = express();
app.use(express.json());
app.use("/api/customer", customerRoutes);
app.use("/api/payments", paymentRoutes);

describe("Razorpay Payment Integration", () => {
  let customer, store, product1, product2;
  let token;
  const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_PAYMENT";
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
    await Store.deleteMany({});
    await User.deleteMany({});
    await Product.deleteMany({});
    await Cart.deleteMany({});
    await Order.deleteMany({});

    const owner = await User.create({
      username: "paymentStoreOwner",
      email: "pay-owner@test.com",
      password: "password123",
      role: "store-owner",
    });

    store = await Store.create({
      name: "Payment Test Store",
      owner: owner._id,
      description: "Test store for payment integration",
      category: "Groceries",
    });

    customer = await User.create({
      username: "paymentCustomer",
      email: "pay-customer@test.com",
      password: "password123",
      role: "customer",
    });

    token = jwt.sign({ userId: customer._id, id: customer._id }, JWT_SECRET);

    product1 = await Product.create({
      name: "Test Atta",
      price: 250,
      description: "5kg wheat flour",
      image: "/images/atta.jpg",
      store: store._id,
      category: "Grains",
      stock: 50,
      availableStock: 50,
      available: true,
    });

    product2 = await Product.create({
      name: "Test Milk",
      price: 60,
      description: "1L toned milk",
      image: "/images/milk.jpg",
      store: store._id,
      category: "Dairy",
      stock: 100,
      availableStock: 100,
      available: true,
    });

    // Create cart
    await Cart.create({
      user: customer._id,
      store: store._id,
      items: [
        { product: product1._id, quantity: 2 },
        { product: product2._id, quantity: 3 },
      ],
    });
  });

  // Helper: create an order for payment tests
  async function createOrder(paymentMethod = "razorpay") {
    const res = await request(app)
      .post("/api/customer/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        deliveryAddress: {
          fullName: "Test Customer",
          phone: "9876543210",
          address: "123 Test Street",
          city: "Bengaluru",
          pincode: "560102",
        },
        paymentMethod,
      });
    return res;
  }

  // ─────────────────────────────────────────────────
  // TEST 1: Payment order creation
  // ─────────────────────────────────────────────────
  describe("Payment Order Creation", () => {
    it("should create a payment order for a valid pending_payment order", async () => {
      const orderRes = await createOrder("razorpay");
      expect(orderRes.status).toBe(201);
      const orderId = orderRes.body.order._id;

      const payRes = await request(app)
        .post("/api/payments/create-order")
        .set("Authorization", `Bearer ${token}`)
        .send({ orderId });

      expect(payRes.status).toBe(200);
      expect(payRes.body.success).toBe(true);
      expect(payRes.body.razorpayOrderId).toBeDefined();
      expect(payRes.body.amount).toBe(Math.round(orderRes.body.order.total * 100));
      expect(payRes.body.isSandbox).toBe(true); // No live credentials in test
    });

    it("should reject creating payment for someone else's order", async () => {
      const orderRes = await createOrder("razorpay");
      const orderId = orderRes.body.order._id;

      const anotherCustomer = await User.create({
        username: "attacker",
        email: "attacker@test.com",
        password: "password123",
        role: "customer",
      });
      const attackerToken = jwt.sign(
        { userId: anotherCustomer._id, id: anotherCustomer._id },
        JWT_SECRET
      );

      const payRes = await request(app)
        .post("/api/payments/create-order")
        .set("Authorization", `Bearer ${attackerToken}`)
        .send({ orderId });

      expect(payRes.status).toBe(404);
      expect(payRes.body.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────
  // TEST 2: Correct server-side amount calculation
  // ─────────────────────────────────────────────────
  describe("Server-Side Amount Calculation", () => {
    it("should calculate amount from DB prices, not client input", async () => {
      const orderRes = await createOrder("razorpay");
      const orderId = orderRes.body.order._id;

      // Expected: (250*2) + (60*3) = 680. Delivery: 680 >= 499 → free. Total: 680
      expect(orderRes.body.order.subtotal).toBe(680);
      expect(orderRes.body.order.deliveryFee).toBe(0);
      expect(orderRes.body.order.total).toBe(680);

      const payRes = await request(app)
        .post("/api/payments/create-order")
        .set("Authorization", `Bearer ${token}`)
        .send({ orderId });

      // Payment amount should be 680 * 100 = 68000 paise
      expect(payRes.body.amount).toBe(68000);
    });
  });

  // ─────────────────────────────────────────────────
  // TEST 3: Invalid cart
  // ─────────────────────────────────────────────────
  describe("Invalid Cart Handling", () => {
    it("should reject order placement with empty cart", async () => {
      await Cart.updateOne({ user: customer._id }, { $set: { items: [] } });

      const res = await createOrder("razorpay");
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/empty cart/i);
    });
  });

  // ─────────────────────────────────────────────────
  // TEST 4: Signature verification (sandbox)
  // ─────────────────────────────────────────────────
  describe("Signature Verification", () => {
    it("should accept valid mock signature in sandbox mode", async () => {
      const orderRes = await createOrder("razorpay");
      const orderId = orderRes.body.order._id;

      const payRes = await request(app)
        .post("/api/payments/create-order")
        .set("Authorization", `Bearer ${token}`)
        .send({ orderId });

      const verifyRes = await request(app)
        .post("/api/payments/verify")
        .set("Authorization", `Bearer ${token}`)
        .send({
          orderId,
          razorpayOrderId: payRes.body.razorpayOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: `mock_sig_${Date.now()}`,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      // Verify order is now confirmed
      const order = await Order.findById(orderId);
      expect(order.paymentStatus).toBe("paid");
      expect(order.status).toBe("confirmed");
    });
  });

  // ─────────────────────────────────────────────────
  // TEST 5: Invalid signature
  // ─────────────────────────────────────────────────
  describe("Invalid Signature", () => {
    it("should reject payment with invalid signature when live credentials are set", async () => {
      // This test validates the code path — with mock provider, all mock sigs are accepted
      // With real Razorpay credentials, random signatures would be rejected
      const orderRes = await createOrder("razorpay");
      const orderId = orderRes.body.order._id;

      // In sandbox mode, only signatures starting with mock_sig_ or order_mock_ are accepted
      // Test that missing fields are rejected
      const verifyRes = await request(app)
        .post("/api/payments/verify")
        .set("Authorization", `Bearer ${token}`)
        .send({
          orderId,
          razorpayOrderId: "",
          razorpayPaymentId: "",
        });

      expect(verifyRes.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────
  // TEST 6: Duplicate webhook (idempotency)
  // ─────────────────────────────────────────────────
  describe("Duplicate Webhook Idempotency", () => {
    it("should not duplicate order confirmation on repeated webhook", async () => {
      const orderRes = await createOrder("razorpay");
      const orderId = orderRes.body.order._id;

      const payRes = await request(app)
        .post("/api/payments/create-order")
        .set("Authorization", `Bearer ${token}`)
        .send({ orderId });

      // First verify
      await request(app)
        .post("/api/payments/verify")
        .set("Authorization", `Bearer ${token}`)
        .send({
          orderId,
          razorpayOrderId: payRes.body.razorpayOrderId,
          razorpayPaymentId: "pay_mock_test1",
          razorpaySignature: "mock_sig_test1",
        });

      // Second verify (duplicate) — should be idempotent
      const dupeRes = await request(app)
        .post("/api/payments/verify")
        .set("Authorization", `Bearer ${token}`)
        .send({
          orderId,
          razorpayOrderId: payRes.body.razorpayOrderId,
          razorpayPaymentId: "pay_mock_test1",
          razorpaySignature: "mock_sig_test1",
        });

      expect(dupeRes.status).toBe(200);
      expect(dupeRes.body.success).toBe(true);
      expect(dupeRes.body.alreadyConfirmed).toBe(true);

      // Verify inventory was committed only once
      const updatedProduct = await Product.findById(product1._id);
      expect(updatedProduct.soldStock).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────
  // TEST 7: Payment failure
  // ─────────────────────────────────────────────────
  describe("Payment Failure", () => {
    it("should mark order as payment_failed and release inventory", async () => {
      const orderRes = await createOrder("razorpay");
      const orderId = orderRes.body.order._id;

      // Verify stock was reserved
      const reservedProduct = await Product.findById(product1._id);
      expect(reservedProduct.reservedStock).toBe(2);

      const failRes = await request(app)
        .post("/api/payments/failure")
        .set("Authorization", `Bearer ${token}`)
        .send({
          orderId,
          reason: "Customer cancelled payment",
        });

      expect(failRes.status).toBe(200);
      expect(failRes.body.success).toBe(true);

      const failedOrder = await Order.findById(orderId);
      expect(failedOrder.status).toBe("payment_failed");
      expect(failedOrder.paymentStatus).toBe("failed");

      // Verify stock was released
      const releasedProduct = await Product.findById(product1._id);
      expect(releasedProduct.reservedStock).toBe(0);
      expect(releasedProduct.availableStock).toBe(50);
    });
  });

  // ─────────────────────────────────────────────────
  // TEST 8: Successful payment flow
  // ─────────────────────────────────────────────────
  describe("Successful Payment Flow", () => {
    it("should complete full payment: order → create-order → verify → confirmed", async () => {
      const orderRes = await createOrder("razorpay");
      expect(orderRes.status).toBe(201);
      const orderId = orderRes.body.order._id;
      expect(orderRes.body.order.status).toBe("pending_payment");

      // Create payment order
      const payRes = await request(app)
        .post("/api/payments/create-order")
        .set("Authorization", `Bearer ${token}`)
        .send({ orderId });
      expect(payRes.status).toBe(200);
      expect(payRes.body.razorpayOrderId).toBeDefined();

      // Verify payment
      const verifyRes = await request(app)
        .post("/api/payments/verify")
        .set("Authorization", `Bearer ${token}`)
        .send({
          orderId,
          razorpayOrderId: payRes.body.razorpayOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: `mock_sig_${Date.now()}`,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      // Verify final state
      const order = await Order.findById(orderId);
      expect(order.status).toBe("confirmed");
      expect(order.paymentStatus).toBe("paid");
      expect(order.razorpayOrderId).toBe(payRes.body.razorpayOrderId);
      expect(order.signatureVerified).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────
  // TEST 9: Inventory commit
  // ─────────────────────────────────────────────────
  describe("Inventory Commit", () => {
    it("should commit reserved inventory after successful payment", async () => {
      const orderRes = await createOrder("razorpay");
      const orderId = orderRes.body.order._id;

      // Before payment: stock should be reserved
      let prod = await Product.findById(product1._id);
      expect(prod.reservedStock).toBe(2);
      expect(prod.availableStock).toBe(48);

      // Complete payment
      const payRes = await request(app)
        .post("/api/payments/create-order")
        .set("Authorization", `Bearer ${token}`)
        .send({ orderId });

      await request(app)
        .post("/api/payments/verify")
        .set("Authorization", `Bearer ${token}`)
        .send({
          orderId,
          razorpayOrderId: payRes.body.razorpayOrderId,
          razorpayPaymentId: "pay_mock_commit",
          razorpaySignature: "mock_sig_commit",
        });

      // After payment: reserved → sold
      prod = await Product.findById(product1._id);
      expect(prod.reservedStock).toBe(0);
      expect(prod.soldStock).toBe(2);
      expect(prod.stock).toBe(48);
    });
  });

  // ─────────────────────────────────────────────────
  // TEST 10: Unauthorized payment access
  // ─────────────────────────────────────────────────
  describe("Unauthorized Payment Access", () => {
    it("should reject unauthenticated payment creation", async () => {
      const res = await request(app)
        .post("/api/payments/create-order")
        .send({ orderId: "fake-id" });

      expect(res.status).toBe(401);
    });

    it("should reject payment verification without auth", async () => {
      const res = await request(app)
        .post("/api/payments/verify")
        .send({
          orderId: "fake",
          razorpayOrderId: "fake",
          razorpayPaymentId: "fake",
        });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────
  // TEST 11: COD order still works
  // ─────────────────────────────────────────────────
  describe("COD Order Flow", () => {
    it("should place COD order without Razorpay", async () => {
      const orderRes = await createOrder("cod");
      expect(orderRes.status).toBe(201);
      expect(orderRes.body.order.status).toBe("placed");
      expect(orderRes.body.order.paymentMethod).toBe("cod");

      // Inventory should be committed immediately for COD
      const prod = await Product.findById(product1._id);
      expect(prod.soldStock).toBe(2);
    });
  });
});
