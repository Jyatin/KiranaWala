/**
 * KiranaWala — Centralized JWT Configuration & Validation
 *
 * Provides a single validated source of truth for JWT secrets and options.
 * Enforces production security guarantees (fails fast if secret is missing or insecure).
 */

const MIN_SECRET_LENGTH = 32;
const DEV_FALLBACK_SECRET = "kiranawala-development-jwt-secret-key-32chars!";
const TEST_FALLBACK_SECRET = "your_jwt_secret";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (process.env.NODE_ENV === "test") {
    return secret || TEST_FALLBACK_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    if (!secret) {
      throw new Error(
        "FATAL [SECURITY]: JWT_SECRET environment variable is missing in production."
      );
    }
    if (secret === TEST_FALLBACK_SECRET) {
      throw new Error(
        "FATAL [SECURITY]: Insecure default secret 'your_jwt_secret' is strictly prohibited in production."
      );
    }
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `FATAL [SECURITY]: JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters in production (got ${secret.length}).`
      );
    }
    return secret;
  }

  // Development environment
  if (!secret) {
    console.warn(
      "[SECURITY WARNING] JWT_SECRET is not configured in .env; using local development fallback. Never deploy this configuration to production."
    );
    return DEV_FALLBACK_SECRET;
  }

  return secret;
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

module.exports = {
  getJwtSecret,
  JWT_EXPIRES_IN,
  MIN_SECRET_LENGTH,
};
