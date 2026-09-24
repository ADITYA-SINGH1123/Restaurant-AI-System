// ======================================================
// INVENTORY HISTORY MODEL
// ======================================================
// Ye model food stock me hone wale changes ka record
// save karega.
//
// Example:
// Stock 20 tha → 15 hua
// previousStock = 20
// newStock = 15
// change = -5
//
// Stock 10 tha → 25 hua
// previousStock = 10
// newStock = 25
// change = +15
//
// DELETE ACTION:
// Food delete hone par history me action = "delete"
// save kiya ja sakta hai.
//
// Isse Admin Inventory History me clearly pata chalega
// ki record normal stock update ka hai ya deleted food ka.
// ======================================================

const mongoose = require("mongoose");

const inventoryHistorySchema = new mongoose.Schema(
  {
    // ====================================================
    // FOOD REFERENCE
    // ====================================================
    // Kis food item ka stock change hua.
    //
    // IMPORTANT:
    // Food delete hone ke baad bhi history document
    // database me reh sakta hai. foodName snapshot ki
    // wajah se history readable rahegi.
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      required: true,
    },

    // Food ka naam snapshot ke roop me save hoga.
    // Isse future me food rename/delete hone par
    // history readable rahegi.
    foodName: {
      type: String,
      required: true,
      trim: true,
    },

    // ====================================================
    // STOCK DETAILS
    // ====================================================

    // Change se pehle ka stock.
    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },

    // Change ke baad ka stock.
    newStock: {
      type: Number,
      required: true,
      min: 0,
    },

    // Actual stock difference.
    //
    // Example:
    // 20 → 15 = -5
    // 10 → 25 = +15
    //
    // Delete action ke case me normally change = 0
    // rakha ja sakta hai, kyunki yahan stock adjustment
    // nahi ho raha, food delete ho raha hai.
    change: {
      type: Number,
      required: true,
    },

    // ====================================================
    // ACTION
    // ====================================================
    // History kis action ki wajah se create hui.
    //
    // manual_update = Admin ne manually stock change kiya
    // order         = Order ki wajah se stock change hua
    // cancel        = Cancelled order ki wajah se stock
    //                 restore hua
    // initial       = Initial stock entry
    // delete        = Food item delete kiya gaya
    //
    // "delete" ko add karne se Admin History UI future me
    // deleted food ko clearly identify kar sakta hai.
    action: {
      type: String,
      enum: ["manual_update", "order", "cancel", "initial", "delete"],
      default: "manual_update",
    },

    // ====================================================
    // OPTIONAL NOTE
    // ====================================================
    // Admin/system additional information yahan save
    // kar sakta hai.
    note: {
      type: String,
      default: "",
      trim: true,
    },

    // ====================================================
    // ADMIN / USER INFORMATION
    // ====================================================

    changedBy: {
      userId: {
        type: String,
        default: "",
      },

      name: {
        type: String,
        default: "Admin",
      },
    },
  },

  // createdAt aur updatedAt automatically create honge.
  {
    timestamps: true,
  },
);

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = mongoose.model("InventoryHistory", inventoryHistorySchema);
