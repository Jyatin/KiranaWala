const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    category: {
      type: String,
      default: "General",
      index: true,
    },
    brand: {
      type: String,
      default: "Local Brand",
    },
    unit: {
      type: String,
      default: "1 unit",
    },
    stock: {
      type: Number,
      default: 20,
    },
    availableStock: {
      type: Number,
      default: 20,
    },
    reservedStock: {
      type: Number,
      default: 0,
    },
    soldStock: {
      type: Number,
      default: 0,
    },
    incomingStock: {
      type: Number,
      default: 0,
    },
    damagedStock: {
      type: Number,
      default: 0,
    },
    reorderLevel: {
      type: Number,
      default: 5,
    },
    safetyStock: {
      type: Number,
      default: 3,
    },
    supplierInfo: {
      name: { type: String, default: "Local APMC Wholesale" },
      leadTimeDays: { type: Number, default: 1 },
      contact: { type: String, default: "" },
    },
    available: {
      type: Boolean,
      default: true,
      index: true,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    ratingCount: {
      type: Number,
      default: 12,
    },
    tags: [{ type: String, index: true }],
  },
  { timestamps: true },
);

productSchema.index({ store: 1, available: 1 });
productSchema.index({ name: "text", description: "text", category: "text", brand: "text" });

module.exports = mongoose.model("Product", productSchema);
