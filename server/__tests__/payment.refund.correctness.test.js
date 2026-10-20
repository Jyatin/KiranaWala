"use strict";

const mongoose = require("mongoose");
const User = require("../models/user");
const Store = require("../models/store");
const Product = require("../models/product");
const Order = require("../models/order");
const PaymentService = require("../services/paymentService");

describe("PaymentService.processRefund Correctness & State Restoration Tests", () => {
  let customer, store, product;

  beforeAll(async () => {
    const mongoUri =
      "mongodb://127.0.0.1:27017/kiranawala_TEST_SAFE_TO_DROP_REFUND_CORRECTNESS";
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
    await Product.deleteMany({});
    await Order.deleteMany({});

    const uid = Math.random().toString(36).substring(2, 7);

    customer = await User.create({
      username: `cust_${uid}`,
      email: `cust_${uid}@test.com`,
      password: "password123",
      role: "customer",
    });

    store = await Store.create({
      name: "Refund Test Store",
      description: "Store Description",
      category: "Groceries",
      owner: customer._id,
      location: { type: "Point", coordinates: [77.6389, 12.9121] },
    });

    product = await Product.create({
      name: "Organic Apples",
      store: store._id,
      description: "Fresh organic apples",
      image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6",
      price: 100,
      stock: 50,
      availableStock: 40,
      soldStock: 10,
      category: "Fruits",
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("1. On a definite provider error, the order's ORIGINAL status and paymentStatus are restored (packing and out_for_delivery)", async () => {
    // (a) Order in 'packing' status
    const packingOrder = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 100,
          quantity: 2,
          subtotal: 200,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 200,
      total: 200,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "packing",
      razorpayOrderId: "order_rzp_pack_1",
      razorpayPaymentId: "pay_rzp_pack_1",
    });

    // Mock non-sandbox provider throwing a definite error
    const mockProviderDefiniteError = {
      isSandbox: false,
      processRefund: jest.fn().mockRejectedValue(new Error("Card issuer declined refund: account closed")),
    };
    jest.spyOn(PaymentService, "getProvider").mockReturnValue(mockProviderDefiniteError);

    await expect(
      PaymentService.processRefund({ orderId: packingOrder._id })
    ).rejects.toThrow(/Refund failed at payment provider/);

    const reloadedPacking = await Order.findById(packingOrder._id);
    // Must restore ORIGINAL status 'packing' (NOT overwrite with 'confirmed'!)
    expect(reloadedPacking.status).toBe("packing");
    expect(reloadedPacking.paymentStatus).toBe("paid");

    // (b) Order in 'out_for_delivery' status
    const ofdOrder = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 100,
          quantity: 2,
          subtotal: 200,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 200,
      total: 200,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "out_for_delivery",
      razorpayOrderId: "order_rzp_ofd_1",
      razorpayPaymentId: "pay_rzp_ofd_1",
    });

    await expect(
      PaymentService.processRefund({ orderId: ofdOrder._id })
    ).rejects.toThrow(/Refund failed at payment provider/);

    const reloadedOfd = await Order.findById(ofdOrder._id);
    // Must restore ORIGINAL status 'out_for_delivery'
    expect(reloadedOfd.status).toBe("out_for_delivery");
    expect(reloadedOfd.paymentStatus).toBe("paid");
  });

  test("2. Successful refund on post-dispatch orders (picked_up, out_for_delivery, delivered) does NOT restore inventory", async () => {
    const mockProviderSuccess = {
      isSandbox: false,
      processRefund: jest.fn().mockResolvedValue({ id: "rfnd_success_1", status: "processed" }),
    };
    jest.spyOn(PaymentService, "getProvider").mockReturnValue(mockProviderSuccess);

    for (const postDispatchStatus of ["picked_up", "out_for_delivery", "delivered"]) {
      const order = await Order.create({
        customer: customer._id,
        store: store._id,
        items: [
          {
            product: product._id,
            productNameSnapshot: product.name,
            unitPrice: 100,
            quantity: 3,
            subtotal: 300,
          },
        ],
        deliveryAddress: {
          fullName: "Test Customer",
          phone: "+91 99999 11111",
          address: "123 Main St",
          city: "Bengaluru",
          pincode: "560038",
        },
        subtotal: 300,
        total: 300,
        paymentMethod: "razorpay",
        paymentStatus: "paid",
        status: postDispatchStatus,
        razorpayOrderId: `order_rzp_${postDispatchStatus}`,
        razorpayPaymentId: `pay_rzp_${postDispatchStatus}`,
      });

      const initialProd = await Product.findById(product._id);

      const result = await PaymentService.processRefund({ orderId: order._id });
      expect(result.success).toBe(true);

      const checkOrder = await Order.findById(order._id);
      expect(checkOrder.paymentStatus).toBe("refunded");
      expect(checkOrder.status).toBe("refunded");

      // Stock must NOT be modified for post-dispatch orders
      const updatedProd = await Product.findById(product._id);
      expect(updatedProd.availableStock).toBe(initialProd.availableStock);
      expect(updatedProd.soldStock).toBe(initialProd.soldStock);
    }
  });

  test("3. Successful refund on pre-dispatch order (placed/confirmed/packing/ready) DOES restore inventory exactly once even with 10 concurrent requests", async () => {
    const mockProviderSuccess = {
      isSandbox: false,
      processRefund: jest.fn().mockResolvedValue({ id: "rfnd_success_conc", status: "processed" }),
    };
    jest.spyOn(PaymentService, "getProvider").mockReturnValue(mockProviderSuccess);

    const initialProd = await Product.findById(product._id);
    expect(initialProd.availableStock).toBe(40);
    expect(initialProd.soldStock).toBe(10);

    const preDispatchOrder = await Order.create({
      customer: customer._id,
      store: store._id,
      items: [
        {
          product: product._id,
          productNameSnapshot: product.name,
          unitPrice: 100,
          quantity: 2,
          subtotal: 200,
        },
      ],
      deliveryAddress: {
        fullName: "Test Customer",
        phone: "+91 99999 11111",
        address: "123 Main St",
        city: "Bengaluru",
        pincode: "560038",
      },
      subtotal: 200,
      total: 200,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "packing",
      razorpayOrderId: "order_rzp_pre_conc",
      razorpayPaymentId: "pay_rzp_pre_conc",
    });

    // 10 concurrent refund requests
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        PaymentService.processRefund({ orderId: preDispatchOrder._id })
      )
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly 1 should succeed, 9 should be rejected
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(9);

    const finalOrder = await Order.findById(preDispatchOrder._id);
    expect(finalOrder.paymentStatus).toBe("refunded");
    expect(finalOrder.status).toBe("refunded");

    // Inventory should be restored EXACTLY ONCE: availableStock + 2 (40 -> 42), soldStock - 2 (10 -> 8)
    const finalProd = await Product.findById(product._id);
    expect(finalProd.availableStock).toBe(42);
    expect(finalProd.soldStock).toBe(8);
  });
});
