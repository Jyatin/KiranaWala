const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const Store = require("../models/store");
const User = require("../models/user");
const Product = require("../models/product");
const Order = require("../models/order");
const customerRoutes = require("../routes/customerRoutes");
const storeRoutes = require("../routes/storeRoutes");

const app = express();
app.use(express.json());
app.use("/api/customer", customerRoutes);
app.use("/api/store-owner", storeRoutes);

/**
 * Stock-integrity invariants for concurrent order status changes.
 *
 * Checkout decrements stock when an order is placed. Cancelling an order
 * (by the customer OR the store owner) must give that stock back exactly once,
 * no matter how many cancel/status requests race each other, and an order must
 * never end up "live" (processing/completed) after its stock was released.
 */
describe("Order status transitions - concurrency safety", () => {
  const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
  const INITIAL_STOCK = 50;
  const ORDER_QTY = 2;

  let owner, customer, store, product, order;
  let ownerToken, customerToken;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_ORDER_RACE";
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
    await Promise.all([
      Store.deleteMany({}),
      User.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
    ]);

    owner = await User.create({
      username: "raceOwner",
      email: "race-owner@test.com",
      password: "password123",
      role: "store-owner",
    });
    customer = await User.create({
      username: "raceCustomer",
      email: "race-customer@test.com",
      password: "password123",
      role: "customer",
    });
    store = await Store.create({
      name: "Race Kirana",
      description: "Concurrency test store",
      category: "Grocery",
      owner: owner._id,
    });

    // Stock as it is *after* the order below was placed (already decremented).
    product = await Product.create({
      name: "Basmati Rice 1kg",
      price: 120,
      description: "Premium basmati",
      image: "/images/rice.jpg",
      store: store._id,
      stock: INITIAL_STOCK,
      available: true,
    });

    order = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 120,
          quantity: ORDER_QTY,
          subtotal: 120 * ORDER_QTY,
        },
      ],
      deliveryAddress: {
        fullName: "Rahul Sharma",
        phone: "9876543210",
        address: "Flat 101, Sunshine Heights",
      },
      subtotal: 120 * ORDER_QTY,
      deliveryFee: 0,
      total: 120 * ORDER_QTY,
      status: "placed",
    });

    ownerToken = jwt.sign({ id: owner._id }, JWT_SECRET);
    customerToken = jwt.sign(
      { userId: customer._id, id: customer._id },
      JWT_SECRET,
    );
  });

  const ownerSetStatus = (status) =>
    request(app)
      .patch(`/api/store-owner/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status });

  const customerCancel = () =>
    request(app)
      .patch(`/api/customer/orders/${order._id}/cancel`)
      .set("Authorization", `Bearer ${customerToken}`);

  /**
   * Forces the classic read-check-write interleaving deterministically:
   *   1. the store owner's request reads the order (sees its current status)
   *   2. `interfering()` runs to completion (e.g. the customer cancels)
   *   3. the store owner's request resumes with its now-stale view
   */
  const ownerRequestWithStaleRead = async (ownerStatus, interfering) => {
    const realFindById = Order.findById.bind(Order);
    let signalRead;
    const ownerHasRead = new Promise((resolve) => (signalRead = resolve));
    let releaseOwner;
    const gate = new Promise((resolve) => (releaseOwner = resolve));
    let intercepted = false;

    const spy = jest.spyOn(Order, "findById").mockImplementation((...args) => {
      if (intercepted) return realFindById(...args);
      intercepted = true;
      return (async () => {
        const doc = await realFindById(...args);
        signalRead();
        await gate;
        return doc;
      })();
    });

    try {
      const ownerPromise = ownerSetStatus(ownerStatus).then((r) => r);
      await Promise.race([
        ownerHasRead,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      const interferingRes = await interfering();
      releaseOwner();
      const ownerRes = await ownerPromise;
      return { ownerRes, interferingRes };
    } finally {
      releaseOwner();
      spy.mockRestore();
    }
  };

  const currentStock = async () => (await Product.findById(product._id)).stock;

  test("R1. A duplicate store-owner cancel (stale read) restores stock exactly once", async () => {
    // Double-click / two staff devices: request A reads the order as 'placed',
    // request B cancels it completely, then A resumes with its stale view.
    const { ownerRes, interferingRes } = await ownerRequestWithStaleRead(
      "cancelled",
      () => ownerSetStatus("cancelled"),
    );

    expect(interferingRes.status).toBe(200);
    // The late duplicate is a conflict, not a second successful cancellation.
    expect(ownerRes.status).toBe(409);
    expect(ownerRes.body.currentStatus).toBe("cancelled");

    expect(await currentStock()).toBe(INITIAL_STOCK + ORDER_QTY);
    expect((await Order.findById(order._id)).status).toBe("cancelled");
  });

  test("R2. Store-owner cancel with a stale read vs a completed customer cancel restores stock exactly once", async () => {
    const { ownerRes, interferingRes } = await ownerRequestWithStaleRead(
      "cancelled",
      customerCancel,
    );

    // The customer's cancel won the placed -> cancelled transition...
    expect(interferingRes.status).toBe(200);
    // ...so the owner's late cancel must be rejected, not applied a second time.
    expect(ownerRes.status).toBeGreaterThanOrEqual(400);
    expect(ownerRes.status).toBeLessThan(500);

    expect(await currentStock()).toBe(INITIAL_STOCK + ORDER_QTY);
    expect((await Order.findById(order._id)).status).toBe("cancelled");
  });

  test("R3. A cancelled order is never resurrected by a stale owner status update", async () => {
    const { ownerRes, interferingRes } = await ownerRequestWithStaleRead(
      "processing",
      customerCancel,
    );

    expect(interferingRes.status).toBe(200);
    expect(ownerRes.status).toBeGreaterThanOrEqual(400);
    expect(ownerRes.status).toBeLessThan(500);

    // Final state must be consistent: cancelled <=> stock released (once).
    const finalOrder = await Order.findById(order._id);
    expect(finalOrder.status).toBe("cancelled");
    expect(await currentStock()).toBe(INITIAL_STOCK + ORDER_QTY);
  });

  test("R4. Truly parallel duplicate requests never produce a server error", async () => {
    const responses = await Promise.all([
      ownerSetStatus("cancelled"),
      ownerSetStatus("cancelled"),
      customerCancel(),
    ]);
    responses.forEach((r) => expect(r.status).toBeLessThan(500));
  });

  test("R5. Sequential transition rules and stock handling still behave as before", async () => {
    const r1 = await ownerSetStatus("processing");
    expect(r1.status).toBe(200);
    expect(await currentStock()).toBe(INITIAL_STOCK);

    const r2 = await ownerSetStatus("cancelled");
    expect(r2.status).toBe(200);
    expect(r2.body.order.status).toBe("cancelled");
    expect(await currentStock()).toBe(INITIAL_STOCK + ORDER_QTY);

    // Terminal state: no further transitions, no further stock changes.
    const r3 = await ownerSetStatus("processing");
    expect(r3.status).toBe(400);
    const r4 = await ownerSetStatus("cancelled");
    expect(r4.status).toBe(400);
    expect(await currentStock()).toBe(INITIAL_STOCK + ORDER_QTY);
  });
});
