require("dotenv").config();

const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");

// Routes
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

// Express app
const app = express();

// Port
const PORT = 5000;

// ===============================
// MIDDLEWARE
// ===============================
///CORE SECURITY
///Only allow our React frontend to access our backend API
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
app.use(express.json());

// ===============================
// ROUTES
// ===============================
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);

// ===============================
// TEST ROUTE
// ===============================
app.get("/", (req, res) => {
  res.json({
    message: "AI Restaurant Backend is running! 🚀",
  });
});

// ===============================
// MONGODB CONNECTION
// ===============================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((error) => {
    console.log("❌ MongoDB connection failed:", error.message);
  });

// ===============================
// SERVER START
// ===============================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
