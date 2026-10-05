"use strict";

const Coupon = require("../models/coupon");
const Order = require("../models/order");

/**
 * Smart Coupon Service
 * Server-authoritative coupon validation, discount computation, and usage tracking.
 */
class CouponService {
  /**
   * Validate coupon and calculate discount.
   * @param {string} rawCode
   * @param {{userId?: string, storeId?: string, subtotal: number, deliveryFee?: number}} context
   */
  static async validateAndCalculateDiscount(rawCode, context) {
    if (!rawCode || typeof rawCode !== "string") {
      throw new Error("Coupon code is required");
    }

    const code = rawCode.trim().toUpperCase();
    const { userId, storeId, subtotal, deliveryFee = 0 } = context;

    if (subtotal <= 0) {
      throw new Error("Cart must have a subtotal greater than zero to apply coupons");
    }

    const coupon = await Coupon.findOne({ code, isActive: true });
    if (!coupon) {
      throw new Error(`Coupon "${code}" is invalid or inactive`);
    }

    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      throw new Error(`Coupon "${code}" is not yet active`);
    }

    if (coupon.validUntil && now > coupon.validUntil) {
      throw new Error(`Coupon "${code}" has expired`);
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new Error(`Coupon "${code}" has reached its maximum global usage limit`);
    }

    // Verify store match if coupon is store-specific
    if (coupon.store && storeId && coupon.store.toString() !== storeId.toString()) {
      throw new Error(`Coupon "${code}" is not valid for this store`);
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      throw new Error(
        `Minimum order amount of ₹${coupon.minOrderAmount} required for coupon "${code}". Add ₹${Math.ceil(coupon.minOrderAmount - subtotal)} more to qualify.`
      );
    }

    // Check per-user usage limits
    if (userId && coupon.perUserLimit) {
      const priorUsages = await Order.countDocuments({
        customer: userId,
        couponCode: code,
        status: { $nin: ["payment_failed", "cancelled"] }
      });
      if (priorUsages >= coupon.perUserLimit) {
        throw new Error(`You have already utilized coupon "${code}" the maximum allowed times (${coupon.perUserLimit})`);
      }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = Math.round((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === "fixed") {
      discount = Math.min(coupon.discountValue, subtotal);
    } else if (coupon.discountType === "free_delivery") {
      discount = deliveryFee;
    }

    const finalTotal = Math.max(0, subtotal + deliveryFee - discount);

    return {
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: discount,
      subtotal,
      deliveryFee,
      finalTotal,
      savingsNote: `Saved ₹${discount} with ${coupon.code}`
    };
  }

  /**
   * Increment coupon usage count after order confirmation.
   * @param {string} code
   */
  static async recordCouponUsage(code) {
    if (!code) return;
    await Coupon.updateOne(
      { code: code.trim().toUpperCase() },
      { $inc: { usedCount: 1 } }
    ).catch(() => {});
  }
}

module.exports = CouponService;
