"use strict";
const mongoose = require("mongoose");

const webhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  eventType: { type: String, required: true },
  status: { type: String, enum: ["processing", "processed", "failed"], required: true, default: "processing", index: true },
  attempts: { type: Number, default: 1, min: 1 },
  processingStartedAt: { type: Date, default: Date.now },
  processedAt: { type: Date, default: null },
  lastError: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.models.WebhookEvent || mongoose.model("WebhookEvent", webhookEventSchema);
