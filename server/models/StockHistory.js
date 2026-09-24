// ======================================================
// STOCK HISTORY MODEL
// ======================================================
// Ye model food stock me hone wale har adjustment ka
// history record store karega.

const mongoose = require("mongoose");

// ======================================================
// STOCK HISTORY SCHEMA
// ======================================================

const stockHistorySchema = new mongoose.Schema(
  {
    // Food ka MongoDB ID
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      required: true,
    },

    // Food ka naam
    // History ko future me bhi readable rakhne ke liye
    // naam separately store kar rahe hain.
    foodName: {
      type: String,
      required: true,
      trim: true,
    },

    // Stock update se pehle ki quantity
    previousStock: {
      type: Number,
      required: true,
      min: 0,

      // Stock quantity whole number honi chahiye.
      validate: {
        validator: Number.isInteger,
        message: "Previous stock must be a whole number.",
      },
    },

    // Stock update ke baad ki quantity
    newStock: {
      type: Number,
      required: true,
      min: 0,

      // Stock quantity whole number honi chahiye.
      validate: {
        validator: Number.isInteger,
        message: "New stock must be a whole number.",
      },
    },

    // Actual stock change
    // Example:
    // 10 -> 15 = +5
    // 15 -> 8  = -7
    change: {
      type: Number,
      required: true,

      // Stock change bhi whole number hona chahiye.
      validate: {
        validator: Number.isInteger,
        message: "Stock change must be a whole number.",
      },
    },

    // Kis admin/user ne stock update kiya
    adminId: {
      type: String,
      default: "",
      trim: true,
    },

    // Admin/user ka naam
    adminName: {
      type: String,
      default: "Admin",
      trim: true,
    },

    // Stock change ka reason
    reason: {
      type: String,
      default: "Manual stock adjustment",
      trim: true,
    },
  },
  {
    // createdAt automatically history ka exact time store karega.
    timestamps: true,
  },
);

// ======================================================
// INVENTORY CONSISTENCY VALIDATION
// ======================================================
// Ye validation ensure karti hai ki:
//
// change = newStock - previousStock
//
// Example:
// previousStock = 10
// newStock      = 15
// change        = +5
//
// Mongoose 9 compatible middleware.
// Callback-style "next" use nahi kar rahe hain.

stockHistorySchema.pre("validate", function () {
  // Required values available hone par consistency check karo.
  if (
    Number.isInteger(this.previousStock) &&
    Number.isInteger(this.newStock) &&
    Number.isInteger(this.change)
  ) {
    const expectedChange = this.newStock - this.previousStock;

    // Actual change aur expected change match nahi karte
    // to history record reject karo.
    if (this.change !== expectedChange) {
      throw new Error(
        "Stock history inconsistency: change must equal newStock - previousStock.",
      );
    }
  }
});

// ======================================================
// INDEXES
// ======================================================

// Latest history ko quickly fetch karne ke liye.
stockHistorySchema.index({
  createdAt: -1,
});

// Specific food ki history quickly fetch karne ke liye.
stockHistorySchema.index({
  foodId: 1,
  createdAt: -1,
});

// ======================================================
// EXPORT
// ======================================================

module.exports = mongoose.model("StockHistory", stockHistorySchema);
