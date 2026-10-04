"use strict";

const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Store = require("../models/store");
const Product = require("../models/product");
const Cart = require("../models/cart");
const Order = require("../models/order");

const customerRoutes = require("../routes/customerRoutes");
const paymentRoutes = require("../routes/paymentRoutes");
const { correlationMiddleware } = require("../middleware/observabilityMiddleware");

const JWT_SECRET = "kiranawala-dev-secret-key-12345";

async function runLoadTestBenchmark() {
  console.log("==================================================");
  console.log("KIRANAWALA PRODUCTION LOAD TESTING & PERFORMANCE BENCHMARK");
  console.log("==================================================");

  const mongoUri = "mongodb://127.0.0.1:27017/kiranawala_LOADTEST_BENCHMARK";
  await mongoose.connect(mongoUri);
  await mongoose.connection.db.dropDatabase();

  const app = express();
  app.use(correlationMiddleware);
  app.use(express.json());
  app.use("/api/customer", customerRoutes);
  app.use("/api/payments", paymentRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.ENABLE_MOCK_PAYMENTS = "true";

  // Setup seed data for load test
  const customer = await User.create({
    username: "loadTester",
    email: "loadTester@test.com",
    password: "password123",
    role: "customer",
  });
  const token = jwt.sign(
    { id: customer._id.toString(), role: "customer" },
    JWT_SECRET
  );

  const store = await Store.create({
    name: "Load Benchmark Store",
    description: "Store for performance testing",
    category: "Groceries",
    owner: customer._id,
    location: { type: "Point", coordinates: [77.6389, 12.9121] },
  });

  const sampleProducts = [];
  for (let i = 1; i <= 50; i++) {
    sampleProducts.push({
      name: `Benchmark Product ${i} Organic Dal & Rice`,
      store: store._id,
      description: `High quality organic product ${i} with premium freshness`,
      category: i % 2 === 0 ? "Staples" : "Dairy",
      price: 100 + i * 5,
      stock: 5000,
      availableStock: 5000,
      reservedStock: 0,
      soldStock: 0,
      available: true,
      image: "https://images.unsplash.com/photo-dal",
    });
  }
  const insertedProducts = await Product.insertMany(sampleProducts);
  const targetProductId = insertedProducts[0]._id.toString();

  // Benchmark Runner Helper
  async function benchmarkEndpoint(name, requestFn, totalRequests = 200, concurrency = 20) {
    const latencies = [];
    let successCount = 0;
    let errorCount = 0;

    const startTime = Date.now();

    let currentIndex = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (currentIndex < totalRequests) {
        const reqIdx = currentIndex++;
        const reqStart = process.hrtime();
        try {
          const ok = await requestFn(reqIdx);
          const reqElapsed = process.hrtime(reqStart);
          const ms = reqElapsed[0] * 1000 + reqElapsed[1] / 1e6;
          latencies.push(ms);
          if (ok) successCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
      }
    });

    await Promise.all(workers);
    const totalElapsedMs = Date.now() - startTime;
    const rps = (totalRequests / (totalElapsedMs / 1000)).toFixed(1);

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)]?.toFixed(2) || "0";
    const p95 = latencies[Math.floor(latencies.length * 0.95)]?.toFixed(2) || "0";
    const p99 = latencies[Math.floor(latencies.length * 0.99)]?.toFixed(2) || "0";
    const errorRate = ((errorCount / totalRequests) * 100).toFixed(2);

    console.log(`\nEndpoint: ${name}`);
    console.log(`  Requests:     ${totalRequests} (Concurrency: ${concurrency})`);
    console.log(`  Duration:     ${(totalElapsedMs / 1000).toFixed(2)}s`);
    console.log(`  Throughput:   ${rps} RPS`);
    console.log(`  Latency p50:  ${p50} ms`);
    console.log(`  Latency p95:  ${p95} ms`);
    console.log(`  Latency p99:  ${p99} ms`);
    console.log(`  Error Rate:   ${errorRate}% (${successCount} OK, ${errorCount} ERR)`);

    return { name, rps, p50, p95, p99, errorRate };
  }

  // 1. Benchmark Store Products Catalog Browsing
  await benchmarkEndpoint("GET /api/customer/stores/:storeId/products", async () => {
    const res = await fetch(`${baseUrl}/api/customer/stores/${store._id}/products`);
    return res.status === 200;
  }, 300, 30);

  // 2. Benchmark Intelligent Search & Typo-Tolerant Filter
  await benchmarkEndpoint("GET /api/customer/products/search?q=Dal", async () => {
    const res = await fetch(`${baseUrl}/api/customer/products/search?q=Dal`);
    return res.status === 200;
  }, 300, 30);

  // 3. Benchmark Multi-Store Comparison
  await benchmarkEndpoint("GET /api/customer/products/compare?name=Dal", async () => {
    const res = await fetch(`${baseUrl}/api/customer/products/compare?name=Dal`);
    return res.status === 200;
  }, 300, 30);

  // 4. Benchmark Payment Signature Verification
  await benchmarkEndpoint("POST /api/payments/verify", async () => {
    const res = await fetch(`${baseUrl}/api/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId: new mongoose.Types.ObjectId().toString(),
        razorpayOrderId: "order_mock_bench_1",
        razorpayPaymentId: "pay_mock_bench_1",
        razorpaySignature: "mock_verified_signature",
      }),
    });
    return res.status === 400 || res.status === 404 || res.status === 200;
  }, 300, 30);

  server.close();
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();

  console.log("\n==================================================");
  console.log("BENCHMARK COMPLETE — All measurements recorded.");
  console.log("==================================================");
}

if (require.main === module) {
  runLoadTestBenchmark().catch(console.error);
}

module.exports = { runLoadTestBenchmark };
