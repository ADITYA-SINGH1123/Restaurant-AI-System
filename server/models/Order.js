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
    // ORDER TYPE
    // ===============================
    // Immediate = normal order
    // Scheduled = future date/time par order
    //
    // Existing orders ke liye default
    // Immediate rahega.
    orderType: {
      type: String,
      enum: ["Immediate", "Scheduled"],
      default: "Immediate",
    },

    // ===============================
    // SCHEDULED DATE & TIME
    // ===============================
    // Sirf Scheduled order ke liye use hoga.
    //
    // Immediate order mein ye null rahega.
    scheduledFor: {
      type: Date,
      default: null,
    },

    // ===============================
    // LOYALTY POINTS USED
    // ===============================
    // Customer ne is order mein kitne
    // loyalty points redeem kiye.
    loyaltyPointsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ===============================
    // LOYALTY DISCOUNT
    // ===============================
    // Loyalty points se mila total
    // discount amount.
    loyaltyDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ===============================
    // PAYMENT ID
    // ===============================
    // Razorpay payment ID
    // Same payment ID ko duplicate order ke liye
    // use nahi kiya ja sakta.
    paymentId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },

    // ===============================
    // RAZORPAY ORDER ID
    // ===============================
    // Same Razorpay order ko duplicate
    // MongoDB orders ke saath use nahi karne denge.
    razorpayOrderId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
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
