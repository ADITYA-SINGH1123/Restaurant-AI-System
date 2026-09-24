// ======================================================
// COMBO OFFER ROUTES
// RK Restaurant
// Step 17.7
// ======================================================

const express = require("express");
const mongoose = require("mongoose");

const ComboOffer = require("../models/ComboOffer");
const Food = require("../models/Food");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// Router
const router = express.Router();

// ======================================================
// HELPER — VALIDATE COMBO ITEMS
// ======================================================

const validateComboItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      valid: false,
      message: "Combo must contain at least one food item.",
    };
  }

  for (const item of items) {
    // Food ID check
    if (!item.foodId || !mongoose.Types.ObjectId.isValid(item.foodId)) {
      return {
        valid: false,
        message: "Invalid food item ID in combo.",
      };
    }

    // Quantity check
    if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
      return {
        valid: false,
        message: "Food quantity must be at least 1.",
      };
    }

    // Food database me exist karta hai ya nahi
    const food = await Food.findById(item.foodId);

    if (!food) {
      return {
        valid: false,
        message: "One or more food items were not found.",
      };
    }
  }

  return {
    valid: true,
  };
};

// ======================================================
// GET ALL AVAILABLE COMBOS
// CUSTOMER ACCESS
// ======================================================

router.get("/", async (req, res) => {
  try {
    const now = new Date();

    const combos = await ComboOffer.find({
      available: true,

      // Validity start:
      $or: [{ validFrom: null }, { validFrom: { $lte: now } }],
    })
      .populate("items.foodId", "name price category image icon")
      .sort({ createdAt: -1 });

    // Valid-until filtering
    const filteredCombos = combos.filter((combo) => {
      if (!combo.validUntil) {
        return true;
      }

      return new Date(combo.validUntil) >= now;
    });

    res.status(200).json({
      combos: filteredCombos,
    });
  } catch (error) {
    console.error("❌ Fetch available combos error:", error);

    res.status(500).json({
      message: "Server error while fetching combo offers.",
    });
  }
});

// ======================================================
// GET ALL COMBOS
// ADMIN ONLY
// ======================================================

router.get("/admin/all", protect, adminOnly, async (req, res) => {
  try {
    const combos = await ComboOffer.find()
      .populate("items.foodId", "name price category image icon")
      .sort({ createdAt: -1 });

    res.status(200).json({
      combos,
    });
  } catch (error) {
    console.error("❌ Admin combo fetch error:", error);

    res.status(500).json({
      message: "Server error while fetching combo offers.",
    });
  }
});

// ======================================================
// GET SINGLE COMBO
// ======================================================

router.get("/:id", async (req, res) => {
  try {
    // MongoDB ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid combo ID.",
      });
    }

    const combo = await ComboOffer.findById(req.params.id).populate(
      "items.foodId",
      "name price category image icon",
    );

    if (!combo) {
      return res.status(404).json({
        message: "Combo offer not found.",
      });
    }

    res.status(200).json({
      combo,
    });
  } catch (error) {
    console.error("❌ Fetch single combo error:", error);

    res.status(500).json({
      message: "Server error while fetching combo offer.",
    });
  }
});

// ======================================================
// CREATE COMBO
// ADMIN ONLY
// ======================================================

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const {
      name,
      items,
      originalPrice,
      comboPrice,
      description,
      image,
      available,
      validFrom,
      validUntil,
    } = req.body;

    // ==================================================
    // BASIC VALIDATION
    // ==================================================

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        message: "Combo name is required.",
      });
    }

    if (originalPrice === undefined || originalPrice === null) {
      return res.status(400).json({
        message: "Original price is required.",
      });
    }

    if (comboPrice === undefined || comboPrice === null) {
      return res.status(400).json({
        message: "Combo price is required.",
      });
    }

    const cleanOriginalPrice = Number(originalPrice);
    const cleanComboPrice = Number(comboPrice);

    // Price validation
    if (!Number.isFinite(cleanOriginalPrice) || cleanOriginalPrice < 0) {
      return res.status(400).json({
        message: "Invalid original price.",
      });
    }

    if (!Number.isFinite(cleanComboPrice) || cleanComboPrice < 0) {
      return res.status(400).json({
        message: "Invalid combo price.",
      });
    }

    // Combo price original price se zyada nahi hona chahiye
    if (cleanComboPrice > cleanOriginalPrice) {
      return res.status(400).json({
        message: "Combo price cannot be greater than original price.",
      });
    }

    // ==================================================
    // ITEMS VALIDATION
    // ==================================================

    const itemsValidation = await validateComboItems(items);

    if (!itemsValidation.valid) {
      return res.status(400).json({
        message: itemsValidation.message,
      });
    }

    // ==================================================
    // DATE VALIDATION
    // ==================================================

    let cleanValidFrom = null;
    let cleanValidUntil = null;

    if (validFrom) {
      cleanValidFrom = new Date(validFrom);

      if (Number.isNaN(cleanValidFrom.getTime())) {
        return res.status(400).json({
          message: "Invalid valid-from date.",
        });
      }
    }

    if (validUntil) {
      cleanValidUntil = new Date(validUntil);

      if (Number.isNaN(cleanValidUntil.getTime())) {
        return res.status(400).json({
          message: "Invalid valid-until date.",
        });
      }
    }

    if (cleanValidFrom && cleanValidUntil && cleanValidUntil < cleanValidFrom) {
      return res.status(400).json({
        message: "Valid-until date cannot be before valid-from date.",
      });
    }

    // ==================================================
    // CLEAN ITEMS
    // ==================================================

    const cleanItems = items.map((item) => ({
      foodId: item.foodId,
      quantity: Number(item.quantity),
    }));

    // ==================================================
    // CREATE COMBO
    // ==================================================

    const combo = new ComboOffer({
      name: String(name).trim(),

      items: cleanItems,

      originalPrice: cleanOriginalPrice,

      comboPrice: cleanComboPrice,

      description: description ? String(description).trim() : "",

      image: image ? String(image).trim() : "",

      available: available !== undefined ? Boolean(available) : true,

      validFrom: cleanValidFrom,

      validUntil: cleanValidUntil,
    });

    await combo.save();

    // Populate response
    await combo.populate("items.foodId", "name price category image icon");

    res.status(201).json({
      message: "Combo offer created successfully!",
      combo,
    });
  } catch (error) {
    console.error("❌ Create combo error:", error);

    res.status(500).json({
      message: "Server error while creating combo offer.",
    });
  }
});

// ======================================================
// UPDATE COMBO
// ADMIN ONLY
// ======================================================

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    // MongoDB ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid combo ID.",
      });
    }

    const combo = await ComboOffer.findById(req.params.id);

    if (!combo) {
      return res.status(404).json({
        message: "Combo offer not found.",
      });
    }

    const {
      name,
      items,
      originalPrice,
      comboPrice,
      description,
      image,
      available,
      validFrom,
      validUntil,
    } = req.body;

    // ==================================================
    // NAME
    // ==================================================

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          message: "Combo name cannot be empty.",
        });
      }

      combo.name = String(name).trim();
    }

    // ==================================================
    // ITEMS
    // ==================================================

    if (items !== undefined) {
      const itemsValidation = await validateComboItems(items);

      if (!itemsValidation.valid) {
        return res.status(400).json({
          message: itemsValidation.message,
        });
      }

      combo.items = items.map((item) => ({
        foodId: item.foodId,
        quantity: Number(item.quantity),
      }));
    }

    // ==================================================
    // PRICES
    // ==================================================

    if (originalPrice !== undefined) {
      const cleanOriginalPrice = Number(originalPrice);

      if (!Number.isFinite(cleanOriginalPrice) || cleanOriginalPrice < 0) {
        return res.status(400).json({
          message: "Invalid original price.",
        });
      }

      combo.originalPrice = cleanOriginalPrice;
    }

    if (comboPrice !== undefined) {
      const cleanComboPrice = Number(comboPrice);

      if (!Number.isFinite(cleanComboPrice) || cleanComboPrice < 0) {
        return res.status(400).json({
          message: "Invalid combo price.",
        });
      }

      combo.comboPrice = cleanComboPrice;
    }

    // Combo price check
    if (combo.comboPrice > combo.originalPrice) {
      return res.status(400).json({
        message: "Combo price cannot be greater than original price.",
      });
    }

    // ==================================================
    // OTHER FIELDS
    // ==================================================

    if (description !== undefined) {
      combo.description = String(description).trim();
    }

    if (image !== undefined) {
      combo.image = String(image).trim();
    }

    if (available !== undefined) {
      combo.available = Boolean(available);
    }

    // ==================================================
    // VALIDITY DATES
    // ==================================================

    if (validFrom !== undefined) {
      if (!validFrom) {
        combo.validFrom = null;
      } else {
        const date = new Date(validFrom);

        if (Number.isNaN(date.getTime())) {
          return res.status(400).json({
            message: "Invalid valid-from date.",
          });
        }

        combo.validFrom = date;
      }
    }

    if (validUntil !== undefined) {
      if (!validUntil) {
        combo.validUntil = null;
      } else {
        const date = new Date(validUntil);

        if (Number.isNaN(date.getTime())) {
          return res.status(400).json({
            message: "Invalid valid-until date.",
          });
        }

        combo.validUntil = date;
      }
    }

    // Date order check
    if (
      combo.validFrom &&
      combo.validUntil &&
      combo.validUntil < combo.validFrom
    ) {
      return res.status(400).json({
        message: "Valid-until date cannot be before valid-from date.",
      });
    }

    // ==================================================
    // SAVE UPDATE
    // ==================================================

    await combo.save();

    await combo.populate("items.foodId", "name price category image icon");

    res.status(200).json({
      message: "Combo offer updated successfully!",
      combo,
    });
  } catch (error) {
    console.error("❌ Update combo error:", error);

    res.status(500).json({
      message: "Server error while updating combo offer.",
    });
  }
});

// ======================================================
// DELETE COMBO
// ADMIN ONLY
// ======================================================

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    // MongoDB ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid combo ID.",
      });
    }

    const combo = await ComboOffer.findById(req.params.id);

    if (!combo) {
      return res.status(404).json({
        message: "Combo offer not found.",
      });
    }

    await ComboOffer.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Combo offer deleted successfully!",
    });
  } catch (error) {
    console.error("❌ Delete combo error:", error);

    res.status(500).json({
      message: "Server error while deleting combo offer.",
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
