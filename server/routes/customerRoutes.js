const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Store = require("../models/store");
const Product = require("../models/product");
const Cart = require("../models/cart");
const Order = require("../models/order");
const { authenticateToken, requireCustomer } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const InventoryService = require("../services/inventoryService");
const CouponService = require("../services/couponService");

// Customer Registration
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: "customer",
    });

    await user.save();
    res.status(201).json({ message: "Customer registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Customer Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: "customer" });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const secret = process.env.JWT_SECRET || "your_jwt_secret";
    const token = jwt.sign(
      { userId: user._id, id: user._id, role: user.role, email: user.email },
      secret,
      { expiresIn: "24h" }
    );
    res.json({
      token,
      role: user.role,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customer/me - Customer session check & profile
router.get("/me", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const user = await User.findById(userId).select("username email role phone address city createdAt");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get nearby stores
router.get("/stores/nearby", async (req, res) => {
  try {
    const { latitude, longitude, radiusKm } = req.query;

    if (latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
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

    const radius = radiusKm !== undefined ? parseFloat(radiusKm) : 8;
    if (isNaN(radius) || radius <= 0) {
      return res.status(400).json({ message: "Invalid radius" });
    }

    const maxDistanceMeters = radius * 1000;

    const stores = await Store.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat],
          },
          distanceField: "distance",
          maxDistance: maxDistanceMeters,
          spherical: true,
        },
      },
    ]);

    // Populate owner details excluding password
    await Store.populate(stores, { path: "owner", select: "-password" });

    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all stores (with optional search and category filters)
router.get("/stores", async (req, res) => {
  try {
    const { q, category } = req.query;
    const filter = {};

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { name: regex },
        { description: regex },
        { category: regex },
      ];
    }

    if (category && category !== "all" && category !== "All") {
      filter.category = new RegExp(category.trim(), "i");
    }

    const stores = await Store.find(filter).populate("owner", "username");

    // Augment with product count
    const enriched = await Promise.all(
      stores.map(async (store) => {
        const productCount = await Product.countDocuments({
          store: store._id,
          available: true,
        });
        const storeObj = store.toObject();
        storeObj.productCount = productCount;
        return storeObj;
      })
    );

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single store by ID
router.get("/stores/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ message: "Invalid store ID" });
    }

    const store = await Store.findById(storeId).populate("owner", "username email");
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    const productCount = await Product.countDocuments({
      store: storeId,
      available: true,
    });

    const storeObj = store.toObject();
    storeObj.productCount = productCount;

    res.json(storeObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get products for a specific store (Customer Product Discovery)
router.get("/stores/:storeId/products", async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ message: "Invalid store ID" });
    }

    const store = await Store.findById(storeId).select(
      "name description category owner location",
    );

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    const products = await Product.find({ store: storeId });

    res.json({
      store: {
        _id: store._id,
        name: store.name,
        category: store.category,
        description: store.description,
      },
      products,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Common Kirana grocery synonym & typo dictionary for intelligent query expansion
const TYPO_MAP = {
  tamato: "tomato",
  tamatar: "tomato",
  patato: "potato",
  aalu: "potato",
  alu: "potato",
  panner: "paneer",
  panir: "paneer",
  dahi: "curd",
  chawal: "rice",
  pyaz: "onion",
  onoin: "onion",
  chese: "cheese",
  biskut: "biscuit",
  biscit: "biscuit",
  chikpea: "chana",
  dal: "toor dal",
  milk: "milk",
  atta: "flour",
};

// GET /api/customer/products/search - Typo-tolerant intelligent catalog search
router.get("/products/search", async (req, res) => {
  try {
    const {
      q = "",
      category,
      brand,
      minPrice,
      maxPrice,
      storeId,
      inStockOnly,
      sortBy = "relevance",
    } = req.query;

    const trimmedQuery = q.toString().trim().toLowerCase();
    let effectiveQuery = trimmedQuery;

    // Apply typo mapping if direct single-word match exists
    if (TYPO_MAP[trimmedQuery]) {
      effectiveQuery = TYPO_MAP[trimmedQuery];
    } else {
      for (const [typo, corrected] of Object.entries(TYPO_MAP)) {
        if (trimmedQuery.includes(typo)) {
          effectiveQuery = trimmedQuery.replace(typo, corrected);
          break;
        }
      }
    }

    const filter = {};

    if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
      filter.store = storeId;
    }

    if (category && category !== "All") {
      filter.category = new RegExp(category.trim(), "i");
    }

    if (brand) {
      filter.brand = new RegExp(brand.trim(), "i");
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (inStockOnly === "true") {
      filter.available = true;
      filter.availableStock = { $gt: 0 };
    }

    if (effectiveQuery) {
      const searchRegex = new RegExp(effectiveQuery, "i");
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { brand: searchRegex },
        { tags: searchRegex },
      ];
    }

    let sort = {};
    if (sortBy === "price_asc") sort = { price: 1 };
    else if (sortBy === "price_desc") sort = { price: -1 };
    else if (sortBy === "rating") sort = { rating: -1 };
    else sort = { availableStock: -1, price: 1 };

    const products = await Product.find(filter)
      .populate("store", "name category description location rating")
      .sort(sort)
      .limit(60);

    res.json({
      success: true,
      originalQuery: trimmedQuery,
      correctedQuery: effectiveQuery !== trimmedQuery ? effectiveQuery : null,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/customer/products/compare - Multi-store price and availability comparison
router.get("/products/compare", async (req, res) => {
  try {
    const { name, category } = req.query;

    if (!name && !category) {
      return res.status(400).json({
        success: false,
        message: "Product name or category is required for multi-store comparison",
      });
    }

    const queryFilter = {};
    if (name) {
      const searchTerms = name.toString().trim().split(/\s+/).filter(Boolean);
      queryFilter.$or = searchTerms.map((term) => ({
        name: new RegExp(term, "i"),
      }));
    }
    if (category) {
      queryFilter.category = new RegExp(category.toString().trim(), "i");
    }

    const matchedProducts = await Product.find(queryFilter)
      .populate("store", "name category location rating")
      .sort({ price: 1 })
      .limit(30);

    // Group comparison by product name pattern
    const comparisonTable = matchedProducts.map((p) => ({
      productId: p._id,
      name: p.name,
      brand: p.brand || "Local Kirana",
      category: p.category,
      price: p.price,
      availableStock: p.availableStock,
      isAvailable: p.available && p.availableStock > 0,
      store: {
        _id: p.store ? p.store._id : null,
        name: p.store ? p.store.name : "Local Partner",
        rating: p.store ? p.store.rating || 4.7 : 4.7,
        category: p.store ? p.store.category : "Kirana",
      },
    }));

    const minPrice = matchedProducts.length > 0 ? Math.min(...matchedProducts.map((p) => p.price)) : 0;
    const maxPrice = matchedProducts.length > 0 ? Math.max(...matchedProducts.map((p) => p.price)) : 0;

    res.json({
      success: true,
      query: name || category,
      count: comparisonTable.length,
      priceRange: { min: minPrice, max: maxPrice },
      comparisons: comparisonTable,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// CART ENDPOINTS
// =====================================================

// GET /api/customer/cart
router.get("/cart", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const cart = await Cart.findOne({ user: userId })
      .populate("items.product")
      .populate("store", "name category description");

    if (!cart) {
      return res.json({ items: [], store: null, subtotal: 0, total: 0 });
    }

    let validItems = [];
    let subtotal = 0;
    let modified = false;

    for (const item of cart.items) {
      if (!item.product) {
        modified = true;
        continue;
      }
      const itemSubtotal = (item.product.price || 0) * item.quantity;
      subtotal += itemSubtotal;
      validItems.push({
        _id: item._id,
        product: {
          _id: item.product._id,
          name: item.product.name,
          price: item.product.price,
          description: item.product.description,
          image: item.product.image,
          category: item.product.category,
          stock: item.product.stock,
          available: item.product.available,
          store: item.product.store,
        },
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
    }

    if (modified) {
      cart.items = cart.items.filter((i) => i.product);
      if (cart.items.length === 0) {
        cart.store = null;
      }
      await cart.save();
    }

    res.json({
      _id: cart._id,
      store: cart.store,
      items: validItems,
      subtotal,
      deliveryFee: 0,
      total: subtotal,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/customer/cart/items
router.post("/cart/items", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { productId, quantity } = req.body;

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0 || parsedQty !== Number(quantity)) {
      return res
        .status(400)
        .json({ message: "Quantity must be a positive integer" });
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.available === false || product.stock <= 0) {
      return res
        .status(400)
        .json({ message: "Product is currently out of stock." });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [], store: product.store });
    }

    // Store consistency check (ONE ACTIVE STORE PER CART)
    if (
      cart.store &&
      cart.items.length > 0 &&
      cart.store.toString() !== product.store.toString()
    ) {
      return res.status(400).json({
        message:
          "Your cart contains items from another store. Clear your cart to shop from this store.",
        code: "CROSS_STORE_CONFLICT",
      });
    }

    const existingIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );
    const existingQty =
      existingIndex > -1 ? cart.items[existingIndex].quantity : 0;
    const newQty = existingQty + parsedQty;

    if (newQty > product.stock) {
      return res.status(400).json({
        message: `Only ${product.stock} units are available.`,
        availableStock: product.stock,
      });
    }

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity = newQty;
    } else {
      cart.items.push({ product: productId, quantity: parsedQty });
    }

    cart.store = product.store;
    await cart.save();

    await cart.populate("items.product");
    await cart.populate("store", "name category description");

    let subtotal = 0;
    const formattedItems = cart.items.map((i) => {
      const itemSub = (i.product ? i.product.price : 0) * i.quantity;
      subtotal += itemSub;
      return {
        _id: i._id,
        product: i.product,
        quantity: i.quantity,
        subtotal: itemSub,
      };
    });

    res.status(200).json({
      _id: cart._id,
      store: cart.store,
      items: formattedItems,
      subtotal,
      total: subtotal,
      message: "Item added to cart",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/customer/cart/items/:productId
router.patch("/cart/items/:productId", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { productId } = req.params;
    const { quantity } = req.body;

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0 || parsedQty !== Number(quantity)) {
      return res
        .status(400)
        .json({ message: "Quantity must be a positive integer" });
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (i) => i.product.toString() === productId,
    );
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not in cart" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product no longer exists" });
    }

    if (parsedQty > product.stock) {
      return res.status(400).json({
        message: `Only ${product.stock} units are available.`,
        availableStock: product.stock,
      });
    }

    cart.items[itemIndex].quantity = parsedQty;
    await cart.save();

    await cart.populate("items.product");
    await cart.populate("store", "name category description");

    let subtotal = 0;
    const formattedItems = cart.items.map((i) => {
      const itemSub = (i.product ? i.product.price : 0) * i.quantity;
      subtotal += itemSub;
      return {
        _id: i._id,
        product: i.product,
        quantity: i.quantity,
        subtotal: itemSub,
      };
    });

    res.json({
      _id: cart._id,
      store: cart.store,
      items: formattedItems,
      subtotal,
      total: subtotal,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/customer/cart/items/:productId
router.delete("/cart/items/:productId", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { productId } = req.params;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter((i) => i.product.toString() !== productId);
    if (cart.items.length === 0) {
      cart.store = null;
    }
    await cart.save();

    res.json({ message: "Item removed from cart", cart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/customer/cart
router.delete("/cart", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    let cart = await Cart.findOne({ user: userId });
    if (cart) {
      cart.items = [];
      cart.store = null;
      await cart.save();
    }
    res.json({ message: "Cart cleared successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/customer/cart/basket - Batch Add Complete Intent Basket
router.post("/cart/basket", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { storeId, items, clearExisting } = req.body;

    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ message: "Invalid or missing storeId" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "items must be a non-empty array" });
    }

    const targetStore = await Store.findById(storeId);
    if (!targetStore) {
      return res.status(404).json({ message: "Target store not found" });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [], store: storeId });
    }

    // Cross-store conflict handling
    if (
      cart.store &&
      cart.items.length > 0 &&
      cart.store.toString() !== storeId.toString()
    ) {
      if (!clearExisting) {
        return res.status(400).json({
          message:
            "Your cart contains items from another store. Clear your cart to add this basket.",
          code: "CROSS_STORE_CONFLICT",
          existingStoreId: cart.store,
          targetStoreId: storeId,
        });
      } else {
        cart.items = [];
      }
    }

    // Verify all products in database
    for (const item of items) {
      const productId = item.productId || item._id;
      const quantity = Number(item.quantity);

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return res
          .status(400)
          .json({ message: "Invalid product ID in basket" });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: "Basket item quantity must be a positive integer",
          productId,
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: "A product in this basket no longer exists" });
      }

      if (product.store.toString() !== storeId.toString()) {
        return res.status(400).json({
          message: `Product '${product.name}' does not belong to target store`,
        });
      }

      if (product.available === false || product.stock <= 0) {
        return res.status(400).json({
          message: `Product '${product.name}' is currently out of stock.`,
          outOfStockProduct: product.name,
        });
      }
      const existingIndex = cart.items.findIndex(
        (i) => i.product.toString() === productId.toString(),
      );

      const existingQty =
        existingIndex > -1 ? cart.items[existingIndex].quantity : 0;
      const targetQty = clearExisting ? quantity : existingQty + quantity;

      if (targetQty > product.stock) {
        return res.status(400).json({
          message: `Only ${product.stock} units of '${product.name}' are available.`,
          availableStock: product.stock,
        });
      }

      if (existingIndex > -1) {
        cart.items[existingIndex].quantity = targetQty;
      } else {
        cart.items.push({ product: productId, quantity: targetQty });
      }
    }

    cart.store = storeId;
    await cart.save();

    await cart.populate("items.product");
    await cart.populate("store", "name category description");

    let subtotal = 0;
    const formattedItems = cart.items.map((i) => {
      const itemSub = (i.product ? i.product.price : 0) * i.quantity;
      subtotal += itemSub;
      return {
        _id: i._id,
        product: i.product,
        quantity: i.quantity,
        subtotal: itemSub,
      };
    });

    res.status(200).json({
      _id: cart._id,
      store: cart.store,
      items: formattedItems,
      subtotal,
      total: subtotal,
      message: "Complete basket added to cart successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// ORDER / CHECKOUT ENDPOINTS
// =====================================================

// GET /api/customer/cart/smart-optimization - Cart intelligence: free delivery progress & savings tips
router.get("/cart/smart-optimization", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.json({
        success: true,
        hasItems: false,
        subtotal: 0,
        freeDeliveryThreshold: 499,
        awayFromFreeDelivery: 499,
        unlockedFreeDelivery: false,
        tips: ["Add essentials to unlock free local delivery above ₹499."],
      });
    }

    let subtotal = 0;
    const itemCategories = new Set();
    cart.items.forEach((item) => {
      if (item.product) {
        subtotal += item.product.price * item.quantity;
        if (item.product.category) itemCategories.add(item.product.category);
      }
    });

    const freeDeliveryThreshold = 499;
    const unlockedFreeDelivery = subtotal >= freeDeliveryThreshold;
    const awayFromFreeDelivery = unlockedFreeDelivery ? 0 : freeDeliveryThreshold - subtotal;

    const tips = [];
    if (!unlockedFreeDelivery) {
      tips.push({
        type: "threshold",
        message: `You are ₹${Math.ceil(awayFromFreeDelivery)} away from FREE delivery!`,
      });
    } else {
      tips.push({
        type: "unlocked",
        message: "🎉 You have qualified for FREE delivery on this order!",
      });
    }

    // Complementary suggestions from the same store
    let complementaryProducts = [];
    if (cart.store) {
      complementaryProducts = await Product.find({
        store: cart.store,
        _id: { $nin: cart.items.map((i) => i.product ? i.product._id : null).filter(Boolean) },
        available: true,
        availableStock: { $gt: 0 },
      })
        .limit(4)
        .select("name price category image brand availableStock");
    }

    res.json({
      success: true,
      hasItems: true,
      subtotal,
      freeDeliveryThreshold,
      awayFromFreeDelivery,
      unlockedFreeDelivery,
      tips,
      recommendedAddons: complementaryProducts,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/customer/orders - Production Checkout with Atomic Reservation & Server-side Coupons
router.post("/orders", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const {
      deliveryAddress,
      couponCode,
      paymentMethod = "razorpay",
      customerNotes,
    } = req.body;

    if (
      !deliveryAddress ||
      !deliveryAddress.fullName ||
      !deliveryAddress.phone ||
      !deliveryAddress.address
    ) {
      return res.status(400).json({
        success: false,
        message: "Full name, phone number, and delivery address are required",
      });
    }

    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || !cart.items || cart.items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot place order with an empty cart" });
    }

    let subtotal = 0;
    const reservationItems = [];

    // Recalculate subtotal server-side strictly from active database prices
    for (const item of cart.items) {
      if (!item.product) {
        return res.status(400).json({
          success: false,
          message: "One or more items in your cart no longer exist",
        });
      }

      const product = await Product.findById(item.product._id);
      if (!product || !product.available) {
        return res.status(400).json({
          success: false,
          message: `Product "${item.product.name}" is currently unavailable`,
        });
      }

      if (product.availableStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.availableStock}, requested: ${item.quantity}`,
        });
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      reservationItems.push({
        productId: product._id,
        quantity: item.quantity,
        productNameSnapshot: product.name,
        unitPrice: product.price,
        subtotal: itemSubtotal,
      });
    }

    // Dynamic Delivery Fee: Free above ₹499, otherwise ₹30
    let deliveryFee = subtotal >= 499 ? 0 : 30;
    let discount = 0;
    let appliedCoupon = null;

    // Server-Authoritative Coupon Validation
    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      try {
        const couponResult = await CouponService.validateAndCalculateDiscount(
          couponCode.trim(),
          {
            userId,
            storeId: cart.store,
            subtotal,
            deliveryFee,
          }
        );
        discount = couponResult.discountAmount;
        appliedCoupon = couponResult.code;
        if (couponResult.discountType === "free_delivery") {
          deliveryFee = 0;
        }
      } catch (couponErr) {
        return res.status(400).json({
          success: false,
          message: `Coupon error: ${couponErr.message}`,
        });
      }
    }

    const total = Math.max(0, subtotal + deliveryFee - discount);

    // Atomic Inventory Reservation via InventoryService
    // Decrements availableStock and increments reservedStock atomically
    try {
      await InventoryService.reserveStock(reservationItems, 15);
    } catch (stockErr) {
      return res.status(400).json({
        success: false,
        message: stockErr.message,
      });
    }

    // Generate 4-digit Delivery OTP
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const initialStatus = paymentMethod === "cod" ? "placed" : "pending_payment";

    const orderItems = reservationItems.map((r) => ({
      product: r.productId,
      productNameSnapshot: r.productNameSnapshot,
      unitPrice: r.unitPrice,
      quantity: r.quantity,
      subtotal: r.subtotal,
    }));

    const order = new Order({
      customer: userId,
      store: cart.store,
      items: orderItems,
      deliveryAddress: {
        fullName: deliveryAddress.fullName.trim(),
        phone: deliveryAddress.phone.trim(),
        address: deliveryAddress.address.trim(),
        city: (deliveryAddress.city || "").trim(),
        pincode: (deliveryAddress.pincode || "").trim(),
      },
      subtotal,
      deliveryFee,
      discount,
      couponCode: appliedCoupon,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
      status: initialStatus,
      deliveryOtp,
      customerNotes: customerNotes ? customerNotes.trim() : undefined,
      timeline: [
        {
          status: initialStatus,
          note: paymentMethod === "cod" ? "Order placed with Cash on Delivery" : "Order initiated, awaiting Razorpay payment",
          timestamp: new Date(),
        },
      ],
    });

    await order.save();

    // If COD, commit the reservation immediately
    if (paymentMethod === "cod") {
      await InventoryService.commitReservation(reservationItems);
      if (appliedCoupon) {
        await CouponService.recordCouponUsage(appliedCoupon);
      }
    }

    // Clear customer cart
    cart.items = [];
    cart.store = null;
    await cart.save();

    await order.populate("store", "name category description location");

    res.status(201).json({
      success: true,
      message: paymentMethod === "cod" ? "Order placed successfully" : "Order initiated. Please complete Razorpay payment.",
      order: {
        _id: order._id,
        store: order.store,
        items: order.items,
        deliveryAddress: order.deliveryAddress,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        discount: order.discount,
        couponCode: order.couponCode,
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// GET /api/customer/orders
router.get("/orders", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const orders = await Order.find({ customer: userId })
      .sort({ createdAt: -1 })
      .populate("store", "name category");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customer/orders/:orderId
router.get("/orders/:orderId", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { orderId } = req.params;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findOne({
      _id: orderId,
      customer: userId,
    }).populate("store", "name category description");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/customer/orders/:orderId/cancel
router.patch("/orders/:orderId/cancel", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { orderId } = req.params;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    // Allow cancellation of placed or pending_payment orders
    const existingOrder = await Order.findOne({
      _id: orderId,
      customer: userId,
    });

    if (!existingOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!["placed", "pending_payment"].includes(existingOrder.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in its current status: ${existingOrder.status}`,
      });
    }

    const previousStatus = existingOrder.status;
    existingOrder.status = "cancelled";
    existingOrder.timeline = existingOrder.timeline || [];
    existingOrder.timeline.push({
      status: "cancelled",
      note: "Cancelled by customer",
      timestamp: new Date(),
    });
    await existingOrder.save();

    // Smart Inventory Restoration
    if (previousStatus === "pending_payment") {
      // Order had reserved stock, release back to available
      await InventoryService.releaseReservation(existingOrder.items);
    } else {
      // Order had committed stock, restore stock and availableStock
      for (const item of existingOrder.items) {
        if (item.product) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity, availableStock: item.quantity, soldStock: -item.quantity } },
          ).catch(() => {});
        }
      }
    }

    await existingOrder.populate("store", "name category description location");

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order: existingOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


module.exports = router;
