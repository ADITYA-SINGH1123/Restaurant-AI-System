const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ===============================
// RAZORPAY INSTANCE
// ===============================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ===============================
// CREATE RAZORPAY ORDER
// ===============================
router.post("/create-order", protect, async (req, res) => {
  try {
    const { amount } = req.body;

    // Check amount
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Invalid payment amount.",
      });
    }

    // Convert rupees to paise
    const amountInPaise = Math.round(Number(amount) * 100);

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    // Create Razorpay order
    const order = await razorpay.orders.create(options);

    res.status(200).json({
      message: "Razorpay order created successfully.",
      order,
    });
  } catch (error) {
    console.error("Razorpay create order error:", error);

    res.status(500).json({
      message: "Failed to create Razorpay order.",
    });
  }
});

// ===============================
// VERIFY RAZORPAY PAYMENT
// ===============================
router.post("/verify", protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // Check required payment details
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        message: "Payment verification details are missing.",
      });
    }

    // Create signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Compare signatures
    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: "Payment verification failed.",
      });
    }

    // Payment verified
    res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    res.status(500).json({
      message: "Server error during payment verification.",
    });
  }
});

module.exports = router;
