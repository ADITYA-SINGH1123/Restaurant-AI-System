// ======================================================
// AI RECOMMENDATION HISTORY MODEL
// ======================================================
// Ye model user ki AI food searches ko MongoDB mein
// save karega.
//
// Store hone wali information:
// 1. User ID
// 2. User ka prompt
// 3. Selected category
// 4. Maximum budget
// 5. AI recommendations
// 6. Search ka time
// ======================================================

const mongoose = require("mongoose");

// ======================================================
// AI HISTORY SCHEMA
// ======================================================

const aiHistorySchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // USER REFERENCE
    // --------------------------------------------------
    // Kis user ne AI search ki
    // --------------------------------------------------

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // --------------------------------------------------
    // USER PROMPT
    // --------------------------------------------------
    // Example:
    // "I want healthy food under 250"
    // --------------------------------------------------

    prompt: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    // --------------------------------------------------
    // CATEGORY
    // --------------------------------------------------
    // Example:
    // Pizza / Burger / Healthy
    // --------------------------------------------------

    category: {
      type: String,
      trim: true,
      default: "",
    },

    // --------------------------------------------------
    // MAXIMUM BUDGET
    // --------------------------------------------------

    maxPrice: {
      type: Number,
      default: null,
    },

    // --------------------------------------------------
    // AI RECOMMENDATIONS
    // --------------------------------------------------
    // Sirf required food information save karenge.
    // Isse history lightweight rahegi.
    // --------------------------------------------------

    recommendations: [
      {
        foodId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Food",
        },

        name: {
          type: String,
          default: "",
        },

        price: {
          type: Number,
          default: 0,
        },

        category: {
          type: String,
          default: "",
        },

        reason: {
          type: String,
          default: "",
        },
      },
    ],
  },

  // MongoDB automatically:
  // createdAt
  // updatedAt
  // add karega.
  {
    timestamps: true,
  },
);

// ======================================================
// INDEX
// ======================================================
// User ki latest AI searches quickly find karne ke liye.
// ======================================================

aiHistorySchema.index({
  userId: 1,
  createdAt: -1,
});

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = mongoose.model("AIHistory", aiHistorySchema);
