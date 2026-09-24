// ======================================================
// RK RESTAURANT - NOTIFICATION ROUTES
// ======================================================
// Customer ki notifications:
// 1. Get notifications
// 2. Unread count
// 3. Mark notification as read
// 4. Mark all notifications as read
// 5. Delete notification
// ======================================================

const express = require("express");
const mongoose = require("mongoose");

const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// GET USER NOTIFICATIONS
// ======================================================
// Logged-in customer ki latest notifications fetch hongi.
// ======================================================

router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Fetch notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
});

// ======================================================
// GET UNREAD NOTIFICATION COUNT
// ======================================================

router.get("/unread-count", protect, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Unread notification count error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch unread notification count.",
    });
  }
});

// ======================================================
// MARK ONE NOTIFICATION AS READ
// ======================================================

router.put("/:id/read", protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Notification ID validate karo.
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    // Sirf current logged-in user ki notification update hogi.
    const notification = await Notification.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    notification.isRead = true;

    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notification.",
    });
  }
});

// ======================================================
// MARK ALL NOTIFICATIONS AS READ
// ======================================================

router.put("/read-all", protect, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        userId: req.user.id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read.",
    });
  }
});

// ======================================================
// DELETE ONE NOTIFICATION
// ======================================================

router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Notification ID validate karo.
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    // Sirf current user's notification delete hogi.
    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("Delete notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
