"use strict";

const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Store = require("../models/store");
const Order = require("../models/order");
const Product = require("../models/product");
const Coupon = require("../models/coupon");

const { getJwtSecret } = require("../config/jwt");
const { escapeRegex } = require("../utils/sanitize");
const { deactivateDemoAccounts } = require("../scripts/seedDemoData");
const customerRoutes = require("../routes/customerRoutes");
const storeRoutes = require("../routes/storeRoutes");
const couponRoutes = require("../routes/couponRoutes");
const paymentRoutes = require("../routes/paymentRoutes");
const deliveryRoutes = require("../routes/deliveryRoutes");

// Construct express application matching middleware order in server.js
const app = express();
app.use(
  "/api/payments/webhook",
  express.raw({ type: "*/*" }),
  (req, res, next) => {
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body;
      try {
        req.body = JSON.parse(req.body.toString("utf8"));
      } catch {
        req.body = {};
      }
    }
    next();
  }
);
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use("/api/customer", customerRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/delivery", deliveryRoutes);

describe("Security Audit Regression Suite — Stages 1 through 6", () => {
  const TEST_SECRET = getJwtSecret();
  let testCustomer, testStore, testOwner;

  const validDeliveryAddress = {
    fullName: "Test Customer",
    phone: "+91 98765 43210",
    address: "123 MG Road, Bellandur",
    city: "Bengaluru",
    pincode: "560001",
  };

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_SECURITY_AUDIT";
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
    await Product.deleteMany({});
    await Coupon.deleteMany({});

    testOwner = await User.create({
      username: "merchant_test",
      email: "merchant_secret@test.com",
      password: "password123",
      role: "store-owner",
      phone: "+91 98000 12345",
    });

    testStore = await Store.create({
      name: "Security Audited Store",
      category: "Groceries",
      description: "Clean fresh produce",
      owner: testOwner._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });

    testCustomer = await User.create({
      username: "customer_test",
      email: "customer@test.com",
      password: "password123",
      role: "customer",
    });
  });

  // =========================================================================
  // STAGE 1: Centralized JWT & Startup Validation
  // =========================================================================
  describe("Stage 1: Centralized JWT & Configuration", () => {
    it("should provide valid test secret in test environment and throw on insecure secret in production", () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSecret = process.env.JWT_SECRET;
      try {
        process.env.NODE_ENV = "production";
        process.env.JWT_SECRET = "your_jwt_secret";
        expect(() => getJwtSecret()).toThrow(/prohibited in production/i);
      } finally {
        process.env.NODE_ENV = originalEnv;
        process.env.JWT_SECRET = originalSecret;
      }
    });

    it("should reject token signed with an invalid or third-party secret", async () => {
      const attackerToken = jwt.sign(
        { id: testCustomer._id, role: "customer" },
        "completely_wrong_secret_12345678901234567890"
      );

      const res = await request(app)
        .post("/api/coupons/validate")
        .set("Authorization", `Bearer ${attackerToken}`)
        .send({ code: "WELCOME100" });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid or expired token/i);
    });

    it("should throw in production if JWT_SECRET is missing or less than 32 characters", () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSecret = process.env.JWT_SECRET;
      try {
        process.env.NODE_ENV = "production";
        delete process.env.JWT_SECRET;
        expect(() => getJwtSecret()).toThrow(/JWT_SECRET environment variable is missing/i);

        process.env.JWT_SECRET = "short_secret";
        expect(() => getJwtSecret()).toThrow(/must be at least 32 characters/i);
      } finally {
        process.env.NODE_ENV = originalEnv;
        process.env.JWT_SECRET = originalSecret;
      }
    });
  });

  // =========================================================================
  // STAGE 2: Razorpay Webhook Verification
  // =========================================================================
  describe("Stage 2: Razorpay Webhook Security", () => {
    const WEBHOOK_SECRET = "audit_webhook_secret_32_characters_safe!";

    beforeAll(() => {
      process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    });

    it("should reject webhook request missing x-razorpay-signature header", async () => {
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .send({ event: "payment.captured" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/missing x-razorpay-signature/i);
    });

    it("should reject webhook with malformed signature format (non-hex or wrong length)", async () => {
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-razorpay-signature", "not_a_valid_hex_signature")
        .send({ event: "payment.captured" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid webhook signature/i);
    });

    it("should reject webhook with valid-format hex signature that does not match payload HMAC", async () => {
      const fakeHexSig = crypto.randomBytes(32).toString("hex"); // 64 hex chars
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-razorpay-signature", fakeHexSig)
        .send({ event: "payment.captured" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid webhook signature/i);
    });

    it("should successfully process payment.captured event with exact raw body HMAC", async () => {
      const order = await Order.create({
        customer: testCustomer._id,
        store: testStore._id,
        items: [],
        subtotal: 500,
        total: 500,
        status: "pending_payment",
        paymentStatus: "pending",
        paymentMethod: "razorpay",
        razorpayOrderId: "order_rzp_audit_999",
        deliveryAddress: validDeliveryAddress,
      });

      const payloadString = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_rzp_audit_111",
              order_id: "order_rzp_audit_999",
              amount: 50000,
            },
          },
        },
      });

      const validSignature = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(Buffer.from(payloadString, "utf8"))
        .digest("hex");

      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-razorpay-signature", validSignature)
        .send(payloadString);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");

      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.paymentStatus).toBe("paid");
      expect(updatedOrder.status).toBe("confirmed");
    });
  });

  // =========================================================================
  // STAGE 3: Demo Account and Seed-Data Protection
  // =========================================================================
  describe("Stage 3: Demo Account & Seed Protection", () => {
    it("should successfully deactivate all demo domain accounts via deactivateDemoAccounts()", async () => {
      await User.create([
        {
          username: "demo_admin",
          email: "admin@kiranawala.demo",
          password: "password123",
          role: "admin",
          isActive: true,
        },
        {
          username: "demo_runner",
          email: "runner_rahul@kiranawala.demo",
          password: "password123",
          role: "delivery-partner",
          isActive: true,
        },
      ]);

      const deactivated = await deactivateDemoAccounts();
      expect(deactivated).toBeGreaterThanOrEqual(2);

      const checkAdmin = await User.findOne({ email: "admin@kiranawala.demo" });
      expect(checkAdmin.isActive).toBe(false);
    });
  });

  // =========================================================================
  // STAGE 4: Authorization and Sensitive Data Exposure
  // =========================================================================
  describe("Stage 4: Data Exposure and Authorization Boundaries", () => {
    it("should never expose merchant email, phone, or password in GET /api/customer/stores", async () => {
      const res = await request(app).get("/api/customer/stores");
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);

      const storeResult = res.body.find((s) => s._id.toString() === testStore._id.toString());
      expect(storeResult).toBeDefined();
      expect(storeResult.owner.username).toBe("merchant_test");
      expect(storeResult.owner.email).toBeUndefined();
      expect(storeResult.owner.phone).toBeUndefined();
      expect(storeResult.owner.password).toBeUndefined();
    });

    it("should never expose merchant email in GET /api/customer/stores/:id", async () => {
      const res = await request(app).get(`/api/customer/stores/${testStore._id}`);
      expect(res.status).toBe(200);
      expect(res.body.owner.username).toBe("merchant_test");
      expect(res.body.owner.email).toBeUndefined();
      expect(res.body.owner.password).toBeUndefined();
    });

    it("should require authentication on POST /api/coupons/validate and ignore client-supplied userId", async () => {
      // Missing auth token -> 401
      const unauthRes = await request(app)
        .post("/api/coupons/validate")
        .send({ code: "WELCOME100", subtotal: 600 });
      expect(unauthRes.status).toBe(401);

      // Authenticated call -> derives customer from token
      const validToken = jwt.sign(
        { id: testCustomer._id, role: "customer" },
        TEST_SECRET
      );

      const authRes = await request(app)
        .post("/api/coupons/validate")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          code: "NONEXISTENT_CODE",
          subtotal: 600,
          userId: "attacker_spoofed_user_id",
        });

      // Should process using token identity, rejecting non-existent coupon
      expect(authRes.status).toBe(400);
      expect(authRes.body.message).toMatch(/invalid or inactive/i);
    });

    it("should strictly hide delivery OTP from store owner and delivery partner in track endpoint", async () => {
      const deliveryRunner = await User.create({
        username: "runner_agent",
        email: "runner_agent@test.com",
        password: "password123",
        role: "delivery-partner",
      });

      const orderWithOtp = await Order.create({
        customer: testCustomer._id,
        store: testStore._id,
        deliveryPartner: deliveryRunner._id,
        items: [],
        subtotal: 300,
        total: 300,
        status: "out_for_delivery",
        paymentStatus: "paid",
        deliveryOtp: "8492",
        deliveryAddress: validDeliveryAddress,
      });

      // 1. Merchant tracking view -> deliveryOtp MUST be stripped
      const merchantToken = jwt.sign(
        { id: testOwner._id, role: "store-owner" },
        TEST_SECRET
      );
      const merchantRes = await request(app)
        .get(`/api/delivery/orders/${orderWithOtp._id}/track`)
        .set("Authorization", `Bearer ${merchantToken}`);
      expect(merchantRes.status).toBe(200);
      expect(merchantRes.body.deliveryOtp).toBeUndefined();

      // 2. Runner tracking view -> deliveryOtp MUST be stripped
      const runnerToken = jwt.sign(
        { id: deliveryRunner._id, role: "delivery-partner" },
        TEST_SECRET
      );
      const runnerRes = await request(app)
        .get(`/api/delivery/orders/${orderWithOtp._id}/track`)
        .set("Authorization", `Bearer ${runnerToken}`);
      expect(runnerRes.status).toBe(200);
      expect(runnerRes.body.deliveryOtp).toBeUndefined();

      // 3. Customer tracking view -> deliveryOtp MUST be delivered
      const customerToken = jwt.sign(
        { id: testCustomer._id, role: "customer" },
        TEST_SECRET
      );
      const customerRes = await request(app)
        .get(`/api/delivery/orders/${orderWithOtp._id}/track`)
        .set("Authorization", `Bearer ${customerToken}`);
      expect(customerRes.status).toBe(200);
      expect(customerRes.body.deliveryOtp).toBe("8492");
    });
  });

  // =========================================================================
  // STAGE 5: Payment and Inventory Consistency
  // =========================================================================
  describe("Stage 5: Inventory and Payment State Consistency", () => {
    it("should prevent late payment events on cancelled orders", async () => {
      const cancelledOrder = await Order.create({
        customer: testCustomer._id,
        store: testStore._id,
        items: [],
        subtotal: 400,
        total: 400,
        status: "cancelled",
        paymentStatus: "failed",
        razorpayOrderId: "order_cancelled_late_123",
        deliveryAddress: validDeliveryAddress,
      });

      const { confirmPayment } = require("../services/paymentService");
      await expect(
        confirmPayment({
          orderId: cancelledOrder._id,
          razorpayOrderId: "order_cancelled_late_123",
          razorpayPaymentId: "pay_late_123",
          razorpaySignature: "sig_late_123",
          source: "webhook",
        })
      ).rejects.toThrow(/order cannot be confirmed.*cancelled/i);
    });
  });

  // =========================================================================
  // STAGE 6: Input Validation & API Hardening
  // =========================================================================
  describe("Stage 6: Input Validation, ReDoS Prevention & Generic Errors", () => {
    it("should properly escape regex special characters via escapeRegex()", () => {
      const maliciousInput = "test.*+?^${}()|[]\\";
      const escaped = escapeRegex(maliciousInput);
      expect(escaped).toBe("test\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");

      // Verify safe evaluation inside RegExp constructor without crashing or catastrophic backtracking
      const rx = new RegExp(escaped, "i");
      expect(rx.test("test.*+?^${}()|[]\\")).toBe(true);
      expect(rx.test("testABCD")).toBe(false);
    });

    it("should return generic 401 for both non-existent user and invalid password", async () => {
      // 1. Non-existent account
      const resNonExistent = await request(app)
        .post("/api/customer/login")
        .send({ email: "does_not_exist@test.com", password: "wrongpassword" });

      expect(resNonExistent.status).toBe(401);
      expect(resNonExistent.body.message).toBe("Invalid email or password");

      // 2. Existing account with incorrect password
      const resBadPass = await request(app)
        .post("/api/customer/login")
        .send({ email: "customer@test.com", password: "incorrect_password_999" });

      expect(resBadPass.status).toBe(401);
      expect(resBadPass.body.message).toBe("Invalid email or password");
    });
  });
});
