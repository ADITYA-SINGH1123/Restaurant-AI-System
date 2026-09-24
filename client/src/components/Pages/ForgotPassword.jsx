import { useState } from "react";
import { Link } from "react-router-dom";

// ======================================================
// FORGOT PASSWORD PAGE
// ======================================================
const ForgotPassword = () => {
  // Email input ke liye state
  const [email, setEmail] = useState("");

  // Loading state
  const [loading, setLoading] = useState(false);

  // Success message
  const [message, setMessage] = useState("");

  // Error message
  const [error, setError] = useState("");

  // ======================================================
  // HANDLE FORGOT PASSWORD
  // ======================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Purane messages clear
    setMessage("");
    setError("");

    // Email empty check
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    try {
      setLoading(true);

      // Backend ko forgot-password request
      const response = await fetch(
        "http://localhost:5000/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      // Success message
      setMessage(
        "If an account exists with this email, a password reset link has been sent.",
      );

      // Input clear
      setEmail("");
    } catch (err) {
      setError(err.message || "Unable to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center px-4">
      {/* ==================================================
          FORGOT PASSWORD CARD
      ================================================== */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Heading */}
        <h1 className="text-3xl font-bold text-center text-orange-600 mb-2">
          Forgot Password
        </h1>

        {/* Description */}
        <p className="text-center text-gray-600 mb-6">
          Enter your registered email to receive a password reset link.
        </p>

        {/* ==================================================
            SUCCESS MESSAGE
        ================================================== */}
        {message && (
          <div className="mb-4 rounded-lg bg-green-100 text-green-700 p-3 text-sm">
            {message}
          </div>
        )}

        {/* ==================================================
            ERROR MESSAGE
        ================================================== */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-100 text-red-700 p-3 text-sm">
            {error}
          </div>
        )}

        {/* ==================================================
            FORGOT PASSWORD FORM
        ================================================== */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email Address
          </label>

          <input
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-5 outline-none focus:border-orange-500"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {/* ==================================================
            BACK TO LOGIN
        ================================================== */}
        <div className="text-center mt-6">
          <Link
            to="/login"
            className="text-orange-600 font-semibold hover:text-orange-700"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
