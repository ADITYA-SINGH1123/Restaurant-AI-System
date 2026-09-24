// ======================================================
// REVIEW ROUTES
// ======================================================
// Ye routes food ratings aur reviews ko handle karenge.
//
// Features:
// 1. Food ke reviews dekhna
// 2. Logged-in customer review add karna
// 3. Sirf purchased food ko review karna
// 4. Same customer same food par duplicate review
//    nahi de sakta
// 5. Rating 1-5 validation
// 6. Apna review hi delete kar sakta hai
// ======================================================

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const Review = require("../models/Review");
const Food = require("../models/Food");
const Order = require("../models/Order");

const router = express.Router();

// ======================================================
// AUTHENTICATION MIDDLEWARE
// ======================================================
// JWT token se userId nikalta hai.
// ======================================================

const protect = (req, res, next) => {
  try {
    // Authorization header check
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Bearer token se actual token nikalo
    const token = authHeader.split(" ")[1];

    // JWT verify karo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // User ID request mein save karo
    req.userId = decoded.userId || decoded.id || decoded._id;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

// ======================================================
// GET REVIEWS FOR A FOOD
// ======================================================
// URL:
// GET /api/reviews/food/:foodId
//
// Login ke bina bhi reviews dekh sakte hain.
// ======================================================

router.get("/food/:foodId", async (req, res) => {
  try {
    const { foodId } = req.params;

    // Food ID valid hai ya nahi
    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID.",
      });
    }

    // Food exist karta hai ya nahi
    const food = await Food.findById(foodId);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found.",
      });
    }

    // Reviews fetch karo
    const reviews = await Review.find({ foodId })
      .populate("userId", "name")
      .sort({ createdAt: -1 });

    // Average rating calculate karo
    const totalReviews = reviews.length;

    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
        : 0;

    return res.status(200).json({
      success: true,
      reviews,
      totalReviews,
      averageRating: Number(averageRating.toFixed(1)),
    });
  } catch (error) {
    console.error("Get reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews.",
    });
  }
});

// ======================================================
// ADD REVIEW
// ======================================================
// URL:
// POST /api/reviews
//
// Login required.
//
// IMPORTANT SECURITY:
// Customer tabhi review kar sakta hai jab usne
// actually ye food order kiya ho.
// ======================================================

router.post("/", protect, async (req, res) => {
  try {
    const { foodId, rating, comment } = req.body;

    // ==================================================
    // BASIC VALIDATION
    // ==================================================

    if (!foodId || rating === undefined || !comment) {
      return res.status(400).json({
        success: false,
        message: "Food, rating and comment are required.",
      });
    }

    // Food ID validation
    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID.",
      });
    }

    // Rating number mein convert karo
    const numericRating = Number(rating);

    // Rating 1-5 honi chahiye
    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a whole number between 1 and 5.",
      });
    }

    // Comment clean karo
    const cleanComment = String(comment).trim();

    // Comment length validation
    if (cleanComment.length < 2 || cleanComment.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Review must be between 2 and 500 characters.",
      });
    }

    // ==================================================
    // CHECK FOOD
    // ==================================================

    const food = await Food.findById(foodId);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found.",
      });
    }

    // ==================================================
    // PURCHASE VERIFICATION
    // ==================================================
    // Customer ke delivered/previous orders check karenge.
    //
    // Kisi bhi valid order ke items mein requested
    // foodId mil gaya to customer ne food purchase kiya hai.
    // ==================================================q
    // Sirf successfully paid aur delivered orders check honge.
    // Customer ko food deliver hone ke baad hi review dene diya jayega.

    const customerOrders = await Order.find({
      userId: req.userId,
      paymentStatus: "Paid",
      status: "Delivered",
    }).select("items status");

    // Food ID ko string format mein rakho
    const requestedFoodId = String(foodId);

    // Check karo kya customer ke kisi paid order mein
    // ye food present hai.
    const hasPurchasedFood = customerOrders.some((order) => {
      if (!Array.isArray(order.items)) {
        return false;
      }

      return order.items.some((item) => {
        // ==================================================
        // ITEM FOOD ID SUPPORT
        // ==================================================
        // Normal expected field: foodId
        // Fallback fields: _id / id
        //
        // Isse existing orders ke structure ke saath
        // compatibility bani rahegi.
        // ==================================================

        const itemFoodId = item?.foodId ?? item?._id ?? item?.id;

        return itemFoodId && String(itemFoodId) === requestedFoodId;
      });
    });

    // Agar food purchase nahi kiya
    if (!hasPurchasedFood) {
      return res.status(403).json({
        success: false,
        message: "You can review only food that you have ordered.",
      });
    }

    // ==================================================
    // CHECK DUPLICATE REVIEW
    // ==================================================
    // Ek customer same food ko sirf ek baar review
    // kar sakta hai.
    // ==================================================

    const existingReview = await Review.findOne({
      foodId,
      userId: req.userId,
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this food.",
      });
    }

    // ==================================================
    // CREATE REVIEW
    // ==================================================

    const review = await Review.create({
      foodId,
      userId: req.userId,
      rating: numericRating,
      comment: cleanComment,
    });

    // User ka naam response mein bhejne ke liye populate
    await review.populate("userId", "name");

    return res.status(201).json({
      success: true,
      message: "Review added successfully.",
      review,
    });
  } catch (error) {
    // ==================================================
    // DUPLICATE INDEX ERROR
    // ==================================================

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this food.",
      });
    }

    console.error("Add review error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add review.",
    });
  }
});

// ======================================================
// DELETE REVIEW
// ======================================================
// User sirf apna review delete kar sakta hai.
//
// URL:
// DELETE /api/reviews/:reviewId
// ======================================================

router.delete("/:reviewId", protect, async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Review ID validation
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID.",
      });
    }

    // Sirf apna review delete kar sakta hai
    const review = await Review.findOneAndDelete({
      _id: reviewId,
      userId: req.userId,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or you are not allowed to delete it.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully.",
    });
  } catch (error) {
    console.error("Delete review error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete review.",
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
