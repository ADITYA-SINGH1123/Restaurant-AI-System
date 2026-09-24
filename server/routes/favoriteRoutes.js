// ======================================================
// FAVORITE ROUTES
// ======================================================
// Ye routes customer ke favorite foods ko handle
// karenge.
//
// Features:
// 1. Favorite add karna
// 2. Favorite remove karna
// 3. Customer ke favorites dekhna
// 4. Check karna ki food favorite hai ya nahi
// 5. JWT authentication
// 6. Duplicate favorite protection
// ======================================================

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const Favorite = require("../models/Favorite");
const Food = require("../models/Food");

const router = express.Router();

// ======================================================
// AUTHENTICATION MIDDLEWARE
// ======================================================
// JWT token se customer ka userId nikala jayega.
// ======================================================

const protect = (req, res, next) => {
  try {
    // Authorization header check
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Bearer token se actual token nikalo
    const token = authHeader.split(" ")[1];

    // JWT verify karo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // User ID request mein save karo
    req.userId = decoded.userId || decoded.id || decoded._id;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

// ======================================================
// GET MY FAVORITES
// ======================================================
// URL:
// GET /api/favorites
//
// Logged-in customer ke saare favorite foods return
// honge.
// ======================================================

router.get("/", protect, async (req, res) => {
  try {
    // Customer ke favorites fetch karo
    const favorites = await Favorite.find({
      userId: req.userId,
    })
      .populate("foodId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      favorites,
      totalFavorites: favorites.length,
    });
  } catch (error) {
    console.error("Get favorites error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch favorites.",
    });
  }
});

// ======================================================
// ADD FAVORITE
// ======================================================
// URL:
// POST /api/favorites
//
// Body:
// {
//   "foodId": "FOOD_ID"
// }
// ======================================================

router.post("/", protect, async (req, res) => {
  try {
    const { foodId } = req.body;

    // Food ID required
    if (!foodId) {
      return res.status(400).json({
        success: false,
        message: "Food ID is required.",
      });
    }

    // Food ID valid hai ya nahi
    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID.",
      });
    }

    // ==================================================
    // CHECK FOOD
    // ==================================================

    const food = await Food.findById(foodId);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found.",
      });
    }

    // ==================================================
    // CHECK DUPLICATE FAVORITE
    // ==================================================

    const existingFavorite = await Favorite.findOne({
      userId: req.userId,
      foodId,
    });

    if (existingFavorite) {
      return res.status(409).json({
        success: false,
        message: "Food is already in your favorites.",
      });
    }

    // ==================================================
    // CREATE FAVORITE
    // ==================================================

    const favorite = await Favorite.create({
      userId: req.userId,
      foodId,
    });

    // Food details response mein bhejne ke liye populate
    await favorite.populate("foodId");

    return res.status(201).json({
      success: true,
      message: "Food added to favorites.",
      favorite,
    });
  } catch (error) {
    // MongoDB unique index duplicate protection
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Food is already in your favorites.",
      });
    }

    console.error("Add favorite error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add favorite.",
    });
  }
});

// ======================================================
// REMOVE FAVORITE
// ======================================================
// URL:
// DELETE /api/favorites/:foodId
//
// Customer sirf apna favorite remove kar sakta hai.
// ======================================================

router.delete("/:foodId", protect, async (req, res) => {
  try {
    const { foodId } = req.params;

    // Food ID validation
    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID.",
      });
    }

    // Sirf current customer ka favorite delete karo
    const favorite = await Favorite.findOneAndDelete({
      userId: req.userId,
      foodId,
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: "Food is not in your favorites.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Food removed from favorites.",
    });
  } catch (error) {
    console.error("Remove favorite error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove favorite.",
    });
  }
});

// ======================================================
// CHECK FAVORITE STATUS
// ======================================================
// URL:
// GET /api/favorites/check/:foodId
//
// Ye batayega ki current customer ne food ko
// favorite kiya hai ya nahi.
// ======================================================

router.get("/check/:foodId", protect, async (req, res) => {
  try {
    const { foodId } = req.params;

    // Food ID validation
    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID.",
      });
    }

    // Favorite search karo
    const favorite = await Favorite.findOne({
      userId: req.userId,
      foodId,
    });

    return res.status(200).json({
      success: true,
      isFavorite: Boolean(favorite),
    });
  } catch (error) {
    console.error("Check favorite error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check favorite status.",
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
