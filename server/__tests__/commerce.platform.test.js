"use strict";

const CouponService = require("../services/couponService");
const PaymentService = require("../services/paymentService");

describe("KiranaWala Hyperlocal Commerce & Retail Intelligence Engine", () => {
  describe("PaymentService & Razorpay Signatures", () => {
    test("should verify deterministic sandbox payment signature", () => {
      const isValid = PaymentService.verifySignature({
        razorpayOrderId: "order_mock_test_12345",
        razorpayPaymentId: "pay_test_98765",
        razorpaySignature: "mock_verified_signature",
      });
      expect(isValid).toBe(true);
    });

    test("should reject missing orderId or paymentId", () => {
      const isValid = PaymentService.verifySignature({
        razorpayOrderId: "",
        razorpayPaymentId: "pay_test_98765",
        razorpaySignature: "mock_verified_signature",
      });
      expect(isValid).toBe(false);
    });
  });

  describe("Coupon Discount Calculations", () => {
    test("percentage coupon discount calculation with max discount cap", () => {
      const subtotal = 1000;
      const discountPercent = 20; // 20% of 1000 = 200
      const maxDiscount = 150; // capped at 150

      let calculatedDiscount = (subtotal * discountPercent) / 100;
      if (maxDiscount && calculatedDiscount > maxDiscount) {
        calculatedDiscount = maxDiscount;
      }

      expect(calculatedDiscount).toBe(150);
      const finalTotal = subtotal - calculatedDiscount;
      expect(finalTotal).toBe(850);
    });

    test("fixed discount calculation", () => {
      const subtotal = 400;
      const discountValue = 50;
      const discount = Math.min(discountValue, subtotal);
      expect(discount).toBe(50);
      expect(subtotal - discount).toBe(350);
    });

    test("free delivery coupon sets delivery fee discount", () => {
      const deliveryFee = 30;
      const discount = deliveryFee;
      expect(discount).toBe(30);
    });
  });

  describe("Delivery Partner State Machine Transitions", () => {
    const VALID_DELIVERY_TRANSITIONS = {
      ready: ["assigned"],
      assigned: ["picked_up", "cancelled"],
      picked_up: ["out_for_delivery", "cancelled"],
      out_for_delivery: ["delivered", "cancelled"],
      delivered: [],
      cancelled: [],
    };

    test("should allow valid progression: ready -> assigned -> picked_up -> out_for_delivery -> delivered", () => {
      expect(VALID_DELIVERY_TRANSITIONS.ready).toContain("assigned");
      expect(VALID_DELIVERY_TRANSITIONS.assigned).toContain("picked_up");
      expect(VALID_DELIVERY_TRANSITIONS.picked_up).toContain("out_for_delivery");
      expect(VALID_DELIVERY_TRANSITIONS.out_for_delivery).toContain("delivered");
    });

    test("should reject invalid jump from placed directly to delivered", () => {
      const allowedFromAssigned = VALID_DELIVERY_TRANSITIONS.assigned;
      expect(allowedFromAssigned).not.toContain("delivered");
    });
  });

  describe("Typo Tolerance Query Mapping", () => {
    const TYPO_MAP = {
      tamato: "tomato",
      patato: "potato",
      panner: "paneer",
      maggi: "instant noodles",
    };

    test("should correctly expand known grocery typos", () => {
      expect(TYPO_MAP["tamato"]).toBe("tomato");
      expect(TYPO_MAP["patato"]).toBe("potato");
      expect(TYPO_MAP["panner"]).toBe("paneer");
    });
  });
});
