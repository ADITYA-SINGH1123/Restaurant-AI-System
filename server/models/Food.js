const mongoose = require("mongoose");

// ===============================
// FOOD SCHEMA
// ===============================
// This schema stores restaurant food/menu information
// along with inventory stock quantity.
const foodSchema = new mongoose.Schema(
  {
    // Food name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Food price in INR
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Food category
    category: {
      type: String,
      required: true,
      trim: true,
    },

    // Food image URL
    image: {
      type: String,
      default: "",
    },

    // Food emoji/icon
    icon: {
      type: String,
      default: "🍽️",
    },

    // Food description
    description: {
      type: String,
      default: "",
      trim: true,
    },

    // Whether food is currently available
    available: {
      type: Boolean,
      default: true,
    },

    // ===============================
    // INVENTORY MANAGEMENT
    // ===============================
    // Current available stock quantity.
    stock: {
      type: Number,
      default: 0,
      min: 0,

      // Stock quantity decimal/fraction nahi ho sakti.
      validate: {
        validator: Number.isInteger,
        message: "Stock must be a whole number.",
      },
    },
  },
  {
    // Automatically adds createdAt and updatedAt
    timestamps: true,
  },
);

// ===============================
// AUTO AVAILABILITY ON SAVE
// ===============================
// If stock is 0 -> unavailable
// If stock > 0 -> available
//
// IMPORTANT:
// Mongoose 9 mein async middleware use kar rahe hain.
// Isliye next() use nahi karna hai.
foodSchema.pre("save", async function () {
  // Automatically control availability from inventory stock.
  this.available = this.stock > 0;
});

// ===============================
// AUTO AVAILABILITY ON UPDATE
// ===============================
// orderRoutes.js uses:
// findOneAndUpdate()
// findByIdAndUpdate()
//
// pre("save") in methods ke saath run nahi hota,
// isliye query middleware use kiya gaya hai.
//
// IMPORTANT:
// Mongoose 9 mein next() use nahi karna hai.
foodSchema.pre(["findOneAndUpdate", "findByIdAndUpdate"], async function () {
  // Get the update object.
  const update = this.getUpdate() || {};

  // ---------------------------------------------
  // CASE 1: Direct stock update
  // Example:
  // { stock: 10 }
  // ---------------------------------------------
  if (update.stock !== undefined) {
    const newStock = Number(update.stock);

    if (Number.isFinite(newStock)) {
      update.available = newStock > 0;
    }
  }

  // ---------------------------------------------
  // CASE 2: $set stock update
  // Example:
  // { $set: { stock: 10 } }
  // ---------------------------------------------
  if (update.$set && update.$set.stock !== undefined) {
    const newStock = Number(update.$set.stock);

    if (Number.isFinite(newStock)) {
      update.$set.available = newStock > 0;
    }
  }

  // ---------------------------------------------
  // CASE 3: $inc stock update
  // Example:
  // { $inc: { stock: -2 } }
  //
  // Current stock ke bina final stock calculate
  // nahi karenge.
  //
  // Post middleware final document ke stock ke
  // according availability synchronize karega.
  // ---------------------------------------------
  if (update.$inc && update.$inc.stock !== undefined) {
    const stockChange = Number(update.$inc.stock);

    if (!Number.isFinite(stockChange)) {
      // Invalid stock increment ko silently accept
      // nahi karna.
      throw new Error("Invalid stock update value.");
    }
  }

  // Save modified update object.
  this.setUpdate(update);
});

// ===============================
// POST UPDATE AVAILABILITY SYNC
// ===============================
// Stock update complete hone ke baad final Food
// document ko check karke availability synchronize
// ki jayegi.
//
// IMPORTANT:
// Mongoose 9 async middleware mein next() use nahi karna.
foodSchema.post(
  ["findOneAndUpdate", "findByIdAndUpdate"],
  async function (result) {
    try {
      // Agar food document nahi mila to kuch nahi karna.
      if (!result) {
        return;
      }

      // Final stock value.
      const finalStock = Number(result.stock || 0);

      // Expected availability.
      const expectedAvailability = finalStock > 0;

      // Agar availability already correct hai,
      // unnecessary database update nahi karenge.
      if (result.available === expectedAvailability) {
        return;
      }

      // Final availability synchronize karo.
      result.available = expectedAvailability;

      // Document save karo.
      //
      // Isse updated document database mein
      // availability ke saath save ho jayega.
      await result.save();
    } catch (error) {
      console.error("Food availability synchronization error:", error);

      // Error ko middleware chain mein throw karna.
      throw error;
    }
  },
);

// ===============================
// EXPORT FOOD MODEL
// ===============================
module.exports = mongoose.model("Food", foodSchema);
