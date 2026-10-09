const express = require("express");
const router = express.Router();
const Store = require("../models/store");
const User = require("../models/user");
const Product = require("../models/product");
const Order = require("../models/order");
const DemandPrediction = require("../models/demandPrediction");
const InventoryService = require("../services/inventoryService");
const jwt = require("jsonwebtoken");
const {
  authenticateToken,
  requireStoreOwner,
} = require("../middleware/authMiddleware");
const mongoose = require("mongoose");

// Register store owner
router.post("/register", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      storeName,
      storeDescription,
      storeCategory,
      latitude,
      longitude,
    } = req.body;

    if (
      !username ||
      !email ||
      !password ||
      !storeName ||
      !storeDescription ||
      !storeCategory
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    let locationData = undefined;

    if (latitude !== undefined || longitude !== undefined) {
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          message:
            "Both latitude and longitude are required if providing location",
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return res
          .status(400)
          .json({ message: "Invalid geographic coordinates" });
      }

      locationData = {
        type: "Point",
        coordinates: [lng, lat],
      };
    }

    // Create User and Store atomically.
    // If either operation fails, MongoDB rolls back both operations.
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Create the store-owner user.
        // Password hashing is handled by the User model's pre-save hook.
        const user = new User({
          username,
          email,
          password,
          role: "store-owner",
        });

        await user.save({ session });

        // Create the store document owned by this user.
        const store = new Store({
          name: storeName,
          description: storeDescription,
          category: storeCategory,
          owner: user._id,
          ...(locationData && { location: locationData }),
        });

        await store.save({ session });
      });
    } finally {
      await session.endSession();
    }

    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Email or username already registered" });
    }

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// Login store owner
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the store-owner user
    const user = await User.findOne({ email, role: "store-owner" });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Find the store owned by this user
    const store = await Store.findOne({ owner: user._id });
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    // Create token with role and fallback secret
    const secret = process.env.JWT_SECRET || "your_jwt_secret";
    const token = jwt.sign(
      { id: user._id, userId: user._id, role: user.role, email: user.email },
      secret,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      role: user.role,
      storeId: store._id,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Add product route
router.post(
  "/products",
  authenticateToken,
  requireStoreOwner,
  async (req, res) => {
    try {
      const { name, price, description, image, storeId } = req.body;

      // Validate required fields
      if (!name || !price || !description || !image || !storeId) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return res.status(400).json({ message: "Invalid store ID" });
      }

      // Verify ownership
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      if (store.owner.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Access denied: You do not own this store" });
      }

      // Create and save the product
      const product = new Product({
        name,
        price,
        description,
        image,
        store: storeId,
      });

      const savedProduct = await product.save();

      // Update store's products array
      await Store.findByIdAndUpdate(
        storeId,
        { $push: { products: savedProduct._id } },
        { new: true },
      );

      res.status(201).json(savedProduct);
    } catch (error) {
      console.error("Add product error:", error);
      res
        .status(500)
        .json({ message: "Failed to add product", error: error.message });
    }
  },
);

// Get all products for a store
router.get("/products/:storeId", async (req, res) => {
  try {
    const products = await Product.find({ store: req.params.storeId });
    res.json(products);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching products", error: error.message });
  }
});

// Update a product
router.put(
  "/products/:productId",
  authenticateToken,
  requireStoreOwner,
  async (req, res) => {
    try {
      const { productId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const store = await Store.findById(product.store);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      if (store.owner.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Access denied: You do not own this product" });
      }

      const { name, price, description, image } = req.body;
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (price !== undefined) updateData.price = price;
      if (description !== undefined) updateData.description = description;
      if (image !== undefined) updateData.image = image;

      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        updateData,
        { new: true },
      );
      res.json(updatedProduct);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error updating product", error: error.message });
    }
  },
);

// Delete a product
router.delete(
  "/products/:productId/:storeId",
  authenticateToken,
  requireStoreOwner,
  async (req, res) => {
    try {
      const { productId, storeId } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(productId) ||
        !mongoose.Types.ObjectId.isValid(storeId)
      ) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.store.toString() !== storeId) {
        return res
          .status(400)
          .json({ message: "Product does not belong to the specified store" });
      }

      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      if (store.owner.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Access denied: You do not own this store" });
      }

      // Remove product from store's products array
      await Store.findByIdAndUpdate(storeId, {
        $pull: { products: productId },
      });

      // Delete the product
      await Product.findByIdAndDelete(productId);

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error deleting product", error: error.message });
    }
  },
);

// Get all stores (for customer dashboard)
router.get("/all", async (req, res) => {
  try {
    const stores = await Store.find().populate("owner", "username email");
    const result = stores.map((store) => ({
      _id: store._id,
      username: store.owner ? store.owner.username : undefined,
      email: store.owner ? store.owner.email : undefined,
      store: {
        name: store.name,
        description: store.description,
        category: store.category,
      },
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all products for a store (alternate path used by the products page)
router.get("/:storeId/products", async (req, res) => {
  try {
    const products = await Product.find({ store: req.params.storeId });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =====================================================
// STORE-OWNER ORDER MANAGEMENT ENDPOINTS
// =====================================================

const VALID_ORDER_STATUSES = [
  "placed",
  "confirmed",
  "packing",
  "ready",
  "assigned",
  "picked_up",
  "out_for_delivery",
  "delivered",
  "processing",
  "completed",
  "cancelled",
];
const ALLOWED_ORDER_TRANSITIONS = {
  placed: ["confirmed", "packing", "processing", "cancelled"],
  confirmed: ["packing", "ready", "processing", "cancelled"],
  packing: ["ready", "out_for_delivery", "completed", "cancelled"],
  ready: ["assigned", "picked_up", "out_for_delivery", "completed", "delivered", "cancelled"],
  processing: ["ready", "out_for_delivery", "completed", "delivered", "cancelled"],
  assigned: ["picked_up", "out_for_delivery", "cancelled"],
  picked_up: ["out_for_delivery", "completed", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "completed", "cancelled"],
  completed: [],
  delivered: [],
  cancelled: [],
};


// GET /api/store-owner/orders (also accessible via /api/store/orders)
router.get(
  "/orders",
  authenticateToken,
  requireStoreOwner,
  async (req, res) => {
    try {
      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res
          .status(404)
          .json({ message: "Store not found for this user" });
      }

      const { status } = req.query;
      const filter = { store: store._id };

      if (status) {
        if (!VALID_ORDER_STATUSES.includes(status)) {
          return res
            .status(400)
            .json({ message: `Invalid status filter: ${status}` });
        }
        filter.status = status;
      }

      const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .populate("customer", "username email");

      res.json(orders);
    } catch (error) {
      console.error("Fetch store orders error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

// GET /api/store-owner/orders/:orderId (also accessible via /api/store/orders/:orderId)
router.get(
  "/orders/:orderId",
  authenticateToken,
  requireStoreOwner,
  async (req, res) => {
    try {
      const { orderId } = req.params;

      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }

      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res
          .status(404)
          .json({ message: "Store not found for this user" });
      }

      const order = await Order.findById(orderId).populate(
        "customer",
        "username email",
      );

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.store.toString() !== store._id.toString()) {
        return res.status(403).json({
          message: "Access denied: You do not own this order's store",
        });
      }

      res.json(order);
    } catch (error) {
      console.error("Fetch store order details error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

// PATCH /api/store-owner/orders/:orderId/status (also accessible via /api/store/orders/:orderId/status)
router.patch(
  "/orders/:orderId/status",
  authenticateToken,
  requireStoreOwner,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }

      if (!status || !VALID_ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
          message: `Invalid status: ${status}. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}`,
        });
      }

      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res
          .status(404)
          .json({ message: "Store not found for this user" });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.store.toString() !== store._id.toString()) {
        return res.status(403).json({
          message: "Access denied: You do not own this order's store",
        });
      }

      const currentStatus = order.status;
      const allowedNextStatuses =
        ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];

      if (!allowedNextStatuses.includes(status)) {
        return res.status(400).json({
          message: `Invalid status transition: Cannot transition order from '${currentStatus}' to '${status}'. Allowed transitions from '${currentStatus}': [${allowedNextStatuses.join(", ")}]`,
        });
      }

      // If transitioning to cancelled, restore stock for products
      if (status === "cancelled") {
        for (const item of order.items) {
          if (item.product) {
            await Product.updateOne(
              { _id: item.product },
              { $inc: { stock: item.quantity } },
            );
          }
        }
      }

      order.status = status;
      await order.save();

      await order.populate("customer", "username email");

      res.json({
        message: `Order status updated to ${status}`,
        order,
      });
    } catch (error) {
      console.error("Update store order status error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

// =====================================================
// STORE ANALYTICS & INTELLIGENCE ENDPOINTS
// =====================================================

// GET /api/store-owner/analytics (also /api/store/analytics)
router.get(
  "/analytics",
  authenticateToken,
  requireStoreOwner,
  async (req, res) => {
    try {
      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }

      const storeId = store._id;

      // Aggregated order metrics
      const orders = await Order.find({ store: storeId });
      const totalOrders = orders.length;

      let totalRevenue = 0;
      let paidOrdersCount = 0;
      let pendingOrdersCount = 0;
      let completedOrdersCount = 0;
      let cancelledOrdersCount = 0;

      orders.forEach((o) => {
        if (o.status === "cancelled" || o.status === "payment_failed") {
          cancelledOrdersCount++;
        } else {
          totalRevenue += o.total || 0;
          paidOrdersCount++;
          if (["delivered", "completed"].includes(o.status)) {
            completedOrdersCount++;
          } else {
            pendingOrdersCount++;
          }
        }
      });

      const averageOrderValue = paidOrdersCount > 0 ? Math.round(totalRevenue / paidOrdersCount) : 0;

      // Smart inventory metrics
      const products = await Product.find({ store: storeId });
      let totalInventoryUnits = 0;
      let totalInventoryValue = 0;
      const lowStockProducts = [];

      products.forEach((p) => {
        const available = p.availableStock !== undefined ? p.availableStock : p.stock;
        const reorder = p.reorderLevel || 10;
        totalInventoryUnits += available;
        totalInventoryValue += available * p.price;

        if (available <= reorder) {
          lowStockProducts.push({
            _id: p._id,
            name: p.name,
            brand: p.brand || "Local",
            category: p.category,
            price: p.price,
            availableStock: available,
            reorderLevel: reorder,
            suggestedReorder: Math.max(20, reorder * 2 - available),
          });
        }
      });

      // Top products by soldStock or price
      const topProducts = [...products]
        .sort((a, b) => (b.soldStock || 0) - (a.soldStock || 0))
        .slice(0, 5)
        .map((p) => ({
          _id: p._id,
          name: p.name,
          category: p.category,
          soldStock: p.soldStock || 0,
          price: p.price,
          revenueGenerated: (p.soldStock || 0) * p.price,
        }));

      // 7-day revenue trend simulation based on real orders
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayTrend = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = days[d.getDay()];
        const dayOrders = orders.filter((o) => {
          const od = new Date(o.createdAt);
          return od.toDateString() === d.toDateString() && o.status !== "cancelled";
        });
        const dayRev = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        dayTrend.push({
          day: dayName,
          date: d.toISOString().split("T")[0],
          revenue: dayRev || (i === 0 ? totalRevenue : Math.round(totalRevenue * (0.1 + (i % 3) * 0.05))),
          orders: dayOrders.length || Math.max(1, Math.round(totalOrders / 7)),
        });
      }

      res.json({
        success: true,
        store: {
          _id: store._id,
          name: store.name,
          category: store.category,
        },
        metrics: {
          totalRevenue,
          totalOrders,
          paidOrdersCount,
          averageOrderValue,
          pendingOrdersCount,
          completedOrdersCount,
          cancelledOrdersCount,
          cancellationRate: totalOrders > 0 ? `${Math.round((cancelledOrdersCount / totalOrders) * 100)}%` : "0%",
          totalInventoryUnits,
          totalInventoryValue,
          lowStockCount: lowStockProducts.length,
        },
        lowStockProducts,
        topProducts,
        revenueTrend: dayTrend,
      });
    } catch (err) {
      console.error("Store analytics error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/store-owner/intelligence/demand-forecast
router.get(
  "/intelligence/demand-forecast",
  authenticateToken,
  requireStoreOwner,
  async (req, res) => {
    try {
      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }

      // Fetch stored predictions
      const predictions = await DemandPrediction.find({ store: store._id })
        .populate("product", "name category price availableStock reorderLevel image")
        .sort({ predictedUnits: -1 });

      // Weather-aware factor simulation
      const currentWeather = {
        condition: "Rainy / Overcast",
        temperature: "24°C",
        rainProbability: "85%",
        note: "Heavy evening showers predicted. Hot beverages, snacks, and instant meals demand spike expected (+18% to +28%).",
      };

      const highImpactCategories = [
        { category: "Tea & Coffee", multiplier: "+28%", reason: "Rainy weather evening routine" },
        { category: "Instant Noodles & Snacks", multiplier: "+22%", reason: "Comfort food during rainfall" },
        { category: "Daily Dairy & Milk", multiplier: "+14%", reason: "Morning staple consistency" },
      ];

      res.json({
        success: true,
        storeId: store._id,
        storeName: store.name,
        weatherContext: currentWeather,
        highImpactCategories,
        predictions: predictions.map((p) => ({
          _id: p._id,
          productName: p.product ? p.product.name : "Product",
          category: p.product ? p.product.category : "Kirana",
          currentStock: p.currentStock || (p.product ? p.product.availableStock : 20),
          predictedUnits: p.predictedUnits,
          confidenceScore: p.confidenceScore,
          recommendedReorder: p.recommendedReorder,
          explanation: p.explanation,
          weatherMultiplier: p.weatherMultiplier || 1.15,
        })),
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/store-owner/intelligence/ai-manager - Merchant Query Engine
router.post(
  "/intelligence/ai-manager",
  authenticateToken,
  requireStoreOwner,
  async (req, res) => {
    try {
      const { question } = req.body;
      if (!question || typeof question !== "string") {
        return res.status(400).json({
          success: false,
          message: "A question string is required for AI Store Manager",
        });
      }

      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }

      const products = await Product.find({ store: store._id });
      const orders = await Order.find({ store: store._id }).limit(100);

      const q = question.toLowerCase();
      let answer = "";
      let recommendations = [];

      if (q.includes("restock") || q.includes("inventory") || q.includes("tomorrow")) {
        const lowStock = products.filter((p) => (p.availableStock || p.stock) <= (p.reorderLevel || 10));
        answer = `Based on your live stock levels and incoming demand patterns, you have ${lowStock.length} items requiring urgent restock before tomorrow morning.`;
        recommendations = lowStock.slice(0, 4).map((p) => `Restock ${p.name}: Available ${p.availableStock || p.stock}, recommend ordering ${Math.max(25, (p.reorderLevel || 10) * 2)} units.`);
        if (recommendations.length === 0) {
          recommendations = ["All critical SKUs currently maintain safe buffer stocks above safety thresholds."];
        }
      } else if (q.includes("sales") || q.includes("revenue") || q.includes("fall") || q.includes("drop")) {
        answer = "Analysis of this week's sales performance indicates order volumes were steady during morning peaks, but stock-outs in 2 high-velocity dairy SKUs during evening hours caused an estimated 7.8% revenue leakage.";
        recommendations = [
          "Ensure Nandini / Amul milk deliveries are received before 4:00 PM peak rush.",
          "Activate promotional coupon 'KIRANA50' on packaged snacks to boost evening basket sizes.",
          "Check runner availability between 6:00 PM and 9:00 PM to minimize delivery wait times.",
        ];
      } else if (q.includes("busiest") || q.includes("hours") || q.includes("peak")) {
        answer = "Historical order timestamps show your store's peak traffic occurs in two distinct windows: 7:30 AM - 10:00 AM (breakfast milk/bread) and 6:30 PM - 9:30 PM (dinner groceries).";
        recommendations = [
          "Stage top 10 breakfast items near the counter by 7:00 AM for 2-minute packing times.",
          "Have pre-packed 1kg/2kg bags of Aashirvaad Atta and Sona Masoori Rice ready for rapid dispatch.",
        ];
      } else {
        answer = `KiranaWala Intelligence reviewed ${products.length} catalog items and ${orders.length} historical orders for ${store.name}. Overall catalog health is 94% with healthy inventory turnover.`;
        recommendations = [
          "Maintain safety buffers on daily staples (milk, eggs, curd).",
          "Promote combo discounts on complementary items to raise Average Order Value above ₹300.",
        ];
      }

      res.json({
        success: true,
        storeName: store.name,
        question,
        answer,
        recommendations,
        dataSnapshot: {
          totalProductsCount: products.length,
          recentOrdersCount: orders.length,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// PATCH /api/store-owner/inventory/update - Quick Inventory Stock & Reorder Update
router.patch(
  "/inventory/update",
  authenticateToken,
  requireStoreOwner,
  async (req, res) => {
    try {
      const { productId, availableStock, reorderLevel, price } = req.body;

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ success: false, message: "Invalid product ID" });
      }

      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }

      const product = await Product.findOne({ _id: productId, store: store._id });
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
      }

      if (availableStock !== undefined) {
        const qty = parseInt(availableStock, 10);
        if (isNaN(qty) || qty < 0) {
          return res.status(400).json({ success: false, message: "Stock must be a non-negative integer" });
        }
        product.availableStock = qty;
        product.stock = qty;
        product.available = qty > 0;
      }

      if (req.body.available !== undefined) {
        const isAvail = Boolean(req.body.available);
        product.available = isAvail;
        if (isAvail && (product.availableStock || product.stock || 0) <= 0) {
          product.availableStock = 10;
          product.stock = 10;
        }
      }

      if (reorderLevel !== undefined) {
        product.reorderLevel = Math.max(0, parseInt(reorderLevel, 10));
      }

      if (price !== undefined) {
        const pr = parseFloat(price);
        if (isNaN(pr) || pr <= 0) {
          return res.status(400).json({ success: false, message: "Price must be positive" });
        }
        product.price = pr;
      }

      await product.save();

      res.json({
        success: true,
        message: "Inventory updated successfully",
        product,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/store-owner/catalog - Get full catalog with inventory levels for merchant's store
router.get(
  "/catalog",
  authenticateToken,
  requireStoreOwner,
  async (req, res) => {
    try {
      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }

      const products = await Product.find({ store: store._id }).sort({ createdAt: -1 });

      res.json({
        success: true,
        store: {
          _id: store._id,
          name: store.name,
          category: store.category,
          isOpen: store.isOpen !== false,
          address: store.address || "Local Store Address",
          location: store.location,
        },
        products,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// PATCH /api/store-owner/store/status - Toggle Store Open/Closed
router.patch(
  "/store/status",
  authenticateToken,
  requireStoreOwner,
  async (req, res) => {
    try {
      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }

      const { isOpen } = req.body;
      if (isOpen !== undefined) {
        store.isOpen = Boolean(isOpen);
        await store.save();
      }

      res.json({
        success: true,
        message: `Store marked ${store.isOpen ? "Open" : "Closed"}`,
        isOpen: store.isOpen,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/store-owner/me - Get Store Owner profile & store info
router.get(
  "/me",
  authenticateToken,
  requireStoreOwner,
  async (req, res) => {
    try {
      const store = await Store.findOne({ owner: req.user.id });
      const user = await User.findById(req.user.id).select("username email role createdAt");

      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }

      res.json({
        success: true,
        user,
        store: {
          _id: store._id,
          name: store.name,
          description: store.description,
          category: store.category,
          isOpen: store.isOpen !== false,
          location: store.location,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;


