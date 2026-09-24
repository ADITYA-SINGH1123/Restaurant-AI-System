const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ======================================================
// VERIFY LOGIN TOKEN
// ======================================================
// Ye middleware JWT token ko verify karega.
//
// Important:
// JWT se user ID lekar MongoDB se actual user find
// kiya jayega aur req.user mein complete user milega.
// Isse req.user._id properly available rahega.
// ======================================================

const protect = async (req, res, next) => {
  try {
    // Authorization header
    const authHeader = req.headers.authorization;

    // Token check
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    // Bearer ke baad actual token
    const token = authHeader.split(" ")[1];

    // JWT verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ==================================================
    // USER FIND
    // ==================================================
    // JWT ke andar user ID different field name se ho
    // sakti hai, isliye common possibilities check kar rahe hain.

    const userId = decoded._id || decoded.id || decoded.userId;

    // User ID available nahi hai
    if (!userId) {
      return res.status(401).json({
        message: "Invalid token: user ID not found.",
      });
    }

    // MongoDB se actual user find karo
    const user = await User.findById(userId).select("-password");

    // User exist nahi karta
    if (!user) {
      return res.status(401).json({
        message: "User not found.",
      });
    }

    // Complete user request mein save karo
    req.user = user;

    // Next middleware / route
    next();
  } catch (error) {
    console.error("❌ Authentication error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

// ======================================================
// ADMIN ONLY
// ======================================================
// Sirf admin user ko access milega.
// ======================================================

const adminOnly = (req, res, next) => {
  // User available nahi hai
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required.",
    });
  }

  // Admin allowed
  next();
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  protect,
  adminOnly,
};
