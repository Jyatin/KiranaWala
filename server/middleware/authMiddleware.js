const jwt = require("jsonwebtoken");
const User = require("../models/user");

const ROLE_ALIASES = {
  customer: "customer",
  buyer: "customer",
  "store-owner": "store-owner",
  merchant: "store-owner",
  "delivery-partner": "delivery-partner",
  admin: "admin",
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET || "your_jwt_secret";

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    req.user = decoded; // Contains { id: user._id, role: user.role }
    if (!req.user.id && req.user.userId) {
      req.user.id = req.user.userId;
    }
    next();
  });
};

const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Account has been suspended" });
      }

      const normalizedAllowed = allowedRoles.map((r) => ROLE_ALIASES[r] || r);
      if (!normalizedAllowed.includes(user.role)) {
        return res.status(403).json({
          message: `Access denied: requires one of [${allowedRoles.join(", ")}]`,
        });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      console.error("Error in requireRole middleware:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

const requireCustomer = requireRole("customer", "admin");
const requireStoreOwner = requireRole("store-owner", "admin");
const requireMerchant = requireStoreOwner;
const requireDeliveryPartner = requireRole("delivery-partner", "admin");
const requireAdmin = requireRole("admin");

module.exports = {
  authenticateToken,
  requireRole,
  requireCustomer,
  requireStoreOwner,
  requireMerchant,
  requireDeliveryPartner,
  requireAdmin,
};
