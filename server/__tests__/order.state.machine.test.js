"use strict";

const mongoose = require("mongoose");
const User = require("../models/user");
const Store = require("../models/store");
const Product = require("../models/product");
const Order = require("../models/order");
const PaymentService = require("../services/paymentService");
const {
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  PAYMENT_STATUSES,
  PAYMENT_TRANSITIONS,
  canTransitionOrderStatus,
  canTransitionPaymentStatus,
  validateOrderStatusTransition,
  validatePaymentStatusTransition,
} = require("../utils/orderStateMachine");

describe("Phase 2: Payment and Order State Machine Formal Verification", () => {
  let customer, store, product;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_STATE_MACHINE";
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
    process.env.ENABLE_MOCK_PAYMENTS = "true";
    await User.deleteMany({});
    await Store.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    customer = await User.create({
      username: "stateMachineCust",
      email: "stateMachineCust@test.com",
      password: "password123",
      role: "customer",
    });

    store = await Store.create({
      name: "State Machine Store",
      description: "Store Description",
      category: "Groceries",
      owner: customer._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });

    product = await Product.create({
      name: "Organic Milk",
      store: store._id,
      description: "Fresh Milk",
      image: "https://images.unsplash.com/photo-milk",
      price: 60,
      stock: 50,
      availableStock: 50,
      reservedStock: 0,
      soldStock: 0,
      category: "Dairy",
    });
  });

  describe("State Machine Validation Unit Logic", () => {
    test("1. Valid order transitions pass validation", () => {
      expect(() =>
        validateOrderStatusTransition("pending_payment", "confirmed")
      ).not.toThrow();
      expect(() =>
        validateOrderStatusTransition("confirmed", "packing")
      ).not.toThrow();
      expect(() =>
        validateOrderStatusTransition("packing", "ready")
      ).not.toThrow();
      expect(() =>
        validateOrderStatusTransition("ready", "out_for_delivery")
      ).not.toThrow();
      expect(() =>
        validateOrderStatusTransition("out_for_delivery", "delivered")
      ).not.toThrow();
    });

    test("2. Invalid order transitions throw descriptive errors", () => {
      expect(() =>
        validateOrderStatusTransition("pending_payment", "delivered")
      ).toThrow(/Illegal order status transition/i);
      expect(() =>
        validateOrderStatusTransition("delivered", "placed")
      ).toThrow(/Illegal order status transition/i);
      expect(() =>
        validateOrderStatusTransition("payment_failed", "confirmed")
      ).toThrow(/Illegal order status transition/i);
      expect(() =>
        validateOrderStatusTransition("cancelled", "delivered")
      ).toThrow(/Illegal order status transition/i);
    });

    test("3. Idempotent self-transitions are permitted", () => {
      expect(canTransitionOrderStatus("confirmed", "confirmed")).toBe(true);
      expect(canTransitionPaymentStatus("paid", "paid")).toBe(true);
      expect(() =>
        validateOrderStatusTransition("confirmed", "confirmed")
      ).not.toThrow();
      expect(() =>
        validatePaymentStatusTransition("paid", "paid")
      ).not.toThrow();
    });

    test("4. Dead 'captured' terminology is not in payment enum and is rejected", () => {
      expect(PAYMENT_STATUSES).not.toContain("captured");
      expect(() =>
        validatePaymentStatusTransition("pending", "captured")
      ).toThrow(/Invalid target payment status: 'captured'/i);
    });

    test("5. Valid payment transitions pass validation", () => {
      expect(() =>
        validatePaymentStatusTransition("pending", "paid")
      ).not.toThrow();
      expect(() =>
        validatePaymentStatusTransition("pending", "failed")
      ).not.toThrow();
      expect(() =>
        validatePaymentStatusTransition("paid", "refund_pending")
      ).not.toThrow();
      expect(() =>
        validatePaymentStatusTransition("refund_pending", "refunded")
      ).not.toThrow();
      expect(() =>
        validatePaymentStatusTransition("refund_pending", "paid")
      ).not.toThrow();
    });

    test("6. Invalid payment transitions throw descriptive errors", () => {
      expect(() =>
        validatePaymentStatusTransition("failed", "paid")
      ).toThrow(/Illegal payment status transition/i);
      expect(() =>
        validatePaymentStatusTransition("refunded", "pending")
      ).toThrow(/Illegal payment status transition/i);
    });
  });

  describe("Integration & Concurrent Transitions", () => {
    test("7. PaymentService.confirmPayment performs valid state transitions atomically", async () => {
      const order = await Order.create({
        customer: customer._id,
        store: store._id,
        items: [
          {
            product: product._id,
            productNameSnapshot: product.name,
            unitPrice: 60,
            quantity: 2,
            subtotal: 120,
          },
        ],
        deliveryAddress: {
          fullName: "Test Customer",
          phone: "+91 99999 11111",
          address: "123 Main St",
          city: "Bengaluru",
          pincode: "560038",
        },
        subtotal: 120,
        total: 120,
        paymentMethod: "razorpay",
        paymentStatus: "pending",
        status: "pending_payment",
        razorpayOrderId: "order_mock_valid_1",
      });

      const confirmResult = await PaymentService.confirmPayment({
        orderId: order._id,
        razorpayOrderId: "order_mock_valid_1",
        razorpayPaymentId: "pay_mock_valid_1",
        razorpaySignature: "mock_verified_signature",
      });

      expect(confirmResult.success).toBe(true);
      const updated = await Order.findById(order._id);
      expect(updated.paymentStatus).toBe("paid");
      expect(updated.status).toBe("confirmed");
    });

    test("8. Duplicate confirmPayment calls are idempotent and preserve 'paid' state", async () => {
      const order = await Order.create({
        customer: customer._id,
        store: store._id,
        items: [
          {
            product: product._id,
            productNameSnapshot: product.name,
            unitPrice: 60,
            quantity: 2,
            subtotal: 120,
          },
        ],
        deliveryAddress: {
          fullName: "Test Customer",
          phone: "+91 99999 11111",
          address: "123 Main St",
          city: "Bengaluru",
          pincode: "560038",
        },
        subtotal: 120,
        total: 120,
        paymentMethod: "razorpay",
        paymentStatus: "pending",
        status: "pending_payment",
        razorpayOrderId: "order_mock_dup_1",
      });

      const firstCall = await PaymentService.confirmPayment({
        orderId: order._id,
        razorpayOrderId: "order_mock_dup_1",
        razorpayPaymentId: "pay_mock_dup_1",
        razorpaySignature: "mock_verified_signature",
      });
      expect(firstCall.success).toBe(true);

      const secondCall = await PaymentService.confirmPayment({
        orderId: order._id,
        razorpayOrderId: "order_mock_dup_1",
        razorpayPaymentId: "pay_mock_dup_1",
        razorpaySignature: "mock_verified_signature",
      });
      expect(secondCall.success).toBe(true);
      expect(secondCall.alreadyConfirmed).toBe(true);
    });

    test("9. Concurrent confirmPayment calls do not corrupt state", async () => {
      const order = await Order.create({
        customer: customer._id,
        store: store._id,
        items: [
          {
            product: product._id,
            productNameSnapshot: product.name,
            unitPrice: 60,
            quantity: 1,
            subtotal: 60,
          },
        ],
        deliveryAddress: {
          fullName: "Test Customer",
          phone: "+91 99999 11111",
          address: "123 Main St",
          city: "Bengaluru",
          pincode: "560038",
        },
        subtotal: 60,
        total: 60,
        paymentMethod: "razorpay",
        paymentStatus: "pending",
        status: "pending_payment",
        razorpayOrderId: "order_mock_conc_1",
      });

      const results = await Promise.all([
        PaymentService.confirmPayment({
          orderId: order._id,
          razorpayOrderId: "order_mock_conc_1",
          razorpayPaymentId: "pay_mock_conc_1",
          razorpaySignature: "mock_verified_signature",
        }),
        PaymentService.confirmPayment({
          orderId: order._id,
          razorpayOrderId: "order_mock_conc_1",
          razorpayPaymentId: "pay_mock_conc_1",
          razorpaySignature: "mock_verified_signature",
        }),
      ]);

      expect(results.every((r) => r.success)).toBe(true);
      const updated = await Order.findById(order._id);
      expect(updated.paymentStatus).toBe("paid");
      expect(updated.status).toBe("confirmed");
    });
  });
});
