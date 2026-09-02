import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  // ===============================
  // MOBILE MENU
  // ===============================
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ===============================
  // LOGOUT MODAL
  // ===============================
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ===============================
  // LOGGED-IN USER
  // ===============================
  const [loggedInUser, setLoggedInUser] = useState(() => {
    return JSON.parse(localStorage.getItem("loggedInUser")) || null;
  });

  // ===============================
  // UPDATE NAVBAR AFTER LOGIN/LOGOUT
  // ===============================
  useEffect(() => {
    const handleStorageChange = () => {
      const user = JSON.parse(localStorage.getItem("loggedInUser")) || null;

      setLoggedInUser(user);
    };

    window.addEventListener("storage", handleStorageChange);

    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // ===============================
  // OPEN LOGOUT MODAL
  // ===============================
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  // ===============================
  // CLOSE LOGOUT MODAL
  // ===============================
  const handleCloseLogoutModal = () => {
    setShowLogoutModal(false);
  };

  // ===============================
  // CONFIRM LOGOUT
  // ONLY THIS FUNCTION LOGS OUT
  // ===============================
  const handleConfirmLogout = () => {
    // Remove logged-in user
    localStorage.removeItem("loggedInUser");

    // Remove JWT token
    localStorage.removeItem("token");

    // Update navbar
    setLoggedInUser(null);

    // Close mobile menu
    setIsMenuOpen(false);

    // Close logout modal
    setShowLogoutModal(false);

    // Go to home
    navigate("/");
  };

  return (
    <>
      {/* =====================================================
          NAVBAR
      ===================================================== */}
      <nav className="bg-white shadow-md">
        {/* ===============================
            MAIN NAVBAR
        =============================== */}
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-orange-600">
            🍽️ AI Restaurant
          </Link>

          {/* ===============================
              DESKTOP NAVIGATION
          =============================== */}
          <div className="hidden md:flex items-center gap-7">
            {/* Home */}
            <Link
              to="/"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              Home
            </Link>

            {/* Menu */}
            <Link
              to="/menu"
              className="text-gray-700 hover:text-orange-600 font-medium"
            >
              Menu
            </Link>

            {/* My Orders */}
            {loggedInUser && (
              <Link
                to="/orders"
                className="text-gray-700 hover:text-orange-600 font-medium"
              >
                📦 My Orders
              </Link>
            )}

            {/* Admin Panel */}
            {loggedInUser?.role === "admin" && (
              <Link
                to="/admin"
                className="text-gray-700 hover:text-orange-600 font-medium"
              >
                👑 Admin Panel
              </Link>
            )}

            {/* ===============================
                LOGIN / REGISTER
            =============================== */}
            {!loggedInUser ? (
              <>
                {/* Login */}
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-orange-600 font-medium"
                >
                  🔐 Login
                </Link>

                {/* Register */}
                <Link
                  to="/register"
                  className="bg-orange-600 text-white px-5 py-2 rounded-lg hover:bg-orange-700"
                >
                  📝 Register
                </Link>
              </>
            ) : (
              <>
                {/* User Name */}
                <span className="text-gray-700 font-semibold">
                  👤 {loggedInUser.name}
                </span>

                {/* Logout */}
                <button
                  onClick={handleLogoutClick}
                  className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600"
                >
                  🚪 Logout
                </button>
              </>
            )}
          </div>

          {/* ===============================
              MOBILE MENU BUTTON
          =============================== */}
          <button
            className="md:hidden text-2xl"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* ===============================
            MOBILE MENU
        =============================== */}
        {isMenuOpen && (
          <div className="md:hidden px-4 pb-4 border-t">
            {/* Home */}
            <Link
              to="/"
              className="block py-3 text-gray-700"
              onClick={() => setIsMenuOpen(false)}
            >
              🏠 Home
            </Link>

            {/* Menu */}
            <Link
              to="/menu"
              className="block py-3 text-gray-700"
              onClick={() => setIsMenuOpen(false)}
            >
              🍕 Menu
            </Link>

            {/* My Orders */}
            {loggedInUser && (
              <Link
                to="/orders"
                className="block py-3 text-gray-700"
                onClick={() => setIsMenuOpen(false)}
              >
                📦 My Orders
              </Link>
            )}

            {/* Admin Panel */}
            {loggedInUser?.role === "admin" && (
              <Link
                to="/admin"
                className="block py-3 text-gray-700"
                onClick={() => setIsMenuOpen(false)}
              >
                👑 Admin Panel
              </Link>
            )}

            {/* ===============================
                LOGIN / REGISTER
            =============================== */}
            {!loggedInUser ? (
              <>
                {/* Login */}
                <Link
                  to="/login"
                  className="block py-3 text-gray-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  🔐 Login
                </Link>

                {/* Register */}
                <Link
                  to="/register"
                  className="block py-3 text-orange-600 font-semibold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  📝 Register
                </Link>
              </>
            ) : (
              <>
                {/* User Name */}
                <div className="py-3 font-semibold text-gray-700">
                  👤 {loggedInUser.name}
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogoutClick}
                  className="w-full text-left py-3 text-red-600 font-semibold"
                >
                  🚪 Logout
                </button>
              </>
            )}
          </div>
        )}
      </nav>

      {/* =====================================================
          LOGOUT CONFIRMATION MODAL
      ===================================================== */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          {/* Modal */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            {/* ===============================
                CLOSE X BUTTON
                ONLY CLOSES MODAL
            =============================== */}
            <button
              onClick={handleCloseLogoutModal}
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold"
              aria-label="Close"
            >
              ✕
            </button>

            {/* Icon */}
            <div className="text-center text-5xl mb-4">👋</div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              Logout
            </h2>

            {/* Message */}
            <p className="text-gray-500 text-center mt-3">
              Are you sure you want to logout?
            </p>

            {/* ===============================
                BUTTONS
            =============================== */}
            <div className="flex gap-3 mt-6">
              {/* Cancel */}
              <button
                onClick={handleCloseLogoutModal}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-100"
              >
                Cancel
              </button>

              {/* Confirm Logout */}
              <button
                onClick={handleConfirmLogout}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
