// ===============================
// FOOD ROUTES
// ===============================
// Ye file restaurant ke food/menu aur
// inventory stock se related API routes handle karti hai.

const express = require("express");
const mongoose = require("mongoose");
const Food = require("../models/Food");
const StockHistory = require("../models/StockHistory");

// ======================================================
// CENTRAL AUTHENTICATION MIDDLEWARE
// ======================================================
// protect -> JWT/user authentication handle karta hai.
// adminOnly -> sirf admin ko protected admin APIs access
// karne deta hai.

const { protect, adminOnly } = require("../middleware/authMiddleware");

// Existing route structure ko maintain karne ke liye
// dono middleware ko reusable middleware array mein rakha hai.
const requireAdmin = [protect, adminOnly];

const router = express.Router();

// ======================================================
// GET ALL AVAILABLE FOODS
// ======================================================

router.get("/", async (req, res) => {
  try {
    const foods = await Food.find({
      available: true,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      foods,
    });
  } catch (error) {
    console.error("Get foods error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch food items.",
    });
  }
});

// ======================================================
// ADMIN - GET ALL FOODS
// ======================================================

router.get("/admin/all", requireAdmin, async (req, res) => {
  try {
    const foods = await Food.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      foods,
    });
  } catch (error) {
    console.error("Admin get foods error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin food menu.",
    });
  }
});

// ======================================================
// ADMIN - INVENTORY SUMMARY
// ======================================================

router.get("/admin/inventory-summary", requireAdmin, async (req, res) => {
  try {
    const foods = await Food.find().select(
      "_id name stock available category price image",
    );

    const totalItems = foods.length;

    const inStockItems = foods.filter((food) => Number(food.stock || 0) > 0);

    const outOfStockItems = foods.filter(
      (food) => Number(food.stock || 0) === 0,
    );

    const lowStockItems = foods.filter((food) => {
      const stock = Number(food.stock || 0);
      return stock > 0 && stock <= 5;
    });

    const totalStockQuantity = foods.reduce(
      (total, food) => total + Number(food.stock || 0),
      0,
    );

    return res.status(200).json({
      success: true,

      summary: {
        totalItems,
        inStockItems: inStockItems.length,
        lowStockItems: lowStockItems.length,
        outOfStockItems: outOfStockItems.length,
        totalStockQuantity,
      },

      foods,
    });
  } catch (error) {
    console.error("Inventory summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory summary.",
    });
  }
});

// ======================================================
// ADMIN - BULK STOCK UPDATE
// ======================================================
// Step 6.22 + Step 17
//
// Multiple food items ka stock ek request mein update hota hai.
//
// Food updates + StockHistory same MongoDB transaction mein
// save hote hain.
//
// Concurrency protection bhi add ki gayi hai:
//
// update karte waqt database mein expected previous stock
// bhi match kiya jaata hai.
//
// Agar kisi doosre request ne pehle stock change kar diya,
// to update silently overwrite nahi karega.
//
// ======================================================

router.put("/admin/bulk-stock", requireAdmin, async (req, res) => {
  let session;

  try {
    const { updates } = req.body;

    // ======================================================
    // REQUEST VALIDATION
    // ======================================================

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one stock update.",
      });
    }

    // Maximum 100 updates per request.
    if (updates.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 stock updates are allowed at once.",
      });
    }

    // ======================================================
    // DUPLICATE FOOD ID CHECK
    // ======================================================

    const foodIds = updates.map((item) => String(item?.foodId || ""));

    const uniqueFoodIds = new Set(foodIds);

    if (uniqueFoodIds.size !== foodIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate food IDs are not allowed.",
      });
    }

    // ======================================================
    // VALIDATE ALL INPUTS
    // ======================================================

    const validatedUpdates = [];

    for (const item of updates) {
      const foodId = item?.foodId;
      const stock = item?.stock;

      // Food ID validation.
      if (!foodId || !mongoose.Types.ObjectId.isValid(String(foodId))) {
        return res.status(400).json({
          success: false,
          message: "Every stock update must contain a valid food ID.",
        });
      }

      const numericStock = Number(stock);

      // Stock must be a non-negative integer.
      if (
        stock === "" ||
        stock === undefined ||
        stock === null ||
        !Number.isFinite(numericStock) ||
        !Number.isInteger(numericStock) ||
        numericStock < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Stock must be a non-negative whole number.",
        });
      }

      validatedUpdates.push({
        foodId: String(foodId),
        stock: numericStock,
      });
    }

    // ======================================================
    // START TRANSACTION
    // ======================================================

    session = await mongoose.startSession();

    session.startTransaction();

    // ======================================================
    // FETCH ALL FOODS INSIDE TRANSACTION
    // ======================================================

    const requestedIds = validatedUpdates.map((item) => item.foodId);

    const foods = await Food.find({
      _id: {
        $in: requestedIds,
      },
    }).session(session);

    // ======================================================
    // CHECK ALL FOODS EXIST
    // ======================================================

    if (foods.length !== validatedUpdates.length) {
      const existingIds = new Set(foods.map((food) => String(food._id)));

      const missingIds = requestedIds.filter((id) => !existingIds.has(id));

      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "One or more food items were not found.",
        missingFoodIds: missingIds,
      });
    }

    // ======================================================
    // CREATE FOOD MAP
    // ======================================================

    const foodMap = new Map(foods.map((food) => [String(food._id), food]));

    // ======================================================
    // ADMIN INFORMATION
    // ======================================================

    const adminId = req.user?._id || req.user?.id || req.user?.userId || "";

    const adminName =
      req.user?.name || req.user?.username || req.user?.email || "Admin";

    // ======================================================
    // RESULT ARRAYS
    // ======================================================

    const updatedFoods = [];
    const historyRecords = [];

    // ======================================================
    // PROCESS EACH FOOD
    // ======================================================

    for (const update of validatedUpdates) {
      const food = foodMap.get(update.foodId);

      if (!food) {
        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message: "Food item not found.",
        });
      }

      const previousStock = Number(food.stock || 0);
      const newStock = update.stock;
      const change = newStock - previousStock;

      // ====================================================
      // SAME STOCK
      // ====================================================
      // Agar stock same hai to unnecessary database/history
      // operation nahi karenge.

      if (change === 0) {
        updatedFoods.push({
          _id: food._id,
          name: food.name,
          previousStock,
          newStock,
          change: 0,
          changed: false,
        });

        continue;
      }

      // ====================================================
      // CONCURRENCY-PROTECTED UPDATE
      // ====================================================
      // IMPORTANT:
      // _id ke saath previousStock bhi match kiya ja raha hai.
      //
      // Example:
      // Expected stock = 10
      // Lekin kisi doosre request ne stock ko 7 kar diya.
      //
      // Filter {_id, stock: 10} match nahi karega.
      // Isse old value silently overwrite nahi hogi.

      const updatedFood = await Food.findOneAndUpdate(
        {
          _id: food._id,
          stock: previousStock,
        },
        {
          $set: {
            stock: newStock,

            // Stock availability ka source of truth hai.
            available: newStock > 0,
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      // ====================================================
      // CONCURRENCY CONFLICT
      // ====================================================
      // Agar expected previous stock match nahi hua,
      // iska matlab stock kisi aur request/admin/order ne
      // change kar diya hai.

      if (!updatedFood) {
        await session.abortTransaction();

        return res.status(409).json({
          success: false,
          message:
            "Stock was changed by another request. Please refresh and try again.",
          conflict: true,
          foodId: food._id,
          expectedPreviousStock: previousStock,
        });
      }

      // ====================================================
      // CREATE STOCK HISTORY DATA
      // ====================================================

      historyRecords.push({
        foodId: updatedFood._id,
        foodName: updatedFood.name,
        previousStock,
        newStock,
        change,
        adminId: String(adminId),
        adminName: String(adminName),
        reason: "Bulk stock adjustment",
      });

      // ====================================================
      // RESPONSE DATA
      // ====================================================

      updatedFoods.push({
        _id: updatedFood._id,
        name: updatedFood.name,
        previousStock,
        newStock,
        change,
        changed: true,
      });
    }

    // ======================================================
    // SAVE STOCK HISTORY INSIDE TRANSACTION
    // ======================================================

    if (historyRecords.length > 0) {
      await StockHistory.insertMany(historyRecords, {
        session,
      });
    }

    // ======================================================
    // COMMIT TRANSACTION
    // ======================================================

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Bulk stock update completed successfully.",
      updatedCount: historyRecords.length,
      totalRequested: validatedUpdates.length,
      foods: updatedFoods,
    });
  } catch (error) {
    // ======================================================
    // ROLLBACK TRANSACTION
    // ======================================================

    if (session) {
      try {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
      } catch (rollbackError) {
        console.error(
          "Bulk stock transaction rollback error:",
          rollbackError.message,
        );
      }
    }

    console.error("Bulk stock update error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to perform bulk stock update.",
    });
  } finally {
    // Always close MongoDB session.
    if (session) {
      await session.endSession();
    }
  }
});

// ======================================================
// ADMIN - ADD NEW FOOD
// ======================================================

router.post("/", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      price,
      category,
      image,
      icon,
      description,
      available,
      stock,
    } = req.body;

    // ======================================================
    // NAME VALIDATION
    // ======================================================

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Food name is required.",
      });
    }

    // ======================================================
    // PRICE VALIDATION
    // ======================================================

    const numericPrice = Number(price);

    if (
      price === undefined ||
      price === null ||
      price === "" ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid food price.",
      });
    }

    // ======================================================
    // CATEGORY VALIDATION
    // ======================================================

    if (!category || !String(category).trim()) {
      return res.status(400).json({
        success: false,
        message: "Food category is required.",
      });
    }

    // ======================================================
    // STOCK VALIDATION
    // ======================================================

    const numericStock =
      stock === undefined || stock === null || stock === "" ? 0 : Number(stock);

    if (
      !Number.isFinite(numericStock) ||
      !Number.isInteger(numericStock) ||
      numericStock < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a non-negative whole number.",
      });
    }

    // ======================================================
    // AVAILABILITY CONSISTENCY
    // ======================================================
    // Client ki available value trust nahi karte.
    // Stock ke according availability set hoti hai.

    const autoAvailable = numericStock > 0;

    const food = await Food.create({
      name: String(name).trim(),
      price: numericPrice,
      category: String(category).trim(),
      image: image ? String(image).trim() : "",
      icon: icon ? String(icon).trim() : "🍽️",
      description: description ? String(description).trim() : "",
      available: autoAvailable,
      stock: numericStock,
    });

    // Backward compatibility ke liye available destructure kiya gaya.
    void available;

    return res.status(201).json({
      success: true,
      message: "Food item added successfully.",
      food,
    });
  } catch (error) {
    console.error("Add food error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add food item.",
    });
  }
});

// ======================================================
// ADMIN - UPDATE FOOD
// ======================================================
// Step 16 + Step 17
//
// Food update + StockHistory same transaction mein save hote
// hain.
//
// Stock update ke case mein concurrency protection bhi hai.
//
// Expected previous stock ko database update filter mein
// use kiya jaata hai.
//
// Agar stock kisi doosre request se already change ho gaya,
// to update 409 Conflict return karega.
//
// ======================================================

router.put("/:id", requireAdmin, async (req, res) => {
  let session;

  try {
    const foodId = req.params.id;

    // ======================================================
    // FOOD ID VALIDATION
    // ======================================================

    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID.",
      });
    }

    const {
      name,
      price,
      category,
      image,
      icon,
      description,
      available,
      stock,
    } = req.body;

    // ======================================================
    // START TRANSACTION
    // ======================================================

    session = await mongoose.startSession();

    session.startTransaction();

    // ======================================================
    // FETCH EXISTING FOOD INSIDE TRANSACTION
    // ======================================================

    const existingFood = await Food.findById(foodId).session(session);

    if (!existingFood) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Food item not found.",
      });
    }

    // Existing stock ko safely store kar rahe hain.
    const previousStock = Number(existingFood.stock || 0);

    const updateData = {};

    // ======================================================
    // NAME
    // ======================================================

    if (name !== undefined) {
      if (!String(name).trim()) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Food name cannot be empty.",
        });
      }

      updateData.name = String(name).trim();
    }

    // ======================================================
    // PRICE
    // ======================================================

    if (price !== undefined) {
      const numericPrice = Number(price);

      if (price === "" || !Number.isFinite(numericPrice) || numericPrice < 0) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Please provide a valid food price.",
        });
      }

      updateData.price = numericPrice;
    }

    // ======================================================
    // CATEGORY
    // ======================================================

    if (category !== undefined) {
      if (!String(category).trim()) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Food category cannot be empty.",
        });
      }

      updateData.category = String(category).trim();
    }

    // ======================================================
    // IMAGE
    // ======================================================

    if (image !== undefined) {
      updateData.image = String(image).trim();
    }

    // ======================================================
    // ICON
    // ======================================================

    if (icon !== undefined) {
      updateData.icon = String(icon).trim() || "🍽️";
    }

    // ======================================================
    // DESCRIPTION
    // ======================================================

    if (description !== undefined) {
      updateData.description = String(description).trim();
    }

    // ======================================================
    // STOCK VALIDATION
    // ======================================================

    let newStock = previousStock;

    if (stock !== undefined) {
      const numericStock = Number(stock);

      if (
        stock === "" ||
        !Number.isFinite(numericStock) ||
        !Number.isInteger(numericStock) ||
        numericStock < 0
      ) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Stock must be a non-negative whole number.",
        });
      }

      newStock = numericStock;

      updateData.stock = newStock;

      // Stock is the source of truth.
      updateData.available = newStock > 0;
    } else {
      // Stock update nahi hua.
      // Existing stock ke according availability maintain hogi.

      updateData.available = previousStock > 0;
    }

    // ======================================================
    // CLIENT AVAILABLE VALUE IGNORED
    // ======================================================
    // Client directly available ko control nahi kar sakta.
    // Isse stock/availability mismatch prevent hota hai.

    void available;

    // ======================================================
    // CALCULATE STOCK CHANGE
    // ======================================================

    const stockChanged = stock !== undefined;

    const change = newStock - previousStock;

    // ======================================================
    // UPDATE FOOD
    // ======================================================
    //
    // Agar stock change ho raha hai:
    // _id + previous stock dono filter mein match hone chahiye.
    //
    // Isse stale stock value overwrite nahi hogi.
    //
    // Agar stock change nahi ho raha:
    // normal _id based update use hoga.

    let updatedFood;

    if (stockChanged && change !== 0) {
      // ====================================================
      // CONCURRENCY-PROTECTED STOCK UPDATE
      // ====================================================

      updatedFood = await Food.findOneAndUpdate(
        {
          _id: foodId,
          stock: previousStock,
        },
        updateData,
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      // ====================================================
      // CONCURRENCY CONFLICT
      // ====================================================

      if (!updatedFood) {
        await session.abortTransaction();

        return res.status(409).json({
          success: false,
          message:
            "Stock was changed by another request. Please refresh and try again.",
          conflict: true,
          foodId,
          expectedPreviousStock: previousStock,
        });
      }
    } else {
      // ====================================================
      // NON-STOCK FOOD UPDATE
      // ====================================================
      // Sirf name/price/category/image etc. update ho raha hai.

      updatedFood = await Food.findByIdAndUpdate(foodId, updateData, {
        new: true,
        runValidators: true,
        session,
      });
    }

    // ======================================================
    // FINAL FOOD EXISTENCE CHECK
    // ======================================================

    if (!updatedFood) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Food item not found.",
      });
    }

    // ======================================================
    // STOCK HISTORY
    // ======================================================

    if (stockChanged && change !== 0) {
      const adminId = req.user?._id || req.user?.id || req.user?.userId || "";

      const adminName =
        req.user?.name || req.user?.username || req.user?.email || "Admin";

      // ====================================================
      // HISTORY INSIDE SAME TRANSACTION
      // ====================================================
      // History fail hone par error throw hoga.
      // Catch block complete transaction rollback karega.

      await StockHistory.create(
        [
          {
            foodId: updatedFood._id,
            foodName: updatedFood.name,
            previousStock,
            newStock,
            change,
            adminId: String(adminId),
            adminName: String(adminName),
            reason: "Manual stock adjustment",
          },
        ],
        {
          session,
        },
      );
    }

    // ======================================================
    // COMMIT TRANSACTION
    // ======================================================

    await session.commitTransaction();

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.status(200).json({
      success: true,
      message: "Food item updated successfully.",
      food: updatedFood,
    });
  } catch (error) {
    // ======================================================
    // ROLLBACK TRANSACTION
    // ======================================================

    if (session) {
      try {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
      } catch (rollbackError) {
        console.error(
          "Food update transaction rollback error:",
          rollbackError.message,
        );
      }
    }

    console.error("Update food error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update food item.",
    });
  } finally {
    // ======================================================
    // CLOSE SESSION
    // ======================================================

    if (session) {
      await session.endSession();
    }
  }
});

// ======================================================
// ADMIN - DELETE FOOD
// ======================================================

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const foodId = req.params.id;

    // ======================================================
    // FOOD ID VALIDATION
    // ======================================================

    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID.",
      });
    }

    const food = await Food.findById(foodId);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food item not found.",
      });
    }

    await Food.findByIdAndDelete(foodId);

    return res.status(200).json({
      success: true,
      message: "Food item deleted successfully.",
    });
  } catch (error) {
    console.error("Delete food error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete food item.",
    });
  }
});

// ======================================================
// GET SINGLE AVAILABLE FOOD
// ======================================================

router.get("/:id", async (req, res) => {
  try {
    const foodId = req.params.id;

    // ======================================================
    // FOOD ID VALIDATION
    // ======================================================

    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID.",
      });
    }

    const food = await Food.findOne({
      _id: foodId,
      available: true,
    });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food item not found.",
      });
    }

    return res.status(200).json({
      success: true,
      food,
    });
  } catch (error) {
    console.error("Get single food error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch food details.",
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
