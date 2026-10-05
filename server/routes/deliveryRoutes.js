"use strict";

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../models/order");
const User = require("../models/user");
const Delivery = require("../models/delivery");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

// Allowed delivery state progression
const VALID_DELIVERY_TRANSITIONS = {
  ready: ["assigned"],
  assigned: ["picked_up", "cancelled"],
  picked_up: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

// GET /api/delivery/orders - List orders assigned to logged-in runner
router.get(
  "/orders",
  authenticateToken,
  requireRole("delivery-partner", "admin"),
  async (req, res) => {
    try {
      const runnerId = req.user.id || req.user.userId;
      const { status } = req.query;

      const filter = { deliveryPartner: runnerId };
      if (status) {
        filter.status = status;
      }

      const orders = await Order.find(filter)
        .sort({ updatedAt: -1 })
        .populate("store", "name category location address")
        .populate("customer", "username phone");

      res.json({
        success: true,
        count: orders.length,
        orders,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// GET /api/delivery/available - List orders ready for runner pickup in area
router.get(
  "/available",
  authenticateToken,
  requireRole("delivery-partner", "admin"),
  async (req, res) => {
    try {
      const availableOrders = await Order.find({
        status: "ready",
        deliveryPartner: null,
      })
        .sort({ createdAt: 1 })
        .populate("store", "name category location address")
        .populate("customer", "username phone");

      res.json({
        success: true,
        count: availableOrders.length,
        orders: availableOrders,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// PATCH /api/delivery/orders/:id/claim - Claim/Accept an available order
router.patch(
  "/orders/:id/claim",
  authenticateToken,
  requireRole("delivery-partner", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const runnerId = req.user.id || req.user.userId;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid order ID" });
      }

      const runner = await User.findById(runnerId).select("username phone");

      const order = await Order.findOneAndUpdate(
        { _id: id, status: "ready", deliveryPartner: null },
        {
          $set: {
            deliveryPartner: runnerId,
            status: "assigned",
            deliveryEtaMinutes: 20,
          },
          $push: {
            timeline: {
              status: "assigned",
              note: `Assigned to delivery partner ${runner ? runner.username : "Runner"}`,
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      )
        .populate("store", "name location address")
        .populate("customer", "username phone");

      if (!order) {
        return res.status(400).json({
          success: false,
          message: "Order is no longer available to claim (already assigned or not ready)",
        });
      }

      // Upsert delivery tracking model
      await Delivery.findOneAndUpdate(
        { order: order._id },
        {
          order: order._id,
          runner: runnerId,
          store: order.store._id,
          customer: order.customer._id,
          status: "assigned",
          pickupAddress: order.store.name,
          dropoffAddress: order.deliveryAddress.address,
          earnings: 45, // ₹45 base delivery fee per drop
          timeline: [
            {
              status: "assigned",
              note: "Runner accepted delivery task",
              timestamp: new Date(),
            },
          ],
        },
        { upsert: true }
      );

      res.json({
        success: true,
        message: "Delivery order claimed successfully",
        order,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// PATCH /api/delivery/orders/:id/status - Runner status transition
router.patch(
  "/orders/:id/status",
  authenticateToken,
  requireRole("delivery-partner", "admin", "store-owner"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, otp } = req.body;
      const runnerId = req.user.id || req.user.userId;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid order ID" });
      }

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Check runner assignment if caller is delivery-partner
      if (req.user.role === "delivery-partner") {
        if (!order.deliveryPartner || order.deliveryPartner.toString() !== runnerId) {
          return res.status(403).json({
            success: false,
            message: "Unauthorized: You are not assigned to this delivery",
          });
        }
      }

      const currentStatus = order.status;
      const allowedNext = VALID_DELIVERY_TRANSITIONS[currentStatus] || [];

      if (!allowedNext.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid state transition from '${currentStatus}' to '${status}'. Allowed: [${allowedNext.join(", ")}]`,
        });
      }

      // If transitioning to delivered, verify delivery OTP
      if (status === "delivered") {
        if (order.deliveryOtp && otp && otp.toString().trim() !== order.deliveryOtp) {
          return res.status(400).json({
            success: false,
            message: "Invalid Delivery OTP provided by customer",
          });
        }
      }

      order.status = status;
      order.timeline = order.timeline || [];
      order.timeline.push({
        status,
        note: `Status updated to ${status} by delivery partner`,
        timestamp: new Date(),
      });

      if (status === "delivered") {
        order.deliveredAt = new Date();
      }

      await order.save();

      // Update Delivery model
      await Delivery.findOneAndUpdate(
        { order: order._id },
        {
          status,
          ...(status === "delivered" ? { completedAt: new Date() } : {}),
          $push: {
            timeline: {
              status,
              note: `Delivery status updated to ${status}`,
              timestamp: new Date(),
            },
          },
        }
      );

      res.json({
        success: true,
        message: `Order status updated to ${status}`,
        order,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// GET /api/delivery/orders/:id/track - Public/Authenticated tracking timeline
router.get("/orders/:id/track", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    const order = await Order.findById(id)
      .populate("store", "name category location address rating phone")
      .populate("deliveryPartner", "username phone");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Progression state steps
    const stages = [
      { key: "placed", label: "Order Placed", done: true },
      {
        key: "confirmed",
        label: "Store Confirmed",
        done: ["confirmed", "packing", "ready", "assigned", "picked_up", "out_for_delivery", "delivered"].includes(order.status),
      },
      {
        key: "packing",
        label: "Store Packing",
        done: ["packing", "ready", "assigned", "picked_up", "out_for_delivery", "delivered"].includes(order.status),
      },
      {
        key: "picked_up",
        label: "Runner Picked Up",
        done: ["picked_up", "out_for_delivery", "delivered"].includes(order.status),
      },
      {
        key: "out_for_delivery",
        label: "Out for Delivery",
        done: ["out_for_delivery", "delivered"].includes(order.status),
      },
      {
        key: "delivered",
        label: "Delivered",
        done: order.status === "delivered",
      },
    ];

    res.json({
      success: true,
      orderId: order._id,
      currentStatus: order.status,
      stages,
      etaMinutes: order.deliveryEtaMinutes || 18,
      deliveryOtp: order.deliveryOtp,
      store: order.store,
      runner: order.deliveryPartner
        ? {
            name: order.deliveryPartner.username,
            phone: order.deliveryPartner.phone || "+91 98765 43210",
            rating: 4.8,
            vehicle: "Electric Scooter",
          }
        : null,
      timeline: order.timeline || [],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/delivery/earnings - Runner metrics
router.get(
  "/earnings",
  authenticateToken,
  requireRole("delivery-partner"),
  async (req, res) => {
    try {
      const runnerId = req.user.id || req.user.userId;

      const completedDeliveries = await Order.countDocuments({
        deliveryPartner: runnerId,
        status: "delivered",
      });

      const activeDeliveries = await Order.countDocuments({
        deliveryPartner: runnerId,
        status: { $in: ["assigned", "picked_up", "out_for_delivery"] },
      });

      const totalEarnings = completedDeliveries * 45; // ₹45 per delivery

      res.json({
        success: true,
        stats: {
          completedDeliveries,
          activeDeliveries,
          baseRate: 45,
          totalEarnings,
          todayEarnings: completedDeliveries > 0 ? Math.min(totalEarnings, 180) : 0,
          rating: 4.85,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
