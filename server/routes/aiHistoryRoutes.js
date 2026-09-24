// ======================================================
// AI RECOMMENDATION HISTORY ROUTES
// ======================================================
// Ye routes user ki AI searches ko:
// 1. Save karenge
// 2. User ki history dikhayenge
//
// Security:
// Sirf logged-in user apni history dekh/sakhta hai.
// ======================================================

const express = require("express");

const AIHistory = require("../models/AIHistory");
const { protect } = require("../middleware/authMiddleware");

// Express router
const router = express.Router();

// ======================================================
// GET AI HISTORY
// ======================================================
// URL:
// GET /api/ai-history
//
// Sirf current logged-in user ki history milegi.
// Latest search sabse upar hogi.
// ======================================================

router.get("/", protect, async (req, res) => {
  try {
    // Current user ki history find karo
    const history = await AIHistory.find({
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    // Success response
    res.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("❌ Get AI history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get AI recommendation history.",
    });
  }
});

// ======================================================
// POST AI HISTORY
// ======================================================
// URL:
// POST /api/ai-history
//
// AI search ka result database mein save karega.
// ======================================================

router.post("/", protect, async (req, res) => {
  try {
    // Request body se data
    const {
      prompt = "",
      category = "",
      maxPrice = null,
      recommendations = [],
    } = req.body;

    // --------------------------------------------------
    // Basic validation
    // --------------------------------------------------

    if (!Array.isArray(recommendations)) {
      return res.status(400).json({
        success: false,
        message: "Recommendations must be an array.",
      });
    }

    // --------------------------------------------------
    // Sirf required recommendation fields save karo
    // --------------------------------------------------

    const cleanedRecommendations = recommendations.slice(0, 5).map((item) => ({
      foodId: item.foodId || item._id || null,
      name: item.name || "",
      price: Number(item.price) || 0,
      category: item.category || "",
      reason: item.reason || "",
    }));

    // --------------------------------------------------
    // AI history create karo
    // --------------------------------------------------

    const history = await AIHistory.create({
      userId: req.user._id,

      prompt: String(prompt).trim().slice(0, 500),

      category: String(category).trim(),

      maxPrice: maxPrice === null || maxPrice === "" ? null : Number(maxPrice),

      recommendations: cleanedRecommendations,
    });

    // Success response
    res.status(201).json({
      success: true,
      message: "AI recommendation history saved successfully.",
      history,
    });
  } catch (error) {
    console.error("❌ Save AI history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save AI recommendation history.",
    });
  }
});

// ======================================================
// DELETE ALL AI HISTORY
// ======================================================
// URL:
// DELETE /api/ai-history
//
// Current user ki sirf apni AI history delete hogi.
// ======================================================

router.delete("/", protect, async (req, res) => {
  try {
    // Current user ki history delete karo
    await AIHistory.deleteMany({
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: "AI recommendation history deleted successfully.",
    });
  } catch (error) {
    console.error("❌ Delete AI history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete AI recommendation history.",
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
