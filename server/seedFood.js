const mongoose = require("mongoose");
require("dotenv").config();

const Food = require("./models/Food");
const Order = require("./models/Order");

// ======================================================
// FOOD IMAGE DATA
// ======================================================
// IMPORTANT:
// Existing Food documents delete nahi honge.
// Sirf image field update ki jayegi.
//
// Ye URLs public image URLs hain, isliye backend ke
// uploads folder ki dependency nahi rahegi.
// ======================================================

const foodImages = {
  "Margherita Pizza":
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80",

  "Classic Burger":
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",

  "Hakka Noodles":
    "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80",

  "Crispy Chicken":
    "https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=600&q=80",

  "Healthy Bowl":
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",

  "Chocolate Cake":
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",
};

// ======================================================
// UPDATE EXISTING FOOD IMAGES
// ======================================================

const updateFoodImages = async () => {
  console.log("\n🍽️ Updating Food images...\n");

  for (const [foodName, imageUrl] of Object.entries(foodImages)) {
    const food = await Food.findOne({
      name: foodName,
    });

    if (!food) {
      console.log(`⚠️ Food not found: ${foodName}`);
      continue;
    }

    food.image = imageUrl;

    await food.save();

    console.log(`✅ Image updated: ${foodName}`);
  }
};

// ======================================================
// UPDATE EXISTING ORDER ITEM IMAGES
// ======================================================
// IMPORTANT:
// Purane orders ke andar image snapshot empty ho sakta hai.
// Isliye existing food orders ko bhi update kar rahe hain.
//
// Order delete nahi hoga.
// Order ID, payment information, quantity, price etc.
// untouched rahenge.
// ======================================================

const updateExistingOrderImages = async () => {
  console.log("\n📦 Updating existing order images...\n");

  const foods = await Food.find({}).lean();

  // Food ID -> image URL mapping
  const foodImageMap = new Map();

  for (const food of foods) {
    if (food?._id && food?.image) {
      foodImageMap.set(food._id.toString(), food.image);
    }
  }

  const orders = await Order.find({});

  let updatedOrders = 0;
  let updatedItems = 0;

  for (const order of orders) {
    let orderChanged = false;

    if (!Array.isArray(order.items)) {
      continue;
    }

    for (const item of order.items) {
      // Combo items ko abhi change nahi karna.
      // Combo ki image ComboOffer model se aati hai.
      if (item.itemType === "combo") {
        continue;
      }

      if (!item?._id) {
        continue;
      }

      const imageUrl = foodImageMap.get(item._id.toString());

      if (!imageUrl) {
        continue;
      }

      // Existing order item image ko valid Food image se update karo.
      if (item.image !== imageUrl) {
        item.image = imageUrl;
        orderChanged = true;
        updatedItems++;
      }
    }

    if (orderChanged) {
      await order.save();
      updatedOrders++;
    }
  }

  console.log(`✅ Orders updated: ${updatedOrders}`);
  console.log(`✅ Order items updated: ${updatedItems}`);
};

// ======================================================
// MAIN FUNCTION
// ======================================================

const seedFood = async () => {
  try {
    // --------------------------------------------------
    // CONNECT TO MONGODB
    // --------------------------------------------------

    await mongoose.connect(process.env.MONGO_URI);

    console.log("========================================");
    console.log("✅ MongoDB connected.");
    console.log("========================================");

    // --------------------------------------------------
    // IMPORTANT:
    // NO deleteMany()
    // Existing food data will be preserved.
    // --------------------------------------------------

    await updateFoodImages();

    // --------------------------------------------------
    // UPDATE OLD ORDERS
    // --------------------------------------------------

    await updateExistingOrderImages();

    // --------------------------------------------------
    // FINISH
    // --------------------------------------------------

    console.log("\n========================================");
    console.log("🎉 Food image update completed.");
    console.log("========================================");

    await mongoose.connection.close();

    console.log("✅ Database connection closed.");
  } catch (error) {
    console.error("\n❌ Food image update error:", error);

    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error("❌ Database close error:", closeError);
    }

    process.exit(1);
  }
};

// ======================================================
// RUN
// ======================================================

seedFood();
