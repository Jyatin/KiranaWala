"use strict";

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Subscription = require("../models/subscription");
const Product = require("../models/product");
const { authenticateToken } = require("../middleware/authMiddleware");

// GET /api/subscriptions - List customer's recurring subscriptions
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const subscriptions = await Subscription.find({ customer: userId })
      .populate("store", "name category location")
      .populate("items.product", "name price image category")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: subscriptions.length,
      subscriptions,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/subscriptions - Create new subscription (daily milk, weekly staples)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { storeId, items, frequency = "daily", deliverySlot = "6:30 AM - 7:30 AM", deliveryAddress } = req.body;

    if (!storeId || !Array.isArray(items) || items.length === 0 || !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: "storeId, items array, and deliveryAddress are required",
      });
    }

    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const pid = item.productId || item.product;
      const qty = parseInt(item.quantity, 10) || 1;
      const product = await Product.findById(pid);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${pid}` });
      }
      subtotal += product.price * qty;
      verifiedItems.push({
        product: product._id,
        quantity: qty,
        unitPrice: product.price,
      });
    }

    const nextDelivery = new Date();
    nextDelivery.setDate(nextDelivery.getDate() + 1);

    const subscription = new Subscription({
      customer: userId,
      store: storeId,
      frequency,
      items: verifiedItems,
      deliverySlot,
      deliveryAddress,
      nextDeliveryDate: nextDelivery,
      subtotalPerDelivery: subtotal,
      status: "active",
    });

    await subscription.save();
    await subscription.populate("store", "name category");
    await subscription.populate("items.product", "name price image");

    res.status(201).json({
      success: true,
      message: "Recurring subscription activated successfully",
      subscription,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/subscriptions/:id/status - Pause, resume, or cancel subscription
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id || req.user.userId;

    if (!["active", "paused", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active', 'paused', or 'cancelled'",
      });
    }

    const subscription = await Subscription.findOneAndUpdate(
      { _id: id, customer: userId },
      { $set: { status } },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    res.json({
      success: true,
      message: `Subscription ${status} successfully`,
      subscription,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
