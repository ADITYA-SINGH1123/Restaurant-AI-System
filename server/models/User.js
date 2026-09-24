const mongoose = require("mongoose");

// ======================================================
// USER SCHEMA
// ======================================================
const userSchema = new mongoose.Schema(
  {
    // ==================================================
    // USER NAME
    // ==================================================
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // ==================================================
    // USER EMAIL
    // ==================================================
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // ==================================================
    // USER PHONE
    // ==================================================
    // Customer apna phone number profile se update kar sakega.
    phone: {
      type: String,
      default: "",
      trim: true,
    },

    // ==================================================
    // USER PASSWORD
    // ==================================================
    password: {
      type: String,
      required: true,
    },

    // ==================================================
    // USER ROLE
    // ==================================================
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },

    // ==================================================
    // LOYALTY POINTS
    // ==================================================
    // Customer ke loyalty points yahan store honge.
    // Default balance 0 rahega.
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==================================================
    // PASSWORD RESET TOKEN
    // ==================================================
    // Password bhoolne par temporary token yahan store hoga.
    resetPasswordToken: {
      type: String,
      default: null,
    },

    // ==================================================
    // PASSWORD RESET TOKEN EXPIRY
    // ==================================================
    // Token limited time ke liye valid rahega.
    resetPasswordExpire: {
      type: Date,
      default: null,
    },
  },

  // Automatically createdAt aur updatedAt add honge.
  {
    timestamps: true,
  },
);

// ======================================================
// USER MODEL
// ======================================================
const User = mongoose.model("User", userSchema);

// ======================================================
// EXPORT USER MODEL
// ======================================================
module.exports = User;
