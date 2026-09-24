// ======================================================
// RK RESTAURANT - NOTIFICATION MODEL
// ======================================================
// User ko order/status/offers jaise notifications
// store karne ke liye ye MongoDB model use hoga.
// ======================================================

const mongoose = require("mongoose");

// ======================================================
// NOTIFICATION SCHEMA
// ======================================================

const notificationSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // USER
    // --------------------------------------------------
    // Notification kis customer ke liye hai.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // --------------------------------------------------
    // TYPE
    // --------------------------------------------------
    // Notification ka category/type.
    type: {
      type: String,
      enum: [
        "order",
        "payment",
        "delivery",
        "offer",
        "loyalty",
        "system",
        "review", // Customer review/rating notification
        "reservation",
        "inventory",
      ],
      default: "system",
      required: true,
    },

    // --------------------------------------------------
    // TITLE
    // --------------------------------------------------
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    // --------------------------------------------------
    // MESSAGE
    // --------------------------------------------------
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // --------------------------------------------------
    // RELATED ORDER
    // --------------------------------------------------
    // Agar notification kisi order se related hai,
    // to us order ki ID yahan store hogi.
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    // --------------------------------------------------
    // READ STATUS
    // --------------------------------------------------
    // false = unread
    // true  = already read
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    // --------------------------------------------------
    // OPTIONAL ACTION URL
    // --------------------------------------------------
    // Example:
    // /orders/123
    // /offers
    actionUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
  },
  {
    // createdAt aur updatedAt automatically maintain honge.
    timestamps: true,
  },
);

// ======================================================
// INDEXES
// ======================================================

// User ki latest notifications quickly fetch karne ke liye.
notificationSchema.index({
  userId: 1,
  createdAt: -1,
});

// Unread notifications quickly fetch karne ke liye.
notificationSchema.index({
  userId: 1,
  isRead: 1,
  createdAt: -1,
});

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = mongoose.model("Notification", notificationSchema);
