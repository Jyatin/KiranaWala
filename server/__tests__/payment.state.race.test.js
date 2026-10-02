const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const Store = require("../models/store");
const User = require("../models/user");
const Product = require("../models/product");
const Cart = require("../models/cart");
const Order = require("../models/order");
const InventoryService = require("../services/inventoryService");
const customerRoutes = require("../routes/customerRoutes");
const paymentRoutes = require("../routes/paymentRoutes");

const app = express();
app.use(express.json());
app.use("/api/customer", customerRoutes);
app.use("/api/payments", paymentRoutes);

/**
 * Order payment lifecycle - concurrency and inventory integrity.
 *
 * Every transition of an order (pay, fail, cancel, expire) moves stock between
 * the buckets available / reserved / sold. Those moves must happen exactly
 * once per order, and only for the request that actually performed the
 * transition. The invariants asserted below must hold after ANY interleaving:
 *
 *   reservedStock >= 0, availableStock >= 0, stock === availableStock + reservedStock
 *
 * Interleavings are forced deterministically: a "slow" request reads the order,
 * is paused, a competing request runs to completion, then the slow request
 * resumes holding a stale view of the order.
 */
describe("Order payment lifecycle - concurrency & inventory integrity", () => {
  const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
  const INITIAL_STOCK = 50;
  const QTY = 2;

  let customer, store, product, token;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_PAYMENT_RACE";
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
      Cart.deleteMany({}),
      Order.deleteMany({}),
    ]);

    const owner = await User.create({
      username: "payRaceOwner",
      email: "pay-race-owner@test.com",
      password: "password123",
      role: "store-owner",
    });
    store = await Store.create({
      name: "Payment Race Store",
      owner: owner._id,
      description: "Concurrency test store",
      category: "Groceries",
    });
    customer = await User.create({
      username: "payRaceCustomer",
      email: "pay-race-customer@test.com",
      password: "password123",
      role: "customer",
    });
    token = jwt.sign({ userId: customer._id, id: customer._id }, JWT_SECRET);

    product = await Product.create({
      name: "Race Atta",
      price: 250,
      description: "5kg wheat flour",
      image: "/images/atta.jpg",
      store: store._id,
      category: "Grains",
      stock: INITIAL_STOCK,
      availableStock: INITIAL_STOCK,
      available: true,
    });

    await Cart.create({
      user: customer._id,
      store: store._id,
      items: [{ product: product._id, quantity: QTY }],
    });
  });

  // ---------- helpers ----------

  const auth = (req) => req.set("Authorization", `Bearer ${token}`);

  /** Places a Razorpay order (stock reserved) and creates its payment order. */
  async function createPendingOrder() {
    const orderRes = await auth(request(app).post("/api/customer/orders")).send(
      {
        deliveryAddress: {
          fullName: "Test Customer",
          phone: "9876543210",
          address: "123 Test Street",
        },
        paymentMethod: "razorpay",
      },
    );
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.order._id;
    const payRes = await auth(
      request(app).post("/api/payments/create-order"),
    ).send({ orderId });
    expect(payRes.status).toBe(200);
    return { orderId, razorpayOrderId: payRes.body.razorpayOrderId };
  }

  const verify = ({ orderId, razorpayOrderId }, paymentId = "pay_mock_1") =>
    auth(request(app).post("/api/payments/verify")).send({
      orderId,
      razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: "mock_sig_1",
    });

  const webhookCaptured = ({ razorpayOrderId }, paymentId = "pay_mock_1") =>
    request(app)
      .post("/api/payments/webhook")
      .send({
        event: "payment.captured",
        payload: {
          payment: { entity: { id: paymentId, order_id: razorpayOrderId } },
        },
      });

  const reportFailure = ({ orderId }) =>
    auth(request(app).post("/api/payments/failure")).send({
      orderId,
      reason: "Customer cancelled payment",
    });

  const cancelOrder = ({ orderId }) =>
    auth(request(app).patch(`/api/customer/orders/${orderId}/cancel`));

  /** Checkout leaves an empty cart document behind, so upsert instead of create. */
  const refillCart = () =>
    Cart.findOneAndUpdate(
      { user: customer._id },
      {
        $set: {
          store: store._id,
          items: [{ product: product._id, quantity: QTY }],
        },
      },
      { upsert: true },
    );

  const stockState = async () => {
    const p = await Product.findById(product._id);
    return {
      stock: p.stock,
      available: p.availableStock,
      reserved: p.reservedStock,
      sold: p.soldStock,
    };
  };

  const expectInventoryInvariants = async () => {
    const s = await stockState();
    expect(s.reserved).toBeGreaterThanOrEqual(0);
    expect(s.available).toBeGreaterThanOrEqual(0);
    expect(s.stock).toBe(s.available + s.reserved);
    return s;
  };

  /**
   * Pauses the FIRST call of `Model[method]` right after its query resolves
   * (the caller now holds a stale document), runs `interfering()` to
   * completion, then resumes the paused caller.
   */
  const withStaleRead = async (Model, method, slowFn, interferingFn) => {
    const realFn = Model[method].bind(Model);
    let signalRead;
    const hasRead = new Promise((resolve) => (signalRead = resolve));
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    let intercepted = false;

    const spy = jest.spyOn(Model, method).mockImplementation((...args) => {
      const query = realFn(...args);
      if (intercepted) return query;
      intercepted = true;
      const originalThen = query.then.bind(query);
      query.then = (onFulfilled, onRejected) =>
        originalThen(async (doc) => {
          signalRead();
          await gate;
          return doc;
        }).then(onFulfilled, onRejected);
      return query;
    });

    try {
      const slowPromise = slowFn().then((r) => r);
      await Promise.race([
        hasRead,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      const interferingRes = await interferingFn();
      release();
      const slowRes = await slowPromise;
      return { slowRes, interferingRes };
    } finally {
      release();
      spy.mockRestore();
    }
  };

  // ---------- tests ----------

  test("P1. Client verify racing the Razorpay webhook commits inventory exactly once", async () => {
    const pending = await createPendingOrder();

    // The client-side verify reads the order as pending; the webhook then
    // confirms the payment completely; the verify call resumes.
    const { slowRes, interferingRes } = await withStaleRead(
      Order,
      "findById",
      () => verify(pending),
      () => webhookCaptured(pending),
    );

    expect(interferingRes.status).toBe(200);
    expect(slowRes.status).toBe(200);
    expect(slowRes.body.alreadyConfirmed).toBe(true);

    const s = await expectInventoryInvariants();
    expect(s.sold).toBe(QTY);
    expect(s.reserved).toBe(0);
    expect(s.stock).toBe(INITIAL_STOCK - QTY);

    const order = await Order.findById(pending.orderId);
    expect(order.status).toBe("confirmed");
    expect(order.paymentStatus).toBe("paid");
    expect(order.timeline.filter((t) => t.status === "confirmed")).toHaveLength(
      1,
    );
  });

  test("P2. A stale customer cancel cannot cancel an order that was just paid", async () => {
    const pending = await createPendingOrder();

    const { slowRes, interferingRes } = await withStaleRead(
      Order,
      "findOne",
      () => cancelOrder(pending),
      () => verify(pending),
    );

    expect(interferingRes.status).toBe(200);
    expect(slowRes.status).toBeGreaterThanOrEqual(400);
    expect(slowRes.status).toBeLessThan(500);

    const order = await Order.findById(pending.orderId);
    expect(order.status).toBe("confirmed");
    expect(order.paymentStatus).toBe("paid");

    const s = await expectInventoryInvariants();
    expect(s.sold).toBe(QTY);
    expect(s.reserved).toBe(0);
  });

  test("P3. A duplicate cancel (stale read) releases the reservation exactly once", async () => {
    const pending = await createPendingOrder();

    const { slowRes, interferingRes } = await withStaleRead(
      Order,
      "findOne",
      () => cancelOrder(pending),
      () => cancelOrder(pending),
    );

    expect(interferingRes.status).toBe(200);
    expect(slowRes.status).toBeGreaterThanOrEqual(400);
    expect(slowRes.status).toBeLessThan(500);

    const s = await expectInventoryInvariants();
    expect(s.available).toBe(INITIAL_STOCK);
    expect(s.reserved).toBe(0);
    expect((await Order.findById(pending.orderId)).status).toBe("cancelled");
  });

  test("P4. A stale payment-failure report cannot overwrite a successful payment", async () => {
    const pending = await createPendingOrder();

    const { slowRes, interferingRes } = await withStaleRead(
      Order,
      "findById",
      () => reportFailure(pending),
      () => verify(pending),
    );

    expect(interferingRes.status).toBe(200);
    expect(slowRes.body.success).toBe(false);

    const order = await Order.findById(pending.orderId);
    expect(order.status).toBe("confirmed");
    expect(order.paymentStatus).toBe("paid");

    const s = await expectInventoryInvariants();
    expect(s.sold).toBe(QTY);
    expect(s.reserved).toBe(0);
  });

  test("P5. Payment arriving after the customer cancelled is queued for refund, never confirmed", async () => {
    const pending = await createPendingOrder();

    const cancelRes = await cancelOrder(pending);
    expect(cancelRes.status).toBe(200);

    const res = await verify(pending);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.requiresRefund).toBe(true);

    const order = await Order.findById(pending.orderId);
    expect(order.status).toBe("refund_pending");
    expect(order.paymentStatus).toBe("paid"); // money was received

    // Inventory untouched: the cancel already released it.
    const s = await expectInventoryInvariants();
    expect(s.available).toBe(INITIAL_STOCK);
    expect(s.reserved).toBe(0);
    expect(s.sold).toBe(0);
  });

  test("P6. A successful retry after a reported failure re-reserves stock and confirms", async () => {
    const pending = await createPendingOrder();

    expect((await reportFailure(pending)).status).toBe(200);
    expect((await expectInventoryInvariants()).reserved).toBe(0);

    // Razorpay lets the customer retry the same payment order.
    const res = await verify(pending, "pay_mock_retry");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const order = await Order.findById(pending.orderId);
    expect(order.status).toBe("confirmed");
    expect(order.paymentStatus).toBe("paid");

    const s = await expectInventoryInvariants();
    expect(s.sold).toBe(QTY);
    expect(s.reserved).toBe(0);
    expect(s.stock).toBe(INITIAL_STOCK - QTY);
  });

  test("P7. A late payment for released stock that is gone is queued for refund", async () => {
    const pending = await createPendingOrder();
    expect((await reportFailure(pending)).status).toBe(200);

    // Someone else buys everything that was released.
    await Product.updateOne(
      { _id: product._id },
      { $set: { stock: 0, availableStock: 0 } },
    );

    const res = await verify(pending, "pay_mock_late");
    expect(res.body.success).toBe(false);
    expect(res.body.requiresRefund).toBe(true);

    const order = await Order.findById(pending.orderId);
    expect(order.status).toBe("refund_pending");
    expect(order.paymentStatus).toBe("paid");

    const s = await expectInventoryInvariants();
    expect(s.available).toBe(0);
    expect(s.reserved).toBe(0);
  });

  test("P8. Reservation expiry cannot override an order that was paid meanwhile", async () => {
    const pending = await createPendingOrder();

    // Age the order past the 15 minute reservation window.
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(pending.orderId) },
      { $set: { createdAt: new Date(Date.now() - 30 * 60 * 1000) } },
    );

    const { slowRes, interferingRes } = await withStaleRead(
      Order,
      "find",
      () => InventoryService.cleanupExpiredReservations().then((n) => ({ n })),
      () => verify(pending),
    );

    expect(interferingRes.status).toBe(200);
    expect(slowRes.n).toBe(0); // nothing was actually expired

    const order = await Order.findById(pending.orderId);
    expect(order.status).toBe("confirmed");

    const s = await expectInventoryInvariants();
    expect(s.sold).toBe(QTY);
    expect(s.reserved).toBe(0);
  });

  test("P9. Normal flows are unchanged (pay, duplicate webhook, expiry, cancel)", async () => {
    // pay + duplicate delivery of the same confirmation
    const a = await createPendingOrder();
    expect((await verify(a)).body.success).toBe(true);
    const dupe = await webhookCaptured(a);
    expect(dupe.status).toBe(200);
    let s = await expectInventoryInvariants();
    expect(s.sold).toBe(QTY);
    expect(s.reserved).toBe(0);

    // expiry of an unpaid order releases its reservation once
    await refillCart();
    const b = await createPendingOrder();
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(b.orderId) },
      { $set: { createdAt: new Date(Date.now() - 30 * 60 * 1000) } },
    );
    expect(await InventoryService.cleanupExpiredReservations()).toBe(1);
    expect(await InventoryService.cleanupExpiredReservations()).toBe(0);
    const expired = await Order.findById(b.orderId);
    expect(expired.status).toBe("payment_failed");
    s = await expectInventoryInvariants();
    expect(s.reserved).toBe(0);
    expect(s.sold).toBe(QTY);

    // sequential cancel of a pending order
    await refillCart();
    const c = await createPendingOrder();
    expect((await cancelOrder(c)).status).toBe(200);
    expect((await cancelOrder(c)).status).toBe(400);
    s = await expectInventoryInvariants();
    expect(s.reserved).toBe(0);
    expect(s.sold).toBe(QTY);
    expect(s.available).toBe(INITIAL_STOCK - QTY);
  });
});
