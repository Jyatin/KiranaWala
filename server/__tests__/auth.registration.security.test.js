"use strict";

const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const User = require("../models/user");
const Store = require("../models/store");
const customerRoutes = require("../routes/customerRoutes");
const storeRoutes = require("../routes/storeRoutes");

const app = express();
app.use(express.json());
app.use("/api/customer", customerRoutes);
app.use("/api/store", storeRoutes);

describe("Registration Privilege Escalation Security Tests", () => {
  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_AUTH_REG";
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
  });

  describe("POST /api/customer/register — Role Escalation Tampering", () => {
    const attemptedRoles = ["admin", "delivery-partner", "store-owner"];

    test.each(attemptedRoles)(
      "Registration body containing role='%s' must NOT create user with that privileged role",
      async (attemptedRole) => {
        const uid = Math.random().toString(36).substring(2, 7);
        const email = `attacker_${attemptedRole}_${uid}@test.com`;

        const res = await request(app)
          .post("/api/customer/register")
          .send({
            username: `attacker_${uid}`,
            email,
            password: "password123",
            role: attemptedRole, // Attempted privilege escalation
          });

        expect(res.status).toBe(201);

        const createdUser = await User.findOne({ email });
        expect(createdUser).not.toBeNull();
        // The created user MUST have role 'customer', NOT the injected privileged role
        expect(createdUser.role).toBe("customer");
        expect(createdUser.role).not.toBe(attemptedRole);
      }
    );
  });

  describe("POST /api/store/register — Role Escalation Tampering", () => {
    const attemptedRoles = ["admin", "delivery-partner"];

    test.each(attemptedRoles)(
      "Store registration body containing role='%s' must NOT create user with that privileged role",
      async (attemptedRole) => {
        const uid = Math.random().toString(36).substring(2, 7);
        const email = `merchant_attacker_${attemptedRole}_${uid}@test.com`;

        const res = await request(app)
          .post("/api/store/register")
          .send({
            username: `merchant_${uid}`,
            email,
            password: "password123",
            storeName: `Store ${uid}`,
            storeDescription: "Test store description",
            storeCategory: "Groceries",
            role: attemptedRole, // Attempted privilege escalation
          });

        expect(res.status).toBe(201);

        const createdUser = await User.findOne({ email });
        expect(createdUser).not.toBeNull();
        // The created user MUST have role 'store-owner', NOT the injected privileged role
        expect(createdUser.role).toBe("store-owner");
        expect(createdUser.role).not.toBe(attemptedRole);
      }
    );
  });
});
