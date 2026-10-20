/**
 * KiranaWala — Lightweight Authentication Rate Limiter
 *
 * Protects login and registration routes against brute-force credential stuffing.
 * Bypasses during test suites to ensure predictable and fast execution.
 */

const rateLimitMap = new Map();

// Periodic cleanup every 10 minutes to prevent memory leak
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let cleanupTimer = null;

function ensureCleanup() {
  if (!cleanupTimer) {
    cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of rateLimitMap.entries()) {
        if (now > record.resetTime) {
          rateLimitMap.delete(key);
        }
      }
    }, CLEANUP_INTERVAL);
    if (cleanupTimer.unref) cleanupTimer.unref();
  }
}

function authRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const maxAttempts = options.max || 30; // 30 attempts per 15 min window

  ensureCleanup();

  return (req, res, next) => {
    if (process.env.NODE_ENV === "test") {
      return next();
    }

    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown-ip";

    const key = `auth:${clientIp}`;
    const now = Date.now();
    const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count += 1;
    rateLimitMap.set(key, record);

    res.setHeader("X-RateLimit-Limit", maxAttempts);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxAttempts - record.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

    if (record.count > maxAttempts) {
      console.warn(`[SECURITY] Rate limit exceeded for IP: ${clientIp}`);
      return res.status(429).json({
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes.",
      });
    }

    next();
  };
}

module.exports = {
  authRateLimiter,
};
