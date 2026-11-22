
"use strict";

const Coupon = require("../models/coupon");
const Order = require("../models/order");

/**
 * Smart Coupon Service
 * Secure coupon validation, discount calculation,
 * and usage tracking.
 */
class CouponService {
  /**
   * Validate coupon and calculate discount.
   *
   * @param {string} rawCode
   * @param {{
   *   userId?: string,
   *   storeId?: string,
   *   subtotal: number,
   *   deliveryFee?: number
   * }} context
   */
  static async validateAndCalculateDiscount(rawCode, context) {
    // Validate coupon code
    if (typeof rawCode !== "string" || !rawCode.trim()) {
      throw new Error("Coupon code is required");
    }

    // Validate context
    if (!context || typeof context !== "object") {
      throw new Error("Valid coupon context is required");
    }

    const {
      userId,
      storeId,
      subtotal,
      deliveryFee = 0
    } = context;

    // Validate monetary values
    if (
      typeof subtotal !== "number" ||
      !Number.isFinite(subtotal) ||
      subtotal <= 0
    ) {
      throw new Error("Cart subtotal must be a valid positive number");
    }

    if (
      typeof deliveryFee !== "number" ||
      !Number.isFinite(deliveryFee) ||
      deliveryFee < 0
    ) {
      throw new Error("Delivery fee must be a valid non-negative number");
    }

    const code = rawCode.trim().toUpperCase();

    // Find active coupon
    const coupon = await Coupon.findOne({
      code,
      isActive: true
    });

    if (!coupon) {
      throw new Error(`Coupon "${code}" is invalid or inactive`);
    }

    const now = new Date();

    // Validate coupon start date
    if (coupon.validFrom) {
      const validFrom = new Date(coupon.validFrom);

      if (
        Number.isNaN(validFrom.getTime()) ||
        now < validFrom
      ) {
        throw new Error(`Coupon "${code}" is not yet active`);
      }
    }

    // Validate coupon expiration date
    if (coupon.validUntil) {
      const validUntil = new Date(coupon.validUntil);

      if (
        Number.isNaN(validUntil.getTime()) ||
        now > validUntil
      ) {
        throw new Error(`Coupon "${code}" has expired`);
      }
    }

    // Validate global usage limit
    const usedCount = coupon.usedCount ?? 0;
    const usageLimit = coupon.usageLimit;

    if (
      !Number.isFinite(usedCount) ||
      usedCount < 0
    ) {
      throw new Error("Invalid coupon usage configuration");
    }

    if (
      usageLimit !== null &&
      usageLimit !== undefined &&
      usageLimit !== 0 &&
      (
        !Number.isFinite(usageLimit) ||
        usageLimit < 0 ||
        usedCount >= usageLimit
      )
    ) {
      throw new Error(
        `Coupon "${code}" has reached its maximum global usage limit`
      );
    }

    // Validate store restriction
    if (coupon.store) {
      if (!storeId) {
        throw new Error(
          `Coupon "${code}" requires a valid store`
        );
      }

      const couponStoreId = coupon.store._id || coupon.store;

      if (couponStoreId.toString() !== storeId.toString()) {
        throw new Error(
          `Coupon "${code}" is not valid for this store`
        );
      }
    }

    // Validate minimum order amount
    if (
      coupon.minOrderAmount != null &&
      (
        !Number.isFinite(coupon.minOrderAmount) ||
        coupon.minOrderAmount < 0
      )
    ) {
      throw new Error("Invalid coupon minimum order amount");
    }

    if (
      coupon.minOrderAmount > 0 &&
      subtotal < coupon.minOrderAmount
    ) {
      const remaining = Math.ceil(
        coupon.minOrderAmount - subtotal
      );

      throw new Error(
        `Minimum order amount of ₹${coupon.minOrderAmount} required. Add ₹${remaining} more to qualify.`
      );
    }

    // Validate per-user usage limit
    if (
      userId &&
      coupon.perUserLimit != null &&
      coupon.perUserLimit > 0
    ) {
      if (
        !Number.isFinite(coupon.perUserLimit) ||
        coupon.perUserLimit < 0
      ) {
        throw new Error("Invalid per-user coupon limit");
      }

      const priorUsages = await Order.countDocuments({
        customer: userId,
        couponCode: code,
        status: {
          $nin: ["payment_failed", "cancelled"]
        }
      });

      if (priorUsages >= coupon.perUserLimit) {
        throw new Error(
          `You have already utilized coupon "${code}" the maximum allowed times (${coupon.perUserLimit})`
        );
      }
    }

    // Validate discount configuration
    if (
      !Number.isFinite(coupon.discountValue) ||
      coupon.discountValue <= 0
    ) {
      throw new Error("Invalid coupon discount value");
    }

    // Calculate discount
    let discount = 0;

    switch (coupon.discountType) {
      case "percentage":
        if (coupon.discountValue > 100) {
          throw new Error(
            "Percentage discount cannot exceed 100%"
          );
        }

        discount = Math.round(
          (subtotal * coupon.discountValue) / 100
        );

        if (coupon.maxDiscount != null) {
          if (
            !Number.isFinite(coupon.maxDiscount) ||
            coupon.maxDiscount < 0
          ) {
            throw new Error("Invalid maximum discount amount");
          }

          discount = Math.min(
            discount,
            coupon.maxDiscount
          );
        }

        break;

      case "fixed":
        discount = Math.min(
          coupon.discountValue,
          subtotal
        );
        break;

      case "free_delivery":
        discount = deliveryFee;
        break;

      default:
        throw new Error(
          `Unsupported coupon discount type: ${coupon.discountType}`
        );
    }

    // Prevent negative or excessive discounts
    discount = Math.max(
      0,
      Math.min(discount, subtotal + deliveryFee)
    );

    // Calculate final payable amount
    const finalTotal = Math.max(
      0,
      subtotal + deliveryFee - discount
    );

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
   *
   * @param {string} code
   */
  static async recordCouponUsage(code) {
    if (typeof code !== "string" || !code.trim()) {
      throw new Error("Valid coupon code is required");
    }

    const normalizedCode = code.trim().toUpperCase();

    // Atomically increment usage without exceeding global limit.
    const result = await Coupon.updateOne(
      {
        code: normalizedCode,
        $or: [
          { usageLimit: { $exists: false } },
          { usageLimit: null },
          { usageLimit: 0 },
          {
            $expr: {
              $lt: [
                { $ifNull: ["$usedCount", 0] },
                "$usageLimit"
              ]
            }
          }
        ]
      },
      {
        $inc: {
          usedCount: 1
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new Error(
        `Coupon "${normalizedCode}" does not exist or has reached its usage limit`
      );
    }

    return {
      success: true,
      code: normalizedCode,
      message: "Coupon usage recorded successfully"
    };
  }
}

module.exports = CouponService;
