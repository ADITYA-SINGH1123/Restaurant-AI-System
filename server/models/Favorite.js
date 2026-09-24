// ======================================================
// FAVORITE MODEL
// ======================================================
// Ye model customer ke favorite foods ko MongoDB mein
// store karega.
//
// Features:
// 1. User ka ID store hoga
// 2. Food ka ID store hoga
// 3. Same user same food ko duplicate favorite
//    nahi kar sakta
// ======================================================

const mongoose = require("mongoose");

// ======================================================
// FAVORITE SCHEMA
// ======================================================

const favoriteSchema = new mongoose.Schema(
  {
    // ==================================================
    // CUSTOMER ID
    // ==================================================
    // Ye batayega ki favorite kis customer ka hai.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==================================================
    // FOOD ID
    // ==================================================
    // Ye batayega ki kaunsa food favorite kiya gaya hai.
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      required: true,
    },
  },

  // createdAt aur updatedAt automatically add honge.
  {
    timestamps: true,
  },
);

// ======================================================
// UNIQUE USER + FOOD
// ======================================================
// Ek customer ek food ko sirf ek baar favorite kar
// sakta hai.
//
// Example:
// User A + Burger = allowed
// User A + Burger = duplicate ❌
// User B + Burger = allowed ✅
// ======================================================

favoriteSchema.index(
  {
    userId: 1,
    foodId: 1,
  },
  {
    unique: true,
  },
);

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = mongoose.model("Favorite", favoriteSchema);
