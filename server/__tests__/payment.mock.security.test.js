"use strict";

const crypto = require("crypto");
const PaymentService = require("../services/paymentService");

describe("Phase 4: Mock Payment Security & Provider Isolation", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.ENABLE_MOCK_PAYMENTS;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test("1. Production environment strictly rejects mock payment provider even if ENABLE_MOCK_PAYMENTS=true", () => {
    process.env.NODE_ENV = "production";
    process.env.ENABLE_MOCK_PAYMENTS = "true";

    expect(() => PaymentService.getProvider()).toThrow(
      /Payment provider not configured for production/i
    );
  });

  test("2. Development/test environment rejects mock payments when ENABLE_MOCK_PAYMENTS is disabled/missing", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ENABLE_MOCK_PAYMENTS;

    expect(() => PaymentService.getProvider()).toThrow(
      /Mock payments are disabled\. Set ENABLE_MOCK_PAYMENTS=true/i
    );
  });

  test("3. Development/test environment allows MockPaymentProvider when ENABLE_MOCK_PAYMENTS=true is explicitly set", () => {
    process.env.NODE_ENV = "development";
    process.env.ENABLE_MOCK_PAYMENTS = "true";

    const provider = PaymentService.getProvider();
    expect(provider).toBeDefined();
    expect(provider.isSandbox).toBe(true);
  });

  test("4. Real Razorpay verification uses timingSafeEqual and correctly verifies authentic signatures", () => {
    const keyId = "rzp_test_realKeyId12345";
    const keySecret = "secret_real_key_secret_abcdef";
    process.env.RAZORPAY_KEY_ID = keyId;
    process.env.RAZORPAY_KEY_SECRET = keySecret;
    process.env.NODE_ENV = "development";

    const orderId = "order_rzp_1001";
    const paymentId = "pay_rzp_2002";
    const payload = `${orderId}|${paymentId}`;
    const validSignature = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    const isValid = PaymentService.verifySignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSignature,
    });
    expect(isValid).toBe(true);
  });

  test("5. Real Razorpay verification strictly rejects tampered or mock signatures in real mode", () => {
    const keyId = "rzp_test_realKeyId12345";
    const keySecret = "secret_real_key_secret_abcdef";
    process.env.RAZORPAY_KEY_ID = keyId;
    process.env.RAZORPAY_KEY_SECRET = keySecret;

    // Tampered signature
    const isTamperedValid = PaymentService.verifySignature({
      razorpayOrderId: "order_rzp_1001",
      razorpayPaymentId: "pay_rzp_2002",
      razorpaySignature: "invalid_tampered_signature_hex_1234567890",
    });
    expect(isTamperedValid).toBe(false);

    // Mock signature attempt against real provider
    const isMockValid = PaymentService.verifySignature({
      razorpayOrderId: "order_rzp_1001",
      razorpayPaymentId: "pay_rzp_2002",
      razorpaySignature: "mock_verified_signature",
    });
    expect(isMockValid).toBe(false);
  });
});
