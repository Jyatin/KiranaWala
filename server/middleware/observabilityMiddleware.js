"use strict";

const crypto = require("crypto");

/**
 * Structured Production Observability & Correlation Tracing Middleware
 */

const SENSITIVE_FIELDS = [
  "password",
  "token",
  "secret",
  "razorpay_key_secret",
  "keySecret",
  "rawBody",
  "authorization",
];

function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const sanitized = Array.isArray(obj) ? [] : {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      sanitized[key] = sanitizeObject(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

function correlationMiddleware(req, res, next) {
  const correlationId =
    req.headers["x-correlation-id"] ||
    req.headers["x-request-id"] ||
    `kw_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);

  const startHrTime = process.hrtime();

  res.on("finish", () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);

    if (process.env.NODE_ENV !== "test") {
      console.log(
        JSON.stringify({
          type: "HTTP_ACCESS",
          timestamp: new Date().toISOString(),
          correlationId,
          method: req.method,
          path: req.originalUrl || req.path,
          status: res.statusCode,
          durationMs: parseFloat(elapsedMs),
        })
      );
    }
  });

  next();
}

function logMetric(metricName, data = {}, correlationId = null) {
  if (process.env.NODE_ENV !== "test") {
    console.log(
      JSON.stringify({
        type: "BUSINESS_METRIC",
        timestamp: new Date().toISOString(),
        metric: metricName,
        correlationId: correlationId || "N/A",
        data: sanitizeObject(data),
      })
    );
  }
}

module.exports = {
  correlationMiddleware,
  logMetric,
  sanitizeObject,
};
