// ======================================================
// RK RESTAURANT BACKEND SERVER
// ======================================================
// Ye file Express server, MongoDB aur Socket.io ko
// setup karti hai.
// Socket.io ka use real-time order tracking aur
// private notifications ke liye hota hai.

require("dotenv").config();

const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

// Order model
// Order room join karne se pehle ownership verify karne ke liye.
const Order = require("./models/Order");

// ======================================================
// ROUTES
// ======================================================

const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const foodRoutes = require("./routes/foodRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

// Favorite routes
const favoriteRoutes = require("./routes/favoriteRoutes");

// AI routes
const aiRoutes = require("./routes/aiRoutes");

// AI History routes
const aiHistoryRoutes = require("./routes/aiHistoryRoutes");

// Reservation routes
const reservationRoutes = require("./routes/reservationRoutes");

// Combo Offer routes
const comboRoutes = require("./routes/comboRoutes");

// Inventory History routes
const inventoryHistoryRoutes = require("./routes/inventoryHistoryRoutes");

// Notification routes
const notificationRoutes = require("./routes/notificationRoutes");
const chatRoutes = require("./routes/chatRoutes");

// ======================================================
// EXPRESS APP
// ======================================================

const app = express();

const PORT = 5000;

// ======================================================
// HTTP SERVER
// ======================================================

// Express app ko HTTP server ke andar run karna.
// Socket.io isi HTTP server ke saath connect hoga.
const server = http.createServer(app);

// ======================================================
// SOCKET.IO SERVER
// ======================================================

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// ======================================================
// SOCKET.IO CONNECTION
// ======================================================

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // ====================================================
  // JOIN ORDER ROOM
  // ====================================================
  // Customer ko order room mein join karne se pehle:
  // 1. JWT token verify hoga.
  // 2. Token user ID nikali jayegi.
  // 3. Order database se find hoga.
  // 4. Order ka owner token user se match hoga.
  //
  // Isse koi customer kisi doosre customer ke order
  // ke real-time updates nahi sun sakta.

  socket.on("joinOrderRoom", async (orderId) => {
    try {
      // Order ID required hai.
      if (!orderId) {
        console.log("⚠️ Order room join rejected: orderId missing");
        return;
      }

      // Socket connection ke authentication data se JWT lena.
      const token = socket.handshake.auth?.token;

      if (!token) {
        console.log("⚠️ Order room join rejected: token missing");
        return;
      }

      // JWT verify karo.
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // JWT payload se user ID.
      const tokenUserId = decoded.id || decoded._id || decoded.userId;

      if (!tokenUserId) {
        console.log("⚠️ Order room join rejected: user ID missing");
        return;
      }

      // Database se order find karo.
      // orderId wahi public/business order ID hai
      // jiske naam se Socket.io room banaya ja raha hai.
      const order = await Order.findOne({ orderId }).select("orderId userId");

      if (!order) {
        console.log(
          `⚠️ Order room join rejected: order not found (${orderId})`,
        );
        return;
      }

      // ==================================================
      // ORDER OWNERSHIP SECURITY CHECK
      // ==================================================
      // Sirf order ka owner hi us order ke private
      // Socket.io room mein join kar sakta hai.

      if (String(order.userId) !== String(tokenUserId)) {
        console.log(`⚠️ Unauthorized order room attempt: ${orderId}`);
        return;
      }

      // Secure order room.
      const roomName = `order-${order.orderId}`;

      socket.join(roomName);

      console.log(`📦 Socket joined secure order room: ${roomName}`);
    } catch (error) {
      console.error("❌ Order room authentication failed:", error.message);
    }
  });

  // ======================================================
  // USER NOTIFICATION ROOM
  // ======================================================
  // Logged-in customer ko uske personal notification room
  // mein join karaya jayega.
  //
  // Token se user ID verify ki ja rahi hai taaki koi
  // customer kisi doosre customer ki notifications
  // na sun sake.

  socket.on("joinUserRoom", (userId) => {
    try {
      // Client se user ID aur JWT token lena.
      const token = socket.handshake.auth?.token;

      if (!token || !userId) {
        console.log("⚠️ User notification room join rejected");
        return;
      }

      // JWT verify karo.
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // JWT payload se user ID.
      const tokenUserId = decoded.id || decoded._id || decoded.userId;

      // Security check:
      // Client ki user ID JWT wali user ID se match honi chahiye.
      if (!tokenUserId || String(tokenUserId) !== String(userId)) {
        console.log("⚠️ Unauthorized notification room attempt");
        return;
      }

      // Personal notification room.
      const roomName = `user-${userId}`;

      socket.join(roomName);

      console.log(`🔔 Socket joined notification room: ${roomName}`);
    } catch (error) {
      console.error(
        "❌ Notification room authentication failed:",
        error.message,
      );
    }
  });

  // ====================================================
  // SOCKET DISCONNECT
  // ====================================================

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

// ======================================================
// MAKE SOCKET.IO AVAILABLE TO EXPRESS REQUESTS
// ======================================================

// orderRoutes ke andar req.app.get("io") se
// Socket.io instance access kiya ja sakta hai.
app.set("io", io);

// ======================================================
// MIDDLEWARE
// ======================================================

// Frontend ko backend API access karne ki permission.
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

// JSON request body read karne ke liye.
app.use(express.json());

// ======================================================
// API ROUTES
// ======================================================

// Authentication
app.use("/api/auth", authRoutes);

// Orders
app.use("/api/orders", orderRoutes);

// Payments
app.use("/api/payment", paymentRoutes);

// Foods
app.use("/api/foods", foodRoutes);

// Reviews
app.use("/api/reviews", reviewRoutes);

// Favorites
app.use("/api/favorites", favoriteRoutes);

// AI Recommendations
app.use("/api/ai", aiRoutes);

// AI Recommendation History
app.use("/api/ai-history", aiHistoryRoutes);

// Reservations
app.use("/api/reservations", reservationRoutes);

// Combo Offers
app.use("/api/combos", comboRoutes);

// Inventory Stock History
app.use("/api/inventory-history", inventoryHistoryRoutes);

// Notifications
app.use("/api/notifications", notificationRoutes);
// Chat Support
app.use("/api/chat", chatRoutes);

// ======================================================
// TEST ROUTE
// ======================================================

app.get("/", (req, res) => {
  res.json({
    message: "RK Restaurant Backend is running! 🚀",
  });
});

// ======================================================
// MONGODB CONNECTION
// ======================================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((error) => {
    console.log("❌ MongoDB connection failed:", error.message);
  });

// ======================================================
// START SERVER
// ======================================================

// Socket.io ke saath server.listen() use karna hai.
// app.listen() nahi.
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("🟢 Socket.io server is ready");
});
