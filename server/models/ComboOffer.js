// ======================================================
// COMBO OFFER MODEL
// Restaurant RK System
// Step 17.6
// ======================================================

const mongoose = require("mongoose");

// ======================================================
// COMBO OFFER SCHEMA
// ======================================================

const comboOfferSchema = new mongoose.Schema(
  {
    // Combo ka naam
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Combo me included food items
    items: [
      {
        foodId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Food",
          required: true,
        },

        // Is food item ki quantity
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],

    // Normal individual items ka total price
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // Combo ka special price
    comboPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // Combo ka description
    description: {
      type: String,
      default: "",
      trim: true,
    },

    // Combo image
    image: {
      type: String,
      default: "",
      trim: true,
    },

    // Combo available hai ya nahi
    available: {
      type: Boolean,
      default: true,
    },

    // Combo ki validity
    validFrom: {
      type: Date,
      default: null,
    },

    validUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = mongoose.model("ComboOffer", comboOfferSchema);
