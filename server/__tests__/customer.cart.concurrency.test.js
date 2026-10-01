const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const Store = require("../models/store");
const User = require("../models/user");
const Product = require("../models/product");
const Cart = require("../models/cart");
const customerRoutes = require("../routes/customerRoutes");

const app = express();
app.use(express.json());
app.use("/api/customer", customerRoutes);

/**
 * Cart mutations are read-modify-write operations. When two requests overlap
 * (double-click, two tabs, a retry after a slow network) the second one acts on
 * a stale snapshot of the cart. These tests force that interleaving
 * deterministically: request A reads the cart, request B completes, then A
 * resumes and tries to persist its stale result.
 */
describe("Cart API - concurrency safety", () => {
  const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
  const STOCK = 5;

  let owner, customer, store, product, otherProduct;
  let token;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_CART_RACE";
    if (!mongoUri.includes("TEST")) {
      throw new Error("Safety check: Database name must contain TEST");
    }
    await mongoose.connect(mongoUri);
    await mongoose.connection.db.dropDatabase();
    await Cart.init(); // make sure the unique index on `user` exists
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
    ]);

    owner = await User.create({
      username: "cartRaceOwner",
      email: "cart-race-owner@test.com",
      password: "password123",
      role: "store-owner",
    });
    customer = await User.create({
      username: "cartRaceCustomer",
      email: "cart-race-customer@test.com",
      password: "password123",
      role: "customer",
    });
    store = await Store.create({
      name: "Cart Race Kirana",
      description: "Concurrency test store",
      category: "Grocery",
      owner: owner._id,
    });
    product = await Product.create({
      name: "Basmati Rice 1kg",
      price: 120,
      description: "Premium basmati",
      image: "/images/rice.jpg",
      store: store._id,
      stock: STOCK,
      available: true,
    });
    otherProduct = await Product.create({
      name: "Toor Dal 500g",
      price: 80,
      description: "Pure toor dal",
      image: "/images/dal.jpg",
      store: store._id,
      stock: 50,
      available: true,
    });

    token = jwt.sign({ userId: customer._id, id: customer._id }, JWT_SECRET);
  });

  const addItem = (productId, quantity) =>
    request(app)
      .post("/api/customer/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: String(productId), quantity });

  const patchItem = (productId, quantity) =>
    request(app)
      .patch(`/api/customer/cart/items/${productId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity });

  const addBasket = (items) =>
    request(app)
      .post("/api/customer/cart/basket")
      .set("Authorization", `Bearer ${token}`)
      .send({ storeId: String(store._id), items });

  const loadCart = () => Cart.findOne({ user: customer._id });

  /**
   * Runs `slowRequest()` but pauses it right after it has read the cart
   * (so it holds a stale snapshot), runs `interfering()` to completion, then
   * lets the slow request resume.
   */
  const withStaleCartRead = async (slowRequest, interfering) => {
    const realFindOne = Cart.findOne.bind(Cart);
    let signalRead;
    const slowHasRead = new Promise((resolve) => (signalRead = resolve));
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    let intercepted = false;

    const spy = jest.spyOn(Cart, "findOne").mockImplementation((...args) => {
      if (intercepted) return realFindOne(...args);
      intercepted = true;
      return (async () => {
        const doc = await realFindOne(...args);
        signalRead();
        await gate;
        return doc;
      })();
    });

    try {
      const slowPromise = slowRequest().then((r) => r);
      await Promise.race([
        slowHasRead,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      const interferingRes = await interfering();
      release();
      const slowRes = await slowPromise;
      return { slowRes, interferingRes };
    } finally {
      release();
      spy.mockRestore();
    }
  };

  test("C1. Concurrent adds of the same product never create duplicate cart lines", async () => {
    // Seed an empty cart so both requests read the same (empty) snapshot.
    await Cart.create({ user: customer._id, items: [], store: null });

    const { slowRes, interferingRes } = await withStaleCartRead(
      () => addItem(product._id, 2),
      () => addItem(product._id, 2),
    );

    expect(interferingRes.status).toBe(200);
    expect(slowRes.status).toBe(200);

    const cart = await loadCart();
    const lines = cart.items.filter(
      (i) => String(i.product) === String(product._id),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(4); // 2 + 2, merged into one line
  });

  test("C2. Concurrent adds cannot exceed available stock", async () => {
    await Cart.create({ user: customer._id, items: [], store: null });

    // 3 + 3 = 6 > stock (5): exactly one of them may succeed.
    const { slowRes, interferingRes } = await withStaleCartRead(
      () => addItem(product._id, 3),
      () => addItem(product._id, 3),
    );

    const statuses = [slowRes.status, interferingRes.status].sort();
    expect(statuses).toEqual([200, 400]);

    const cart = await loadCart();
    const total = cart.items
      .filter((i) => String(i.product) === String(product._id))
      .reduce((sum, i) => sum + i.quantity, 0);
    expect(total).toBeLessThanOrEqual(STOCK);
    expect(total).toBe(3);
  });

  test("C3. Concurrent first-ever cart creation does not fail with a 500", async () => {
    // No cart exists yet: both requests try to create it.
    const { slowRes, interferingRes } = await withStaleCartRead(
      () => addItem(product._id, 1),
      () => addItem(otherProduct._id, 1),
    );

    expect(interferingRes.status).toBe(200);
    expect(slowRes.status).toBe(200);

    // Both items must end up in the single cart.
    const carts = await Cart.find({ user: customer._id });
    expect(carts).toHaveLength(1);
    expect(carts[0].items).toHaveLength(2);
  });

  test("C4. A stale quantity update does not overwrite a newer cart state", async () => {
    await Cart.create({
      user: customer._id,
      items: [{ product: product._id, quantity: 1 }],
      store: store._id,
    });

    // Slow request sets qty to 2 using a stale view; meanwhile another request
    // adds a different product to the same cart.
    const { slowRes, interferingRes } = await withStaleCartRead(
      () => patchItem(product._id, 2),
      () => addItem(otherProduct._id, 1),
    );

    expect(interferingRes.status).toBe(200);
    expect(slowRes.status).toBe(200);

    const cart = await loadCart();
    const rice = cart.items.find(
      (i) => String(i.product) === String(product._id),
    );
    const dal = cart.items.find(
      (i) => String(i.product) === String(otherProduct._id),
    );
    expect(rice.quantity).toBe(2);
    expect(dal).toBeDefined(); // the concurrent add must not be lost
    expect(dal.quantity).toBe(1);
  });

  test("C5. Concurrent basket + add of the same product merges into one line within stock", async () => {
    await Cart.create({ user: customer._id, items: [], store: null });

    const { slowRes, interferingRes } = await withStaleCartRead(
      () => addBasket([{ productId: String(product._id), quantity: 3 }]),
      () => addItem(product._id, 3),
    );

    const statuses = [slowRes.status, interferingRes.status].sort();
    expect(statuses).toEqual([200, 400]);

    const cart = await loadCart();
    const lines = cart.items.filter(
      (i) => String(i.product) === String(product._id),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBeLessThanOrEqual(STOCK);
  });

  test("C6. Sequential cart behaviour is unchanged", async () => {
    const r1 = await addItem(product._id, 2);
    expect(r1.status).toBe(200);
    const r2 = await addItem(product._id, 2);
    expect(r2.status).toBe(200);
    expect(r2.body.items).toHaveLength(1);
    expect(r2.body.items[0].quantity).toBe(4);

    const r3 = await addItem(product._id, 2); // 6 > 5
    expect(r3.status).toBe(400);
    expect(r3.body.availableStock).toBe(STOCK);

    const r4 = await patchItem(product._id, 5);
    expect(r4.status).toBe(200);
    const r5 = await patchItem(product._id, 6);
    expect(r5.status).toBe(400);
  });
});
