const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "unassigned",
        "assigned",
        "accepted",
        "heading_to_store",
        "arrived_at_store",
        "picked_up",
        "out_for_delivery",
        "delivered",
        "failed",
        "cancelled",
      ],
      default: "unassigned",
      index: true,
    },
    pickupAddress: {
      storeName: String,
      address: String,
      coordinates: [Number], // [lng, lat]
    },
    dropAddress: {
      fullName: String,
      phone: String,
      address: String,
      city: String,
      pincode: String,
      coordinates: [Number],
    },
    distanceKm: {
      type: Number,
      default: 1.2,
    },
    estimatedMinutes: {
      type: Number,
      default: 18,
    },
    earningAmount: {
      type: Number,
      default: 45, // payout to runner per delivery
    },
    otp: {
      type: String,
      default: () => Math.floor(1000 + Math.random() * 9000).toString(),
    },
    pickupTime: Date,
    deliveredTime: Date,
    currentLocation: {
      type: { type: String, default: "Point" },
      coordinates: { type: [Number], default: [77.6389, 12.9121] },
    },
  },
  { timestamps: true }
);

deliverySchema.index({ currentLocation: "2dsphere" });
deliverySchema.index({ partner: 1, status: 1 });

module.exports = mongoose.model("Delivery", deliverySchema);
