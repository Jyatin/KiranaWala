const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../models/user", () => ({
  findById: jest.fn(),
}));

const { authenticateToken } = require("../middleware/authMiddleware");

function makeApp() {
  const app = express();
  app.get("/protected", authenticateToken, (req, res) => {
    res.json({ user: req.user });
  });
  return app;
}

describe("JWT authentication configuration", () => {
  let originalSecret;

  beforeEach(() => {
    originalSecret = process.env.JWT_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  test("fails closed when JWT_SECRET is missing", async () => {
    delete process.env.JWT_SECRET;

    const response = await request(makeApp())
      .get("/protected")
      .set("authorization", "Bearer any-token");

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Authentication is not configured");
  });

  test("rejects a token signed with a different secret", async () => {
    process.env.JWT_SECRET = "expected-secret";
    const token = jwt.sign({ id: "user-123", role: "customer" }, "other-secret");

    const response = await request(makeApp())
      .get("/protected")
      .set("authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  test("accepts a valid HS256 token", async () => {
    process.env.JWT_SECRET = "expected-secret";
    const token = jwt.sign(
      { id: "user-123", role: "customer" },
      process.env.JWT_SECRET,
      { algorithm: "HS256" }
    );

    const response = await request(makeApp())
      .get("/protected")
      .set("authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe("user-123");
  });
});
