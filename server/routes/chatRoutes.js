// ======================================================
// RK RESTAURANT - CHAT ROUTES
// ======================================================
// Customer aur Admin ke beech support chat APIs.
//
// Features:
// 1. Customer apni Admin chat fetch kar sakta hai.
// 2. Customer Admin ko message bhej sakta hai.
// 3. Admin ke chat customers fetch kiye ja sakte hain.
// 4. Admin selected customer ki chat fetch kar sakta hai.
// 5. Admin customer ko reply kar sakta hai.
// 6. Customer/Admin unread messages ko read mark kar sakte hain.
// 7. Unread message count available hai.
// 8. Socket.io se real-time message notification.
// ======================================================

const express = require("express");
const mongoose = require("mongoose");

const ChatMessage = require("../models/ChatMessage");
const User = require("../models/User");

const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// HELPER: CLEAN MESSAGE
// ======================================================

const cleanMessage = (message) => {
  if (typeof message !== "string") {
    return "";
  }

  return message.trim();
};

// ======================================================
// HELPER: GET ADMIN
// ======================================================
// Available admin account find karta hai.
// ======================================================

const getAdminUser = async () => {
  return User.findOne({
    role: "admin",
  }).select("_id name email role");
};

// ======================================================
// GET CUSTOMER CHAT
// ======================================================
// URL:
// GET /api/chat
//
// Logged-in customer ki sirf Admin ke saath conversation
// return hogi.
//
// Customer kisi doosre customer ki chat nahi dekh sakta.
// ======================================================

router.get("/", protect, async (req, res) => {
  try {
    // --------------------------------------------------
    // CUSTOMER ONLY
    // --------------------------------------------------

    if (req.user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can access this chat.",
      });
    }

    // --------------------------------------------------
    // ADMIN FIND
    // --------------------------------------------------

    const admin = await getAdminUser();

    if (!admin) {
      return res.status(503).json({
        success: false,
        message: "No admin is currently available.",
      });
    }

    // --------------------------------------------------
    // FETCH ONLY CURRENT CUSTOMER <-> ADMIN CHAT
    // --------------------------------------------------

    const messages = await ChatMessage.find({
      $or: [
        {
          senderId: req.user._id,
          receiverId: admin._id,
        },
        {
          senderId: admin._id,
          receiverId: req.user._id,
        },
      ],
    })
      .populate("senderId", "name email role")
      .populate("receiverId", "name email role")
      .sort({ createdAt: 1 })
      .limit(500);

    return res.status(200).json({
      success: true,
      admin,
      messages,
    });
  } catch (error) {
    console.error("Fetch customer chat error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch chat messages.",
    });
  }
});

// ======================================================
// CUSTOMER SEND MESSAGE
// ======================================================
// URL:
// POST /api/chat
//
// Body:
// {
//   "message": "Hello, I need help."
// }
// ======================================================

router.post("/", protect, async (req, res) => {
  try {
    // --------------------------------------------------
    // CUSTOMER ONLY
    // --------------------------------------------------

    if (req.user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can send messages here.",
      });
    }

    // --------------------------------------------------
    // CLEAN MESSAGE
    // --------------------------------------------------

    const message = cleanMessage(req.body.message);

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    // Maximum message length
    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Message cannot exceed 2000 characters.",
      });
    }

    // --------------------------------------------------
    // FIND ADMIN
    // --------------------------------------------------

    const admin = await getAdminUser();

    if (!admin) {
      return res.status(503).json({
        success: false,
        message: "No admin is currently available.",
      });
    }

    // --------------------------------------------------
    // CREATE MESSAGE
    // --------------------------------------------------

    const chatMessage = await ChatMessage.create({
      senderId: req.user._id,
      receiverId: admin._id,
      senderRole: "customer",
      message,
      read: false,
    });

    // Populate sender and receiver
    await chatMessage.populate("senderId", "name email role");
    await chatMessage.populate("receiverId", "name email role");

    // --------------------------------------------------
    // SOCKET.IO REAL-TIME MESSAGE
    // --------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      io.to(`user-${admin._id}`).emit("newChatMessage", chatMessage);
    }

    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      chatMessage,
    });
  } catch (error) {
    console.error("Send customer chat message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send chat message.",
    });
  }
});

// ======================================================
// ADMIN GET CHAT CUSTOMERS
// ======================================================
// URL:
// GET /api/chat/admin/customers
//
// Admin ko un customers ki list milegi jinhone chat
// start ki hai.
//
// Admin only.
// ======================================================

router.get("/admin/customers", protect, adminOnly, async (req, res) => {
  try {
    const customers = await ChatMessage.aggregate([
      {
        $match: {
          senderRole: "customer",
          receiverId: req.user._id,
        },
      },
      {
        $group: {
          _id: "$senderId",

          // Customer ka latest message time
          lastMessageAt: {
            $max: "$createdAt",
          },

          // Unread customer messages
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $eq: ["$read", false],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: {
          lastMessageAt: -1,
        },
      },
    ]);

    // --------------------------------------------------
    // CUSTOMER IDs
    // --------------------------------------------------

    const customerIds = customers.map((item) => item._id);

    // --------------------------------------------------
    // CUSTOMER DETAILS
    // --------------------------------------------------

    const users = await User.find({
      _id: {
        $in: customerIds,
      },
      role: "customer",
    }).select("_id name email phone role");

    // --------------------------------------------------
    // USER MAP
    // --------------------------------------------------

    const userMap = new Map(users.map((user) => [String(user._id), user]));

    // --------------------------------------------------
    // FINAL CUSTOMER LIST
    // --------------------------------------------------

    const result = customers
      .map((item) => {
        const user = userMap.get(String(item._id));

        if (!user) {
          return null;
        }

        return {
          customer: user,
          lastMessageAt: item.lastMessageAt,
          unreadCount: item.unreadCount,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      customers: result,
    });
  } catch (error) {
    console.error("Fetch admin chat customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch chat customers.",
    });
  }
});

// ======================================================
// ADMIN GET ONE CUSTOMER CHAT
// ======================================================
// URL:
// GET /api/chat/admin/:customerId
//
// Admin selected customer ki conversation fetch karega.
// ======================================================

router.get("/admin/:customerId", protect, adminOnly, async (req, res) => {
  try {
    const { customerId } = req.params;

    // --------------------------------------------------
    // CUSTOMER ID VALIDATION
    // --------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    // --------------------------------------------------
    // CUSTOMER CHECK
    // --------------------------------------------------

    const customer = await User.findOne({
      _id: customerId,
      role: "customer",
    }).select("_id name email phone role");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    // --------------------------------------------------
    // FETCH ONLY THIS ADMIN <-> CUSTOMER CHAT
    // --------------------------------------------------

    const messages = await ChatMessage.find({
      $or: [
        {
          senderId: customer._id,
          receiverId: req.user._id,
        },
        {
          senderId: req.user._id,
          receiverId: customer._id,
        },
      ],
    })
      .populate("senderId", "name email role")
      .populate("receiverId", "name email role")
      .sort({ createdAt: 1 })
      .limit(500);

    return res.status(200).json({
      success: true,
      customer,
      messages,
    });
  } catch (error) {
    console.error("Fetch admin customer chat error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer chat.",
    });
  }
});

// ======================================================
// ADMIN SEND MESSAGE
// ======================================================
// URL:
// POST /api/chat/admin/:customerId
//
// Body:
// {
//   "message": "Hello, how can I help you?"
// }
// ======================================================

router.post("/admin/:customerId", protect, adminOnly, async (req, res) => {
  try {
    const { customerId } = req.params;

    // --------------------------------------------------
    // CUSTOMER ID VALIDATION
    // --------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    // --------------------------------------------------
    // MESSAGE VALIDATION
    // --------------------------------------------------

    const message = cleanMessage(req.body.message);

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Message cannot exceed 2000 characters.",
      });
    }

    // --------------------------------------------------
    // CUSTOMER CHECK
    // --------------------------------------------------

    const customer = await User.findOne({
      _id: customerId,
      role: "customer",
    }).select("_id name email phone role");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    // --------------------------------------------------
    // CREATE ADMIN MESSAGE
    // --------------------------------------------------

    const chatMessage = await ChatMessage.create({
      senderId: req.user._id,
      receiverId: customer._id,
      senderRole: "admin",
      message,
      read: false,
    });

    // Populate
    await chatMessage.populate("senderId", "name email role");

    await chatMessage.populate("receiverId", "name email role");

    // --------------------------------------------------
    // SOCKET.IO
    // --------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      io.to(`user-${customer._id}`).emit("newChatMessage", chatMessage);
    }

    return res.status(201).json({
      success: true,
      message: "Reply sent successfully.",
      chatMessage,
    });
  } catch (error) {
    console.error("Send admin chat message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send reply.",
    });
  }
});

// ======================================================
// MARK CHAT MESSAGES AS READ
// ======================================================
// URL:
// PUT /api/chat/read/:userId
//
// Current logged-in user ko doosre user se aaye
// unread messages read mark kiye jayenge.
// ======================================================

router.put("/read/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;

    // --------------------------------------------------
    // USER ID VALIDATION
    // --------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    // --------------------------------------------------
    // MARK ONLY RECEIVED MESSAGES AS READ
    // --------------------------------------------------

    const result = await ChatMessage.updateMany(
      {
        senderId: userId,
        receiverId: req.user._id,
        read: false,
      },
      {
        $set: {
          read: true,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Chat messages marked as read.",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark chat messages read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark chat messages as read.",
    });
  }
});

// ======================================================
// GET UNREAD CHAT COUNT
// ======================================================
// URL:
// GET /api/chat/unread-count
//
// Current logged-in user ke unread messages ka count.
// ======================================================

router.get("/unread-count", protect, async (req, res) => {
  try {
    const unreadCount = await ChatMessage.countDocuments({
      receiverId: req.user._id,
      read: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Unread chat count error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch unread chat count.",
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
