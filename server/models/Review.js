// ======================================================
// REVIEW MODEL
// ======================================================
// Ye model customer ke food reviews aur ratings ko
// MongoDB mein store karega.
//
// Review mein:
// 1. Food reference
// 2. User reference
// 3. Rating (1-5)
// 4. Review text
// 5. Created/Updated time
// ======================================================

const mongoose = require("mongoose");

// ======================================================
// REVIEW SCHEMA
// ======================================================

const reviewSchema = new mongoose.Schema(
  {
    // Kis food ke liye review hai
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      required: true,
    },

    // Kis customer ne review diya
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Customer rating: 1 se 5 stars
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // Customer ka review/comment
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 500,
    },
  },
  {
    // createdAt aur updatedAt automatically add honge
    timestamps: true,
  },
);

// ======================================================
// ONE USER - ONE REVIEW PER FOOD
// ======================================================
// Ek customer same food par multiple duplicate
// reviews nahi de sakega.

reviewSchema.index({ foodId: 1, userId: 1 }, { unique: true });

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = mongoose.model("Review", reviewSchema);
