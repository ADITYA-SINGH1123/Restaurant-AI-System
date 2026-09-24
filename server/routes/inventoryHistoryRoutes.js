// ==============================================
// INVENTORY HISTORY ROUTES
// ==============================================
// Ye file admin ke stock adjustment history APIs
// handle karti hai.

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const StockHistory = require("../models/StockHistory");

const router = express.Router();

// ======================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ======================================================
// Sirf logged-in admin stock history dekh sakta hai.

const requireAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Authorization header check
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // JWT token extract karna
    const token = authHeader.split(" ")[1];

    // Token verify karna
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Admin role check
    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    // User information request me attach karna
    req.user = decoded;

    next();
  } catch (error) {
    console.error("Inventory history authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

// ======================================================
// GET RECENT STOCK HISTORY
// ======================================================
// Admin dashboard ke liye latest stock adjustments.
// Default: latest 50 records.

router.get("/", requireAdmin, async (req, res) => {
  try {
    // Query se limit lena
    let limit = Number(req.query.limit || 50);

    // Limit ko safe range me rakhna
    if (!Number.isInteger(limit) || limit < 1) {
      limit = 50;
    }

    // Maximum 100 records ek request me
    if (limit > 100) {
      limit = 100;
    }

    // Latest stock history fetch karna
    const history = await StockHistory.find()
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Get stock history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch stock history.",
    });
  }
});

// ======================================================
// GET STOCK HISTORY FOR ONE FOOD
// ======================================================
// Kisi particular food item ki stock history dekhne ke liye.

router.get("/:foodId", requireAdmin, async (req, res) => {
  try {
    const foodId = req.params.foodId;

    // MongoDB ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID.",
      });
    }

    // Particular food ki history
    const history = await StockHistory.find({
      foodId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Get food stock history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch food stock history.",
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
