import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// ======================================================
// CHANGE PASSWORD PAGE
// ======================================================
const ChangePassword = () => {
  const navigate = useNavigate();
  // ======================================================
  // LOGIN SECURITY CHECK
  // ======================================================
  // Agar user login nahi hai to Login page par bhejna
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Loading state
  const [loading, setLoading] = useState(false);

  // Success / Error messages
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ======================================================
  // HANDLE CHANGE PASSWORD
  // ======================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Purane messages clear
    setMessage("");
    setError("");

    // Check empty fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill all password fields.");
      return;
    }

    // Minimum password length
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    // Confirm password check
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      // JWT token localStorage se lena
      const token = localStorage.getItem("token");

      // Backend Change Password API
      const response = await fetch(
        "http://localhost:5000/api/auth/change-password",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            // JWT authentication
            Authorization: `Bearer ${token}`,
          },

          // Password data backend ko bhejna
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        },
      );

      const data = await response.json();

      // Backend error
      if (!response.ok) {
        throw new Error(data.message || "Password change failed.");
      }

      // Success message
      setMessage("Password changed successfully! 🎉");

      // Password fields clear
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      // Error message
      setError(err.message || "Unable to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center px-4 py-10">
      {/* ==================================================
          CHANGE PASSWORD CARD
      ================================================== */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Heading */}
        <h1 className="text-3xl font-bold text-center text-orange-600 mb-2">
          Change Password
        </h1>

        {/* Description */}
        <p className="text-center text-gray-600 mb-6">
          Update your account password securely.
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
            CHANGE PASSWORD FORM
        ================================================== */}
        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Current Password
          </label>

          <input
            type="password"
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 outline-none focus:border-orange-500"
          />

          {/* New Password */}
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            New Password
          </label>

          <input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 outline-none focus:border-orange-500"
          />

          {/* Confirm New Password */}
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Confirm New Password
          </label>

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-5 outline-none focus:border-orange-500"
          />

          {/* Change Password Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "Changing..." : "Change Password"}
          </button>
        </form>

        {/* ==================================================
            BACK TO PROFILE
        ================================================== */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/profile")}
            className="text-orange-600 font-semibold hover:text-orange-700"
          >
            ← Back to Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
