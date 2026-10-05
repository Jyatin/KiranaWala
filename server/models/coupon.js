const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed", "free_delivery"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null, // null means platform-wide
    },
    category: {
      type: String,
      default: null, // null means all categories
    },
    usageLimit: {
      type: Number,
      default: 1000,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

couponSchema.methods.isValidForOrder = function (orderSubtotal, userId, storeId = null) {
  const now = new Date();
  if (!this.isActive) return { valid: false, reason: "Coupon is inactive" };
  if (now < this.validFrom) return { valid: false, reason: "Coupon has not started yet" };
  if (now > this.validUntil) return { valid: false, reason: "Coupon has expired" };
  if (this.usedCount >= this.usageLimit) return { valid: false, reason: "Coupon usage limit reached" };
  if (orderSubtotal < this.minOrderValue) {
    return { valid: false, reason: `Minimum order value of ₹${this.minOrderValue} required` };
  }
  if (this.store && storeId && this.store.toString() !== storeId.toString()) {
    return { valid: false, reason: "Coupon is not valid for this store" };
  }
  return { valid: true };
};

couponSchema.methods.calculateDiscount = function (orderSubtotal, deliveryFee = 0) {
  if (this.discountType === "free_delivery") {
    return deliveryFee;
  }
  if (this.discountType === "fixed") {
    return Math.min(this.discountValue, orderSubtotal);
  }
  if (this.discountType === "percentage") {
    let calculated = (orderSubtotal * this.discountValue) / 100;
    if (this.maxDiscountAmount && this.maxDiscountAmount > 0) {
      calculated = Math.min(calculated, this.maxDiscountAmount);
    }
    return Math.round(calculated);
  }
  return 0;
};

module.exports = mongoose.model("Coupon", couponSchema);
