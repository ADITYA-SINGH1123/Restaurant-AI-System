const express = require("express");
const Order = require("../models/Order");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// CREATE NEW ORDER
// CUSTOMER MUST BE LOGGED IN
// ======================================================
router.post("/create", protect, async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      items,
      totalAmount,

      // Payment details
      paymentId,
      razorpayOrderId,
      razorpaySignature,
    } = req.body;

    // ======================================================
    // CHECK REQUIRED ORDER DETAILS
    // ======================================================
    if (
      !name ||
      !phone ||
      !address ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0 ||
      totalAmount === undefined
    ) {
      return res.status(400).json({
        message: "Please provide all order details.",
      });
    }

    // ======================================================
    // CHECK PAYMENT DETAILS
    // ======================================================
    if (!paymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({
        message: "Payment details are missing.",
      });
    }

    // ======================================================
    // USER ID FROM VERIFIED JWT
    // ======================================================
    const userId = req.user.id;

    // ======================================================
    // GENERATE ORDER ID
    // ======================================================
    const orderId = "AI-" + Math.floor(100000 + Math.random() * 900000);

    // ======================================================
    // CREATE NEW ORDER
    // ======================================================
    const newOrder = new Order({
      orderId,
      userId,

      // Customer details
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),

      // Food items
      items,

      // Amount
      totalAmount: Number(totalAmount),

      // ====================================================
      // PAYMENT DETAILS
      // ====================================================
      paymentId,
      razorpayOrderId,
      razorpaySignature,

      // Payment successful
      paymentStatus: "Paid",

      // ====================================================
      // INITIAL ORDER STATUS
      // ====================================================
      status: "Order Placed",

      // ====================================================
      // STATUS HISTORY
      // ====================================================
      statusHistory: [
        {
          status: "Order Placed",
          changedAt: new Date(),
        },
      ],
    });

    // ======================================================
    // SAVE ORDER TO MONGODB
    // ======================================================
    await newOrder.save();

    // ======================================================
    // SUCCESS RESPONSE
    // ======================================================
    res.status(201).json({
      message: "Order placed successfully!",
      order: newOrder,
    });
  } catch (error) {
    console.error("Create order error:", error);

    res.status(500).json({
      message: "Server error while creating order.",
    });
  }
});

// ======================================================
// GET ALL ORDERS
// ADMIN ONLY
// ======================================================
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    res.status(200).json({
      orders,
    });
  } catch (error) {
    console.error("Fetch orders error:", error);

    res.status(500).json({
      message: "Server error while fetching orders.",
    });
  }
});

// ======================================================
// UPDATE ORDER STATUS
// ADMIN ONLY
// ======================================================
router.put("/:orderId/status", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    // Allowed statuses
    const allowedStatuses = [
      "Order Placed",
      "Preparing",
      "Out for Delivery",
      "Delivered",
    ];

    // Check status
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    // Find order
    const order = await Order.findOne({
      orderId: req.params.orderId,
    });

    // Order not found
    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    // ======================================================
    // PROTECT CANCELLED ORDER
    // ======================================================
    if (order.status === "Cancelled") {
      return res.status(400).json({
        message: "Cancelled orders cannot be updated.",
      });
    }

    // ======================================================
    // PROTECT DELIVERED ORDER
    // ======================================================
    if (order.status === "Delivered") {
      return res.status(400).json({
        message: "Delivered orders cannot be updated.",
      });
    }

    // ======================================================
    // SAME STATUS CHECK
    // ======================================================
    if (order.status === status) {
      return res.status(400).json({
        message: "Order is already in this status.",
      });
    }

    // ======================================================
    // OLD ORDER SAFETY
    // ======================================================
    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }

    // ======================================================
    // UPDATE CURRENT STATUS
    // ======================================================
    order.status = status;

    // ======================================================
    // ADD STATUS HISTORY
    // ======================================================
    order.statusHistory.push({
      status,
      changedAt: new Date(),
    });

    // Save
    await order.save();

    res.status(200).json({
      message: "Order status updated successfully.",
      order,
    });
  } catch (error) {
    console.error("Update status error:", error);

    res.status(500).json({
      message: "Server error while updating order status.",
    });
  }
});

// ======================================================
// CANCEL ORDER
// LOGGED-IN USER
// ======================================================
router.put("/:orderId/cancel", protect, async (req, res) => {
  try {
    // Find order
    const order = await Order.findOne({
      orderId: req.params.orderId,
    });

    // Order not found
    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    // ======================================================
    // CUSTOMER CAN CANCEL ONLY OWN ORDER
    // ADMIN CAN CANCEL ANY ORDER
    // ======================================================
    if (
      req.user.role !== "admin" &&
      order.userId.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        message: "You can only cancel your own order.",
      });
    }

    // ======================================================
    // DELIVERED ORDER CANNOT BE CANCELLED
    // ======================================================
    if (order.status === "Delivered") {
      return res.status(400).json({
        message: "Delivered orders cannot be cancelled.",
      });
    }

    // ======================================================
    // ALREADY CANCELLED
    // ======================================================
    if (order.status === "Cancelled") {
      return res.status(400).json({
        message: "Order is already cancelled.",
      });
    }

    // ======================================================
    // OLD ORDER SAFETY
    // ======================================================
    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }

    // ======================================================
    // UPDATE STATUS
    // ======================================================
    order.status = "Cancelled";

    // ======================================================
    // ADD CANCELLATION HISTORY
    // ======================================================
    order.statusHistory.push({
      status: "Cancelled",
      changedAt: new Date(),
    });

    // Save
    await order.save();

    res.status(200).json({
      message: "Order cancelled successfully.",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);

    res.status(500).json({
      message: "Server error while cancelling order.",
    });
  }
});

// ======================================================
// GET ORDERS FOR LOGGED-IN USER
// CUSTOMER SEES ONLY OWN ORDERS
// ======================================================
router.get("/user/:userId", protect, async (req, res) => {
  try {
    // ======================================================
    // CUSTOMER CAN ONLY VIEW OWN ORDERS
    // ADMIN CAN VIEW ANY USER'S ORDERS
    // ======================================================
    if (
      req.user.role !== "admin" &&
      req.user.id.toString() !== req.params.userId.toString()
    ) {
      return res.status(403).json({
        message: "You can only view your own orders.",
      });
    }

    // Find user's orders
    const orders = await Order.find({
      userId: req.params.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      orders,
    });
  } catch (error) {
    console.error("Fetch user orders error:", error);

    res.status(500).json({
      message: "Server error while fetching user orders.",
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================
module.exports = router;
