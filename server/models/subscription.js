const mongoose = require("mongoose");

const subscriptionItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const subscriptionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    title: {
      type: String,
      required: true, // e.g. "Daily Fresh Milk & Bread"
    },
    items: [subscriptionItemSchema],
    frequency: {
      type: String,
      enum: ["daily", "alternate_days", "weekly", "monthly"],
      default: "daily",
    },
    preferredTimeSlot: {
      type: String,
      default: "06:00 - 08:00 AM",
    },
    deliveryAddress: {
      fullName: String,
      phone: String,
      address: String,
      city: String,
      pincode: String,
    },
    status: {
      type: String,
      enum: ["active", "paused", "cancelled"],
      default: "active",
      index: true,
    },
    nextDeliveryDate: {
      type: Date,
      required: true,
    },
    lastGeneratedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ["upi_autopay", "cod", "cards"],
      default: "cod",
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ status: 1, nextDeliveryDate: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
