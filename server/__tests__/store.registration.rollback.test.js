const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const storeRoutes = require("../routes/storeRoutes");
const User = require("../models/user");
const Store = require("../models/store");

const app = express();
app.use(express.json());
app.use("/api/store", storeRoutes);

let replSet;

describe("Store Owner Registration Transaction", () => {
  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      binary: {
        version: "6.0.6",
      },
      replSet: {
        count: 1,
      },
      instanceOpts: [
        {
          dbName: "kiranawala_registration_TEST",
        },
      ],
    });

    await mongoose.connect(replSet.getUri(), {
      dbName: "kiranawala_registration_TEST",
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Store.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await replSet.stop();
  });

  it("should rollback the User when Store creation fails", async () => {
    const originalStoreSave = Store.prototype.save;

    // Force Store creation to fail after User has already been saved.
    Store.prototype.save = async function () {
      throw new Error("Simulated Store creation failure");
    };

    try {
      const res = await request(app).post("/api/store/register").send({
        username: "rollback_test_user",
        email: "rollback_test@example.com",
        password: "TestPassword@123",
        storeName: "Rollback Test Store",
        storeDescription: "Store used for rollback testing",
        storeCategory: "Kirana & Grocery",
      });

      // Registration must fail.
      expect(res.statusCode).toBe(500);

      // The transaction must have rolled back the User.
      const user = await User.findOne({
        email: "rollback_test@example.com",
      });

      expect(user).toBeNull();

      // The Store must also not exist.
      const store = await Store.findOne({
        name: "Rollback Test Store",
      });

      expect(store).toBeNull();
    } finally {
      // Restore Store.save for other tests.
      Store.prototype.save = originalStoreSave;
    }
  });
});