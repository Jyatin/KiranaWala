"use strict";

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Review = require("../models/review");
const Order = require("../models/order");
const Product = require("../models/product");
const { authenticateToken } = require("../middleware/authMiddleware");

// POST /api/reviews - Submit a verified-purchase review
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { productId, storeId, rating, title, comment } = req.body;

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5",
      });
    }

    if (!comment || typeof comment !== "string" || comment.trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: "Comment must be at least 4 characters long",
      });
    }

    // Check if user has ordered from this store or purchased this product
    let isVerifiedPurchase = false;
    if (storeId) {
      const priorOrder = await Order.findOne({
        customer: userId,
        store: storeId,
        status: { $in: ["delivered", "completed", "confirmed"] },
      });
      if (priorOrder) isVerifiedPurchase = true;
    }

    if (productId && !isVerifiedPurchase) {
      const priorOrderWithProduct = await Order.findOne({
        customer: userId,
        "items.product": productId,
        status: { $in: ["delivered", "completed", "confirmed"] },
      });
      if (priorOrderWithProduct) isVerifiedPurchase = true;
    }

    const review = new Review({
      customer: userId,
      product: productId || undefined,
      store: storeId || undefined,
      rating: numRating,
      title: title ? title.trim() : "",
      comment: comment.trim(),
      isVerifiedPurchase,
      status: "approved",
    });

    await review.save();

    // Update Product average rating if productId is present
    if (productId) {
      const allProductReviews = await Review.find({ product: productId, status: "approved" });
      const avgRating = allProductReviews.reduce((sum, r) => sum + r.rating, 0) / allProductReviews.length;
      await Product.findByIdAndUpdate(productId, {
        rating: Math.round(avgRating * 10) / 10,
      });
    }

    await review.populate("customer", "username");

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reviews/product/:productId
router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const reviews = await Review.find({ product: productId, status: "approved" })
      .sort({ createdAt: -1 })
      .populate("customer", "username");

    const averageRating = reviews.length > 0
      ? Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) * 10) / 10
      : 4.8;

    res.json({
      success: true,
      count: reviews.length,
      averageRating,
      reviews,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reviews/store/:storeId
router.get("/store/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ success: false, message: "Invalid store ID" });
    }

    const reviews = await Review.find({ store: storeId, status: "approved" })
      .sort({ createdAt: -1 })
      .populate("customer", "username");

    const averageRating = reviews.length > 0
      ? Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) * 10) / 10
      : 4.8;

    res.json({
      success: true,
      count: reviews.length,
      averageRating,
      reviews,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
