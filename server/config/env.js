/**
 * KiranaWala — Startup Environment Validation
 *
 * Verifies that required credentials, secrets, and database endpoints exist
 * before accepting traffic. Fails fast in production to prevent running
 * in an insecure or degraded state.
 */

const { getJwtSecret } = require("./jwt");

function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";

  if (isTest) {
    // Tests manage their own mock environment
    return { valid: true, missing: [] };
  }

  const missing = [];

  // Database URI
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    missing.push("MONGO_URI");
  }

  // Validate JWT Secret
  try {
    getJwtSecret();
  } catch (err) {
    missing.push(err.message);
  }

  // Production-only mandatory variables
  if (isProduction) {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      missing.push("RAZORPAY_WEBHOOK_SECRET (required for payment integrity in production)");
    }
  }

  if (missing.length > 0) {
    const errorMsg = `[STARTUP ERROR] Missing or invalid required environment configuration:\n - ${missing.join("\n - ")}`;
    if (isProduction) {
      console.error(errorMsg);
      throw new Error(errorMsg);
    } else {
      console.warn(errorMsg);
    }
  }

  return { valid: missing.length === 0, missing };
}

module.exports = {
  validateEnvironment,
};
