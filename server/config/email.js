const nodemailer = require("nodemailer");

// ======================================================
// GMAIL EMAIL TRANSPORTER
// ======================================================
// Gmail App Password ka use karke email bhejenge.
// Normal Gmail password yahan use nahi karna hai.
const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    // Gmail address .env se aayega.
    user: process.env.EMAIL_USER,

    // Gmail App Password .env se aayega.
    pass: process.env.EMAIL_PASS,
  },
});

// ======================================================
// EXPORT EMAIL TRANSPORTER
// ======================================================
module.exports = transporter;
