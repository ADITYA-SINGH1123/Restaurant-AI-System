const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// ===============================
// REGISTER USER
// ===============================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check all fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please fill all fields.",
      });
    }

    // Clean email
    const cleanEmail = email.trim().toLowerCase();

    // Check existing user
    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create customer
    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: "customer",
    });

    await newUser.save();

    res.status(201).json({
      message: "Registration successful!",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: "Server error.",
    });
  }
});

// ===============================
// LOGIN USER
// ===============================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter email and password.",
      });
    }

    // Clean email
    const cleanEmail = email.trim().toLowerCase();

    // Find user
    const user = await User.findOne({
      email: cleanEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Compare password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // User role
    const userRole = user.role || "customer";

    // Create JWT token
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

    // Login successful
    res.status(200).json({
      message: "Login successful!",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: userRole,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error.",
    });
  }
});

module.exports = router;
