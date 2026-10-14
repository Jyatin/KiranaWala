const express = require("express");
const request = require("supertest");
const crypto = require("crypto");

jest.mock("../services/paymentService", () => ({
  confirmPayment: jest.fn(),
  handlePaymentFailure: jest.fn(),
  createOrder: jest.fn(),
  processRefund: jest.fn(),
}));

jest.mock("../models/order", () => ({
  findOne: jest.fn(),
}));

const paymentRoutes = require("../routes/paymentRoutes");
const PaymentService = require("../services/paymentService");
const Order = require("../models/order");

const SECRET = "test-webhook-secret";

function makeApp() {
  const app = express();
  app.use(express.json({
    verify: (req, res, buffer) => {
      if (req.originalUrl.split("?")[0] === "/api/payments/webhook") {
        req.rawBody = Buffer.from(buffer);
      }
    },
  }));
  app.use("/api/payments", paymentRoutes);
  return app;
}

function sign(body, secret = SECRET) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("Razorpay webhook signature verification", () => {
  let app;
  let originalSecret;

  beforeEach(() => {
    app = makeApp();
    originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
    } else {
      process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret;
    }
  });

  test("rejects a webhook with no signature", async () => {
    const response = await request(app)
      .post("/api/payments/webhook")
      .send({ event: "test.event" });

    expect(response.status).toBe(400);
    expect(Order.findOne).not.toHaveBeenCalled();
  });

  test("fails closed when the webhook secret is not configured", async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;

    const response = await request(app)
      .post("/api/payments/webhook")
      .set("x-razorpay-signature", "a".repeat(64))
      .send({ event: "test.event" });

    expect(response.status).toBe(503);
    expect(Order.findOne).not.toHaveBeenCalled();
  });

  test("rejects a malformed signature", async () => {
    const response = await request(app)
      .post("/api/payments/webhook")
      .set("x-razorpay-signature", "not-a-signature")
      .send({ event: "test.event" });

    expect(response.status).toBe(400);
    expect(Order.findOne).not.toHaveBeenCalled();
  });

  test("rejects an incorrect but well-formed signature", async () => {
    const body = JSON.stringify({ event: "test.event" });
    const response = await request(app)
      .post("/api/payments/webhook")
      .set("content-type", "application/json")
      .set("x-razorpay-signature", sign(body, "wrong-secret"))
      .send(body);

    expect(response.status).toBe(401);
    expect(Order.findOne).not.toHaveBeenCalled();
  });

  test("accepts a correctly signed raw request body", async () => {
    const body = JSON.stringify({ event: "test.event" });
    const response = await request(app)
      .post("/api/payments/webhook")
      .set("content-type", "application/json")
      .set("x-razorpay-signature", sign(body))
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(Order.findOne).not.toHaveBeenCalled();
    expect(PaymentService.confirmPayment).not.toHaveBeenCalled();
  });
});
