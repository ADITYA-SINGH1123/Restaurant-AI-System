// ======================================================
// AI FOOD RECOMMENDATION ROUTES
// ======================================================
// Features:
// 1. Natural language food recommendation
// 2. Budget detection
// 3. Category detection
// 4. Healthy / spicy / sweet preferences
// 5. Cheap / affordable preference
// 6. Filling / heavy meal preference
// 7. Previous order history
// 8. Favorite food history
// 9. Context-based recommendation
// 10. "Like burger but healthier" type requests
// 11. Surprise Me support
// 12. Personalized scoring
// 13. Top 5 recommendations
// ======================================================

const express = require("express");
const mongoose = require("mongoose");

const Food = require("../models/Food");
const Order = require("../models/Order");
const Favorite = require("../models/Favorite");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// HELPER: LOWERCASE TEXT
// ======================================================

const normalizeText = (value = "") => {
  return String(value).trim().toLowerCase();
};

// ======================================================
// HELPER: CHECK KEYWORDS
// ======================================================

const containsAny = (text, keywords) => {
  return keywords.some((keyword) => text.includes(keyword));
};

// ======================================================
// GET AI RECOMMENDATIONS
// ======================================================

router.get("/recommendations", protect, async (req, res) => {
  try {
    // ==================================================
    // USER INPUT
    // ==================================================

    const prompt = normalizeText(req.query.prompt || "");
    const category = normalizeText(req.query.category || "");
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;

    // ==================================================
    // VALIDATE BUDGET
    // ==================================================

    if (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Invalid maximum price.",
      });
    }

    // ==================================================
    // GET AVAILABLE FOODS
    // ==================================================

    const foods = await Food.find({
      available: true,
    }).sort({
      createdAt: -1,
    });

    if (foods.length === 0) {
      return res.json({
        success: true,
        recommendations: [],
        message: "No food is currently available.",
      });
    }

    // ==================================================
    // USER ID
    // ==================================================

    const userId = req.user._id;

    // ==================================================
    // GET PREVIOUS PAID ORDERS
    // ==================================================

    const previousOrders = await Order.find({
      userId,
      paymentStatus: "Paid",
    }).lean();

    // ==================================================
    // GET FAVORITES
    // ==================================================

    const favorites = await Favorite.find({
      userId,
    }).lean();

    // ==================================================
    // BUILD USER FOOD HISTORY
    // ==================================================

    const orderedFoodIds = new Set();

    const orderedFoodNames = new Set();

    const orderedCategories = new Set();

    // ==================================================
    // READ PREVIOUS ORDERS
    // ==================================================

    previousOrders.forEach((order) => {
      if (!Array.isArray(order.items)) {
        return;
      }

      order.items.forEach((item) => {
        // Food ID can exist in different formats
        const foodId = item?.foodId ?? item?._id ?? item?.id;

        // Save food ID
        if (foodId) {
          orderedFoodIds.add(String(foodId));
        }

        // Save food name
        if (item?.name) {
          orderedFoodNames.add(normalizeText(item.name));
        }

        // Save category
        if (item?.category) {
          orderedCategories.add(normalizeText(item.category));
        }
      });
    });

    // ==================================================
    // FAVORITE FOOD IDs
    // ==================================================

    const favoriteFoodIds = new Set(
      favorites.map((favorite) => String(favorite.foodId)),
    );

    // ==================================================
    // DETECT USER PREFERENCES
    // ==================================================

    const preferences = {
      healthy: containsAny(prompt, [
        "healthy",
        "healthier",
        "light",
        "fresh",
        "diet",
        "fit",
      ]),

      spicy: containsAny(prompt, ["spicy", "spice", "hot"]),

      sweet: containsAny(prompt, ["sweet", "dessert", "cake"]),

      cheap: containsAny(prompt, [
        "cheap",
        "affordable",
        "budget",
        "budget-friendly",
        "not expensive",
        "inexpensive",
      ]),

      filling: containsAny(prompt, ["filling", "heavy", "full meal", "hungry"]),

      surprise: containsAny(prompt, [
        "surprise me",
        "surprise",
        "you choose",
        "choose for me",
        "anything is fine",
        "i don't know what to eat",
        "dont know what to eat",
        "suggest something",
        "recommend something",
        "what should i eat",
        "best food for me",
      ]),
    };

    // ==================================================
    // DETECT "SIMILAR TO" REQUEST
    // ==================================================
    // Example:
    // "something like burger but healthier"
    //
    // Is request mein burger ko strict category filter
    // nahi banayenge.
    //
    // Burger base preference rahega aur healthier
    // modifier higher priority lega.
    // ==================================================

    let similarFoodType = "";

    if (
      prompt.includes("like burger") ||
      prompt.includes("similar to burger") ||
      prompt.includes("something like burger") ||
      prompt.includes("burger but")
    ) {
      similarFoodType = "burger";
    } else if (
      prompt.includes("like pizza") ||
      prompt.includes("similar to pizza") ||
      prompt.includes("something like pizza") ||
      prompt.includes("pizza but")
    ) {
      similarFoodType = "pizza";
    } else if (
      prompt.includes("like noodles") ||
      prompt.includes("similar to noodles") ||
      prompt.includes("something like noodles") ||
      prompt.includes("noodles but")
    ) {
      similarFoodType = "noodles";
    } else if (
      prompt.includes("like chicken") ||
      prompt.includes("similar to chicken") ||
      prompt.includes("something like chicken") ||
      prompt.includes("chicken but")
    ) {
      similarFoodType = "chicken";
    } else if (
      prompt.includes("like dessert") ||
      prompt.includes("similar to dessert") ||
      prompt.includes("something like dessert")
    ) {
      similarFoodType = "dessert";
    }

    // ==================================================
    // DETECT CATEGORY FROM PROMPT
    // ==================================================

    let detectedCategory = "";

    if (containsAny(prompt, ["pizza"])) {
      detectedCategory = "pizza";
    } else if (containsAny(prompt, ["burger"])) {
      detectedCategory = "burger";
    } else if (containsAny(prompt, ["noodle", "noodles"])) {
      detectedCategory = "noodles";
    } else if (containsAny(prompt, ["chicken"])) {
      detectedCategory = "chicken";
    } else if (containsAny(prompt, ["healthy"])) {
      detectedCategory = "healthy";
    } else if (containsAny(prompt, ["dessert", "cake", "sweet"])) {
      detectedCategory = "dessert";
    }

    // ==================================================
    // EXTRACT BUDGET FROM NATURAL LANGUAGE
    // ==================================================

    let detectedBudget = maxPrice;

    // Example:
    // under 250
    // below 300
    // within 200
    // less than 500
    // upto 400
    // up to 350
    // maximum 300
    // ==================================================

    if (detectedBudget === null && prompt) {
      const budgetMatch = prompt.match(
        /(?:under|below|within|less than|maximum|max|upto|up to)\s*₹?\s*(\d+)/i,
      );

      if (budgetMatch) {
        detectedBudget = Number(budgetMatch[1]);
      }
    }

    // ==================================================
    // FINAL CATEGORY
    // ==================================================

    const selectedCategory = category || detectedCategory;

    // ==================================================
    // FILTER FOODS
    // ==================================================

    let candidateFoods = [...foods];

    // ==================================================
    // BUDGET FILTER
    // ==================================================

    if (detectedBudget !== null) {
      candidateFoods = candidateFoods.filter(
        (food) => food.price <= detectedBudget,
      );
    }

    // ==================================================
    // STRICT CATEGORY FILTER
    // ==================================================
    // Similar-to request mein category ko strict filter
    // nahi karenge.
    //
    // Example:
    // "like burger but healthier"
    //
    // Healthy Bowl ko bhi recommendation mil sakti hai.
    // ==================================================

    if (selectedCategory && !similarFoodType) {
      candidateFoods = candidateFoods.filter(
        (food) => normalizeText(food.category) === selectedCategory,
      );
    }

    // ==================================================
    // HEALTHY STRICT FILTER
    // ==================================================
    // Agar user explicitly healthier/healthy request
    // karta hai to healthy foods ko priority denge.
    //
    // Agar exact healthy category available hai to
    // candidates ko healthy relevance ke according score
    // kiya jayega.
    // ==================================================

    // ==================================================
    // CREATE SCORED FOOD LIST
    // ==================================================

    const scoredFoods = candidateFoods.map((food) => {
      // ==================================================
      // SEARCHABLE FOOD TEXT
      // ==================================================

      const foodText = normalizeText(
        `${food.name} ${food.category} ${food.description}`,
      );

      // ==================================================
      // SCORE
      // ==================================================

      let score = 0;

      // Recommendation reasons
      const reasons = [];

      // ==================================================
      // FAVORITE SCORE
      // ==================================================

      if (favoriteFoodIds.has(String(food._id))) {
        score += 30;

        reasons.push("You have added this food to your favorites");
      }

      // ==================================================
      // PREVIOUS ORDER SCORE
      // ==================================================

      if (orderedFoodIds.has(String(food._id))) {
        score += 25;

        reasons.push("You have ordered this food before");
      }

      // ==================================================
      // PREVIOUS FOOD NAME MATCH
      // ==================================================

      if (orderedFoodNames.has(normalizeText(food.name))) {
        score += 15;
      }

      // ==================================================
      // PREVIOUS CATEGORY MATCH
      // ==================================================

      if (orderedCategories.has(normalizeText(food.category))) {
        score += 10;

        reasons.push("It matches your previous food preferences");
      }

      // ==================================================
      // BUDGET SCORE
      // ==================================================

      if (detectedBudget !== null) {
        if (food.price <= detectedBudget) {
          score += 10;

          reasons.push(`Fits within your ₹${detectedBudget} budget`);
        }

        // Extra score for cheaper choices
        if (food.price <= 200) {
          score += 8;
        }
      }

      // ==================================================
      // CHEAP PREFERENCE
      // ==================================================

      if (preferences.cheap) {
        if (food.price <= 200) {
          score += 15;

          reasons.push("Budget-friendly choice");
        } else if (food.price <= 300) {
          score += 8;

          reasons.push("Reasonably priced choice");
        }
      }

      // ==================================================
      // HEALTHY PREFERENCE
      // ==================================================

      if (preferences.healthy) {
        if (normalizeText(food.category) === "healthy") {
          score += 35;

          reasons.push("Healthy choice matching your preference");
        }

        if (
          containsAny(foodText, [
            "healthy",
            "fresh",
            "light",
            "vegetable",
            "vegetables",
            "salad",
            "bowl",
            "nutrition",
          ])
        ) {
          score += 20;

          reasons.push("Matches your healthier food preference");
        }
      }

      // ==================================================
      // SPICY PREFERENCE
      // ==================================================

      if (preferences.spicy) {
        if (
          containsAny(foodText, ["spicy", "spice", "hot", "chilli", "chili"])
        ) {
          score += 25;

          reasons.push("Matches your spicy food preference");
        }
      }

      // ==================================================
      // SWEET PREFERENCE
      // ==================================================

      if (preferences.sweet) {
        if (
          containsAny(foodText, [
            "sweet",
            "dessert",
            "cake",
            "chocolate",
            "sugar",
          ])
        ) {
          score += 30;

          reasons.push("Matches your sweet food preference");
        }
      }

      // ==================================================
      // FILLING PREFERENCE
      // ==================================================

      if (preferences.filling) {
        if (
          containsAny(foodText, [
            "filling",
            "heavy",
            "meal",
            "burger",
            "chicken",
            "noodles",
            "paratha",
          ])
        ) {
          score += 20;

          reasons.push("Good filling meal choice");
        }
      }

      // ==================================================
      // SIMILAR FOOD INTELLIGENCE
      // ==================================================

      if (similarFoodType) {
        // ------------------------------------------------
        // BURGER SIMILARITY
        // ------------------------------------------------

        if (similarFoodType === "burger") {
          if (containsAny(foodText, ["burger", "bun", "patty", "sandwich"])) {
            score += 20;

            reasons.push("Similar to the burger style you requested");
          }

          // Healthier burger alternative
          if (
            preferences.healthy &&
            normalizeText(food.category) === "healthy"
          ) {
            score += 40;

            reasons.push("A healthier alternative to your burger preference");
          }
        }

        // ------------------------------------------------
        // PIZZA SIMILARITY
        // ------------------------------------------------

        if (similarFoodType === "pizza") {
          if (containsAny(foodText, ["pizza", "cheese", "bread", "baked"])) {
            score += 20;

            reasons.push("Similar to the pizza style you requested");
          }

          if (
            preferences.healthy &&
            normalizeText(food.category) === "healthy"
          ) {
            score += 35;

            reasons.push("A healthier alternative to your pizza preference");
          }
        }

        // ------------------------------------------------
        // NOODLES SIMILARITY
        // ------------------------------------------------

        if (similarFoodType === "noodles") {
          if (containsAny(foodText, ["noodle", "pasta", "meal", "rice"])) {
            score += 20;

            reasons.push("Similar to the noodles style you requested");
          }

          if (
            preferences.healthy &&
            normalizeText(food.category) === "healthy"
          ) {
            score += 35;

            reasons.push("A healthier alternative to your noodles preference");
          }
        }

        // ------------------------------------------------
        // CHICKEN SIMILARITY
        // ------------------------------------------------

        if (similarFoodType === "chicken") {
          if (containsAny(foodText, ["chicken", "protein", "meal"])) {
            score += 20;

            reasons.push("Similar to the chicken style you requested");
          }

          if (
            preferences.healthy &&
            normalizeText(food.category) === "healthy"
          ) {
            score += 35;

            reasons.push("A healthier alternative to your chicken preference");
          }
        }

        // ------------------------------------------------
        // DESSERT SIMILARITY
        // ------------------------------------------------

        if (similarFoodType === "dessert") {
          if (
            containsAny(foodText, ["dessert", "cake", "sweet", "chocolate"])
          ) {
            score += 20;

            reasons.push("Similar to the dessert style you requested");
          }
        }
      }

      // ==================================================
      // DIRECT FOOD WORD MATCH
      // ==================================================

      const promptWords = prompt
        .split(/\s+/)
        .map((word) => word.replace(/[^a-z0-9]/gi, ""))
        .filter((word) => word.length >= 3);

      let directWordMatches = 0;

      promptWords.forEach((word) => {
        if (foodText.includes(word)) {
          directWordMatches += 1;
        }
      });

      if (directWordMatches > 0) {
        score += Math.min(directWordMatches * 5, 20);

        reasons.push("Matches words from your request");
      }

      // ==================================================
      // SURPRISE MODE
      // ==================================================
      // Surprise mode ko personalized banaya gaya hai.
      //
      // User history/favorites/budget/preferences ke
      // basis par score milta rahega.
      // ==================================================

      if (preferences.surprise) {
        score += Math.random() * 12;

        if (favoriteFoodIds.has(String(food._id))) {
          score += 5;
        }

        if (orderedFoodIds.has(String(food._id))) {
          score += 5;
        }

        reasons.push("Selected for your personalized Surprise Me request");
      }

      // ==================================================
      // DEFAULT SCORE
      // ==================================================

      score += 1;

      // ==================================================
      // REMOVE DUPLICATE REASONS
      // ==================================================

      const uniqueReasons = [...new Set(reasons)];

      // ==================================================
      // FINAL REASON
      // ==================================================

      let reason = uniqueReasons.slice(0, 3).join(". ");

      if (!reason) {
        reason = "Recommended based on your food request and restaurant menu.";
      }

      return {
        ...food.toObject(),
        score,
        reason,
      };
    });

    // ==================================================
    // SORT BY AI SCORE
    // ==================================================

    scoredFoods.sort((a, b) => {
      return b.score - a.score;
    });

    // ==================================================
    // TOP 5
    // ==================================================

    const recommendations = scoredFoods.slice(0, 5).map((food) => {
      // Score frontend ko nahi bhejna
      const { score, ...cleanFood } = food;

      return cleanFood;
    });

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.json({
      success: true,

      recommendations,

      personalization: {
        previousOrders: previousOrders.length,
        favorites: favorites.length,
        detectedBudget,
        selectedCategory,
        similarFoodType,
        preferences,
      },
    });
  } catch (error) {
    // ==================================================
    // SERVER ERROR
    // ==================================================

    console.error("AI recommendation error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while generating AI recommendations.",
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
