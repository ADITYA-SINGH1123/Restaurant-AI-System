const mongoose = require("mongoose");

// ======================================================
// CHAT MESSAGE SCHEMA
// ======================================================
// Customer aur Admin ke beech hone wale messages
// MongoDB me store honge.
//
// Har message ke andar:
// - senderId     = message bhejne wala user
// - receiverId   = message receive karne wala user
// - senderRole   = customer / admin
// - message      = actual chat text
// - read         = message read hua ya nahi
// ======================================================

const chatMessageSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // MESSAGE SENDER
    // --------------------------------------------------
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // --------------------------------------------------
    // MESSAGE RECEIVER
    // --------------------------------------------------
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // --------------------------------------------------
    // SENDER ROLE
    // --------------------------------------------------
    // Isse identify karna easy rahega ki message
    // customer ne bheja hai ya admin ne.
    senderRole: {
      type: String,
      enum: ["customer", "admin"],
      required: true,
    },

    // --------------------------------------------------
    // MESSAGE TEXT
    // --------------------------------------------------
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // --------------------------------------------------
    // READ STATUS
    // --------------------------------------------------
    // false = unread
    // true  = read
    read: {
      type: Boolean,
      default: false,
    },
  },

  // MongoDB automatically createdAt aur updatedAt
  // fields maintain karega.
  {
    timestamps: true,
  },
);

// ======================================================
// INDEXES
// ======================================================
// Chat messages ko sender/receiver ke basis par
// quickly fetch karne ke liye indexes.

chatMessageSchema.index({
  senderId: 1,
  receiverId: 1,
  createdAt: 1,
});

chatMessageSchema.index({
  receiverId: 1,
  read: 1,
});

// ======================================================
// MODEL
// ======================================================

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

module.exports = ChatMessage;
