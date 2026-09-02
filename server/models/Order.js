const mongoose = require("mongoose");

// ===============================
// ORDER STATUS HISTORY SCHEMA
// ===============================
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

// ===============================
// ORDER SCHEMA
// ===============================
const orderSchema = new mongoose.Schema(
  {
    // ===============================
    // ORDER ID
    // ===============================
    orderId: {
      type: String,
      required: true,
      unique: true,
    },

    // ===============================
    // USER ID
    // ===============================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ===============================
    // CUSTOMER NAME
    // ===============================
    name: {
      type: String,
      required: true,
    },

    // ===============================
    // CUSTOMER PHONE
    // ===============================
    phone: {
      type: String,
      required: true,
    },

    // ===============================
    // DELIVERY ADDRESS
    // ===============================
    address: {
      type: String,
      required: true,
    },

    // ===============================
    // ORDERED ITEMS
    // ===============================
    items: {
      type: Array,
      required: true,
    },

    // ===============================
    // TOTAL AMOUNT
    // ===============================
    totalAmount: {
      type: Number,
      required: true,
    },

    // ===============================
    // PAYMENT ID
    // ===============================
    paymentId: {
      type: String,
      default: null,
    },

    // ===============================
    // RAZORPAY ORDER ID
    // ===============================
    razorpayOrderId: {
      type: String,
      default: null,
    },

    // ===============================
    // RAZORPAY PAYMENT SIGNATURE
    // ===============================
    razorpaySignature: {
      type: String,
      default: null,
    },

    // ===============================
    // PAYMENT STATUS
    // ===============================
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },

    // ===============================
    // CURRENT ORDER STATUS
    // ===============================
    status: {
      type: String,
      enum: [
        "Order Placed",
        "Preparing",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Order Placed",
    },

    // ===============================
    // STATUS HISTORY
    // ===============================
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },

  // ===============================
  // AUTOMATIC TIMESTAMPS
  // ===============================
  {
    timestamps: true,
  },
);

// ===============================
// EXPORT MODEL
// ===============================
module.exports = mongoose.model("Order", orderSchema);
