"use strict";

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Notification = require("../models/notification");
const { authenticateToken } = require("../middleware/authMiddleware");

// GET /api/notifications - List user's notifications
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid notification ID" });
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, notification: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/mark-all-read
router.post("/mark-all-read", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    await Notification.updateMany({ recipient: userId, isRead: false }, { $set: { isRead: true } });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
