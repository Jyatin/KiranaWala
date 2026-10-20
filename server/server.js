const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

// Load environment variables from server/.env
require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const customerRoutes = require("./routes/customerRoutes");
const storeRoutes = require("./routes/storeRoutes");
const aiRoutes = require("./routes/aiRoutes");
const couponRoutes = require("./routes/couponRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const InventoryService = require("./services/inventoryService");
const ReconciliationService = require("./services/reconciliationService");
const { correlationMiddleware } = require("./middleware/observabilityMiddleware");
const { validateEnvironment } = require("./config/env");
const { authRateLimiter } = require("./middleware/rateLimitMiddleware");

// Validate startup environment configuration
validateEnvironment();

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(correlationMiddleware);

// Security Headers (native, dependency-free)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// Restrictive CORS Allowlist
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"]
  : ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(new Error("CORS policy violation: origin not allowed"));
    },
    credentials: true,
  })
);

// Raw body preservation for webhook endpoints before general body parser
app.use(
  "/api/payments/webhook",
  express.raw({ type: "*/*" }),
  (req, res, next) => {
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body;
      try {
        req.body = JSON.parse(req.body.toString("utf8"));
      } catch (err) {
        req.body = {};
      }
    }
    next();
  }
);

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Authentication rate limiting on login and registration endpoints
const authLimiter = authRateLimiter({ max: 30, windowMs: 15 * 60 * 1000 });
app.use("/api/customer/login", authLimiter);
app.use("/api/customer/register", authLimiter);
app.use("/api/store/login", authLimiter);
app.use("/api/store/register", authLimiter);
app.use("/api/store-owner/login", authLimiter);
app.use("/api/store-owner/register", authLimiter);

// Serve public files
app.use(express.static(path.join(__dirname, "../public")));

// Serve views
app.use(express.static(path.join(__dirname, "../views")));

// =====================================================
// MONGODB CONNECTION
// =====================================================

const connectMongo = async () => {
  // If already connected (e.g., from devServerWithMemoryDb.js), skip reconnection
  if (mongoose.connection.readyState === 1) {
    console.log("Mongoose already connected — skipping reconnection.");
    return;
  }

  const primaryUri = process.env.MONGO_URI;
  const isProduction = process.env.NODE_ENV === "production";
  const localUri = "mongodb://127.0.0.1:27017/kiranawala";

  if (!primaryUri) {
    if (isProduction) {
      console.error("FATAL: MONGO_URI is missing in production environment.");
      return;
    }
    console.warn(
      "MONGO_URI not specified. Using local MongoDB for development...",
    );
  } else {
    try {
      await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: isProduction ? 8000 : 3000,
      });
      console.log("Connected to MongoDB successfully");
      return;
    } catch (err) {
      console.error("Primary MongoDB connection failed:", err.message);
      if (isProduction) {
        console.error(
          "FATAL: Production database connection failed. Local fallback is disabled in production.",
        );
        return;
      }
      console.warn("Falling back to local MongoDB for development...");
    }
  }

  // Local MongoDB fallback is strictly allowed only in non-production environments
  if (!isProduction) {
    try {
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 3000 });
      console.log("Connected to local MongoDB successfully");
    } catch (err) {
      console.error("Local MongoDB connection failed:", err.message);
    }
  }
};

connectMongo();

// MongoDB connection status & single-instance background worker manager
let workersStarted = false;
mongoose.connection.on("connected", () => {
  console.log("Mongoose connection established");
  if (process.env.NODE_ENV !== "test" && !workersStarted) {
    workersStarted = true;
    InventoryService.startCleanupWorker(60000);
    ReconciliationService.startReconciliationWorker(300000);
  }
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("Mongoose reconnected");
});

// =====================================================
// API ROUTES
// =====================================================

app.use("/api/customer", customerRoutes);
app.use("/api/customer/ai", aiRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/store-owner", storeRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

// =====================================================
// PAGE ROUTES
// =====================================================

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/index.html"));
});

// Customer login
app.get("/customer/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/customer/login.html"));
});

// Customer register
app.get("/customer/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/customer/register.html"));
});

// Customer dashboard
app.get("/customer/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/customer/dashboard.html"));
});

// Customer products
app.get("/customer/products", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/customer/products.html"));
});

// Customer cart
app.get("/customer/cart", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/customer/cart.html"));
});

// Customer checkout
app.get("/customer/checkout", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/customer/checkout.html"));
});

// Customer orders history
app.get("/customer/orders", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/customer/orders.html"));
});

// Customer order details
app.get("/customer/orders/:orderId", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/customer/order.html"));
});

// Store owner login
app.get("/store-owner/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/store-owner/login.html"));
});

// Store owner register
app.get("/store-owner/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/store-owner/register.html"));
});

// Store owner dashboard
app.get("/store-owner/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/store-owner/dashboard.html"));
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "KiranaWala server is running",
  });
});

// MongoDB health check
app.get("/health/db", (req, res) => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const state = mongoose.connection.readyState;

  res.json({
    database: states[state] || "unknown",
    connected: state === 1,
  });
});

// =====================================================
// CENTRALIZED ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error("[Internal Error]", err.message, err.stack);
  if (res.headersSent) {
    return next(err);
  }
  const isProd = process.env.NODE_ENV === "production";
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: isProd && status === 500 ? "An unexpected internal server error occurred." : err.message,
  });
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
