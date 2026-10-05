"use strict";

const express = require("express");
const router = express.Router();
const Coupon = require("../models/coupon");
const CouponService = require("../services/couponService");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

// GET /api/coupons - List active public promotions
router.get("/", async (req, res) => {
  try {
    const { storeId } = req.query;
    const now = new Date();
    const query = {
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    };

    if (storeId) {
      query.$or = [{ store: storeId }, { store: null }];
    } else {
      query.store = null; // platform-wide
    }

    const coupons = await Coupon.find(query)
      .select("code description discountType discountValue minOrderAmount maxDiscount validUntil")
      .sort({ discountValue: -1 });

    res.json({
      success: true,
      coupons
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/coupons/validate - Server validation
router.post("/validate", async (req, res) => {
  try {
    const { code, storeId, subtotal, deliveryFee, userId } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    const result = await CouponService.validateAndCalculateDiscount(code, {
      userId,
      storeId,
      subtotal: parseFloat(subtotal) || 0,
      deliveryFee: parseFloat(deliveryFee) || 0
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

// POST /api/coupons/create - Store Owner or Admin creates coupon
router.post(
  "/create",
  authenticateToken,
  requireRole("store-owner", "admin"),
  async (req, res) => {
    try {
      const {
        code,
        description,
        discountType,
        discountValue,
        minOrderAmount,
        maxDiscount,
        validUntil,
        usageLimit,
        perUserLimit,
        storeId
      } = req.body;

      if (!code || !discountType || discountValue === undefined) {
        return res.status(400).json({
          success: false,
          message: "Code, discountType, and discountValue are required"
        });
      }

      const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Coupon code "${code}" already exists`
        });
      }

      const coupon = new Coupon({
        code: code.trim().toUpperCase(),
        description,
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount) || 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
        perUserLimit: Number(perUserLimit) || 1,
        store: storeId || undefined
      });

      await coupon.save();
      res.status(201).json({
        success: true,
        message: "Coupon created successfully",
        coupon
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
