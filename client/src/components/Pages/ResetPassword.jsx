import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

// ======================================================
// RESET PASSWORD PAGE
// ======================================================
const ResetPassword = () => {
  // URL se reset token receive karna
  const { token } = useParams();

  // Password states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Loading state
  const [loading, setLoading] = useState(false);

  // Messages
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Page navigation
  const navigate = useNavigate();

  // ======================================================
  // HANDLE PASSWORD RESET
  // ======================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Purane messages clear
    setMessage("");
    setError("");

    // Password empty check
    if (!password || !confirmPassword) {
      setError("Please enter both passwords.");
      return;
    }

    // Minimum password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // Password matching check
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      // Backend reset-password API
      const response = await fetch(
        `http://localhost:5000/api/auth/reset-password/${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Password reset failed.");
      }

      // Success message
      setMessage("Password reset successfully! Redirecting to login...");

      // Password fields clear
      setPassword("");
      setConfirmPassword("");

      // Login page par redirect
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center px-4">
      {/* ==================================================
          RESET PASSWORD CARD
      ================================================== */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Heading */}
        <h1 className="text-3xl font-bold text-center text-orange-600 mb-2">
          Reset Password
        </h1>

        {/* Description */}
        <p className="text-center text-gray-600 mb-6">
          Enter your new password below.
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
            RESET PASSWORD FORM
        ================================================== */}
        <form onSubmit={handleSubmit}>
          {/* New Password */}
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            New Password
          </label>

          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 outline-none focus:border-orange-500"
          />

          {/* Confirm Password */}
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Confirm Password
          </label>

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-5 outline-none focus:border-orange-500"
          />

          {/* Reset Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset Password"}
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

export default ResetPassword;
