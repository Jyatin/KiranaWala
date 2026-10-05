const mongoose = require("mongoose");

const demandPredictionSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "General",
    },
    targetDate: {
      type: Date,
      required: true,
      index: true,
    },
    predictedUnits: {
      type: Number,
      required: true,
    },
    currentInventory: {
      type: Number,
      required: true,
    },
    recommendedReorder: {
      type: Number,
      default: 0,
    },
    confidenceScore: {
      type: Number,
      default: 0.85, // 0.0 to 1.0
    },
    factors: {
      historicalTrend: { type: String, default: "Steady Friday surge" },
      dayOfWeekImpact: { type: Number, default: 1.15 },
      weatherImpact: {
        condition: { type: String, default: "Light Rain" },
        demandMultiplier: { type: Number, default: 1.18 },
      },
      seasonality: { type: String, default: "Monsoon Evening" },
    },
    explanation: {
      type: String,
      default: "",
    },
    isSimulated: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

demandPredictionSchema.index({ store: 1, targetDate: 1 });

module.exports = mongoose.model("DemandPrediction", demandPredictionSchema);
