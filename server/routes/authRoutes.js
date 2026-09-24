const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");

// JWT protected routes ke liye common middleware.
const { protect } = require("../middleware/authMiddleware");

// Gmail email transporter.
const transporter = require("../config/email");

const router = express.Router();

// ======================================================
// VALIDATION HELPERS
// ======================================================

// Basic email format validation.
// Ye complete email verification nahi hai, sirf obvious
// invalid input ko reject karta hai.
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Password validation.
// bcrypt ki practical 72-byte limit ko dhyan mein rakhte
// hue password ko maximum 72 characters tak allow kar rahe hain.
const isValidPassword = (password) => {
  return (
    typeof password === "string" &&
    password.length >= 6 &&
    password.length <= 72
  );
};

// ======================================================
// REGISTER USER
// ======================================================

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Required fields check.
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Please fill all fields.",
      });
    }

    // Clean input.
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Name validation.
    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        message: "Name must be between 2 and 100 characters.",
      });
    }

    // Email validation.
    if (!isValidEmail(cleanEmail) || cleanEmail.length > 254) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    // Password validation.
    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: "Password must be between 6 and 72 characters.",
      });
    }

    // Check existing user.
    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists.",
      });
    }

    // Hash password.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create customer.
    const newUser = new User({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: "customer",
      loyaltyPoints: 0,
    });

    await newUser.save();

    // Registration successful.
    res.status(201).json({
      message: "Registration successful!",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        loyaltyPoints: newUser.loyaltyPoints,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    // Duplicate email race-condition handle.
    if (error.code === 11000) {
      return res.status(400).json({
        message: "User already exists.",
      });
    }

    res.status(500).json({
      message: "Server error.",
    });
  }
});

// ======================================================
// LOGIN USER
// ======================================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Required fields check.
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "Please enter email and password.",
      });
    }

    // Clean email.
    const cleanEmail = email.trim().toLowerCase();

    // Basic email validation.
    if (!isValidEmail(cleanEmail) || cleanEmail.length > 254) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Find user.
    const user = await User.findOne({
      email: cleanEmail,
    });

    // Same generic message use karo.
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Compare password.
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // User role.
    const userRole = user.role || "customer";

    // Create JWT token.
    const token = jwt.sign(
      {
        id: user._id,
        role: userRole,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    // Login successful.
    res.status(200).json({
      message: "Login successful!",
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: userRole,
        loyaltyPoints: user.loyaltyPoints || 0,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error.",
    });
  }
});

// ======================================================
// GET LOYALTY POINTS
// ======================================================
// Logged-in customer ka current loyalty points balance
// return karega.

router.get("/loyalty-points", protect, async (req, res) => {
  try {
    // protect middleware already JWT verify karke
    // req.user provide karta hai.
    const user = req.user;

    res.status(200).json({
      message: "Loyalty points fetched successfully.",
      loyaltyPoints: user.loyaltyPoints || 0,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Get loyalty points error:", error);

    res.status(500).json({
      message: "Unable to fetch loyalty points.",
    });
  }
});

// ======================================================
// UPDATE PROFILE
// ======================================================
// Logged-in user apna name aur phone update kar sakta hai.
//
// Security:
// - JWT token required.
// - Email update nahi hoga.
// - Password update nahi hoga.
// - Role update nahi hoga.
// - Loyalty points update nahi honge.

router.put("/profile", protect, async (req, res) => {
  try {
    const { name, phone } = req.body;

    // Name string hona chahiye.
    if (typeof name !== "string") {
      return res.status(400).json({
        message: "Name is required.",
      });
    }

    const cleanName = name.trim();

    // Name length validation.
    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        message: "Name must be between 2 and 100 characters.",
      });
    }

    // Phone optional hai.
    let cleanPhone = "";

    if (phone !== undefined && phone !== null) {
      if (typeof phone !== "string" && typeof phone !== "number") {
        return res.status(400).json({
          message: "Invalid phone number.",
        });
      }

      cleanPhone = String(phone).trim();

      // Basic phone length validation.
      if (cleanPhone.length > 20) {
        return res.status(400).json({
          message: "Phone number is too long.",
        });
      }
    }

    // req.user protect middleware se verified user hai.
    const user = req.user;

    // Sirf allowed fields update karo.
    user.name = cleanName;
    user.phone = cleanPhone;

    await user.save();

    // Success response.
    res.status(200).json({
      message: "Profile updated successfully.",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        loyaltyPoints: user.loyaltyPoints || 0,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      message: "Unable to update profile.",
    });
  }
});

// ======================================================
// FORGOT PASSWORD
// ======================================================
// User email enter karega aur email par temporary
// password reset link bheja jayega.
//
// Security:
// Database mein actual reset token store nahi hota.
// Sirf SHA-256 hash store hota hai.

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Email required.
    if (typeof email !== "string") {
      return res.status(400).json({
        message: "Please enter your email.",
      });
    }

    // Clean email.
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail) || cleanEmail.length > 254) {
      // Account existence reveal nahi karna.
      return res.status(200).json({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // Find user.
    const user = await User.findOne({
      email: cleanEmail,
    });

    // User existence reveal nahi karenge.
    if (!user) {
      return res.status(200).json({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // ==================================================
    // CREATE RANDOM RESET TOKEN
    // ==================================================

    // Random token email link mein jayega.
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Database mein token ka SHA-256 hash store hoga.
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedResetToken;

    // Token 15 minutes ke baad expire hoga.
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    // ==================================================
    // CREATE RESET LINK
    // ==================================================

    // Frontend ko raw token milega.
    // Database mein iska hash stored hai.
    const resetLink = `http://localhost:5173/reset-password/${resetToken}`;

    // ==================================================
    // SEND RESET EMAIL
    // ==================================================

    await transporter.sendMail({
      from: `"RK Restaurant" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "RK Restaurant - Password Reset",

      text:
        `Hello ${user.name},\n\n` +
        `You requested a password reset for your RK Restaurant account.\n\n` +
        `Reset your password using this link:\n${resetLink}\n\n` +
        `This link will expire in 15 minutes.\n\n` +
        `If you did not request this, you can ignore this email.`,
    });

    // Generic success response.
    res.status(200).json({
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    res.status(500).json({
      message: "Unable to send password reset email.",
    });
  }
});

// ======================================================
// RESET PASSWORD
// ======================================================
// Email ke reset token ke through new password set hoga.

router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Token required.
    if (typeof token !== "string" || token.length !== 64) {
      return res.status(400).json({
        message: "Password reset link is invalid or expired.",
      });
    }

    // New password required.
    if (typeof password !== "string") {
      return res.status(400).json({
        message: "Please enter a new password.",
      });
    }

    // Password validation.
    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: "Password must be between 6 and 72 characters.",
      });
    }

    // ==================================================
    // HASH TOKEN RECEIVED FROM EMAIL
    // ==================================================

    const hashedResetToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Token aur expiry check.
    const user = await User.findOne({
      resetPasswordToken: hashedResetToken,
      resetPasswordExpire: {
        $gt: new Date(),
      },
    });

    // Token invalid ya expired.
    if (!user) {
      return res.status(400).json({
        message: "Password reset link is invalid or expired.",
      });
    }

    // New password hash karo.
    const hashedPassword = await bcrypt.hash(password, 10);

    // New password save karo.
    user.password = hashedPassword;

    // Reset token immediately invalidate karo.
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;

    await user.save();

    // Success response.
    res.status(200).json({
      message: "Password reset successfully. You can now login.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    res.status(500).json({
      message: "Unable to reset password.",
    });
  }
});

// ======================================================
// CHANGE PASSWORD
// ======================================================
// Logged-in user apna current password verify karke
// new password set kar sakta hai.

router.post("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Required fields check.
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string"
    ) {
      return res.status(400).json({
        message: "Please enter current and new password.",
      });
    }

    // New password validation.
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        message: "New password must be between 6 and 72 characters.",
      });
    }

    // Current aur new password same nahi hone chahiye.
    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from current password.",
      });
    }

    // ==================================================
    // IMPORTANT FIX
    // ==================================================
    // protect middleware security ke liye req.user se
    // password exclude karta hai.
    //
    // Isliye req.user.password use nahi karna hai.
    // Fresh database query se password field available hogi.
    const user = await User.findById(req.user._id);

    // User agar database se delete ho gaya ho to handle karo.
    if (!user) {
      return res.status(401).json({
        message: "User account no longer exists.",
      });
    }

    // Current password verify.
    const isCurrentPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordCorrect) {
      return res.status(401).json({
        message: "Current password is incorrect.",
      });
    }

    // New password hash.
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Save new password.
    user.password = hashedNewPassword;

    await user.save();

    // Success response.
    res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).json({
      message: "Unable to change password.",
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
