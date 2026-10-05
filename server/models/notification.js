const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["customer", "store-owner", "delivery-partner", "admin"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "order_created",
        "payment_successful",
        "payment_failed",
        "order_packed",
        "delivery_assigned",
        "out_for_delivery",
        "delivered",
        "low_inventory",
        "demand_spike",
        "coupon_available",
        "system_alert",
      ],
      default: "system_alert",
    },
    data: {
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
      storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      link: String,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
