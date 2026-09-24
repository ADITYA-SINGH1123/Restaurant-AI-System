import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// ======================================================
// REGISTER COMPONENT
// ======================================================
// New user registration page.
//
// Features:
// - Backend registration
// - Form validation
// - Password show/hide
// - Confirm password
// - Loading state
// - Error message UI
// - Professional responsive design
// ======================================================

function Register() {
  const navigate = useNavigate();

  // ====================================================
  // FORM STATES
  // ====================================================
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Error message
  const [errorMessage, setErrorMessage] = useState("");

  // ====================================================
  // REGISTER HANDLER
  // ====================================================
  const handleRegister = async (e) => {
    e.preventDefault();

    // Clear previous error
    setErrorMessage("");

    // ==================================================
    // BASIC VALIDATION
    // ==================================================
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMessage("Please fill in all details.");
      return;
    }

    // Password length validation
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    // Password match validation
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // ==================================================
      // SEND REGISTRATION DATA TO BACKEND
      // ==================================================
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      // ==================================================
      // REGISTRATION FAILED
      // ==================================================
      if (!response.ok) {
        setErrorMessage(data.message || "Registration failed.");
        return;
      }

      // ==================================================
      // REGISTRATION SUCCESS
      // ==================================================
      alert("✅ Account created successfully!");

      // Redirect to login
      navigate("/login");
    } catch (error) {
      console.error("Register error:", error);

      // Server connection error
      setErrorMessage(
        "Cannot connect to server. Please make sure the backend is running.",
      );
    } finally {
      // Stop loading
      setLoading(false);
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50 px-5 py-12 sm:px-6 lg:px-8">
      {/* ==================================================
          BACKGROUND DECORATIONS
      ================================================== */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl"></div>

      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl"></div>

      {/* ==================================================
          MAIN REGISTER AREA
      ================================================== */}
      <div className="relative z-10 mx-auto flex min-h-[75vh] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl lg:grid-cols-2">
          {/* ==================================================
              LEFT BRAND SECTION
          ================================================== */}
          <div className="relative hidden overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-10 text-white lg:flex lg:min-h-[680px] lg:flex-col lg:justify-between">
            {/* Decorative circles */}
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10"></div>

            <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-white/10"></div>

            {/* Brand content */}
            <div className="relative z-10">
              {/* Restaurant logo */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-4xl shadow-lg backdrop-blur-sm">
                🍽️
              </div>

              <p className="mt-8 text-sm font-bold uppercase tracking-[0.3em] text-orange-100">
                Join Us
              </p>

              <h2 className="mt-3 text-5xl font-black leading-tight">
                RK
                <br />
                Restaurant
              </h2>

              <div className="mt-6 h-1 w-16 rounded-full bg-white"></div>

              <p className="mt-6 max-w-md text-base leading-7 text-orange-50">
                Create your account and enjoy delicious food, smart
                recommendations and simple online ordering.
              </p>
            </div>

            {/* Features */}
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  🤖
                </span>

                <span className="text-sm font-semibold">
                  Personalized AI recommendations
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  🍴
                </span>

                <span className="text-sm font-semibold">
                  Explore delicious food
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  🛒
                </span>

                <span className="text-sm font-semibold">
                  Easy and secure ordering
                </span>
              </div>
            </div>
          </div>

          {/* ==================================================
              RIGHT REGISTER FORM
          ================================================== */}
          <div className="flex items-center p-6 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              {/* ==================================================
                  MOBILE LOGO
              ================================================== */}
              <div className="mb-8 text-center lg:hidden">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-4xl">
                  🍽️
                </div>

                <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-orange-600">
                  RK Restaurant
                </p>
              </div>

              {/* ==================================================
                  HEADING
              ================================================== */}
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">
                  Create Account
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                  Join RK Restaurant 🍽️
                </h1>

                <p className="mt-3 text-sm leading-6 text-gray-500 sm:text-base">
                  Create your account and start your delicious journey.
                </p>
              </div>

              {/* ==================================================
                  ERROR MESSAGE
              ================================================== */}
              {errorMessage && (
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <span className="text-lg">⚠️</span>

                  <p className="leading-5">{errorMessage}</p>
                </div>
              )}

              {/* ==================================================
                  REGISTER FORM
              ================================================== */}
              <form onSubmit={handleRegister} className="mt-8 space-y-5">
                {/* ==================================================
                    FULL NAME
                ================================================== */}
                <div>
                  <label
                    htmlFor="register-name"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Full Name
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                      👤
                    </span>

                    <input
                      id="register-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-gray-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>

                {/* ==================================================
                    EMAIL
                ================================================== */}
                <div>
                  <label
                    htmlFor="register-email"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Email Address
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                      ✉️
                    </span>

                    <input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-gray-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>

                {/* ==================================================
                    PASSWORD
                ================================================== */}
                <div>
                  <label
                    htmlFor="register-password"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                      🔒
                    </span>

                    <input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="Create a password"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-14 text-gray-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />

                    {/* Show / Hide Password */}
                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1.5 text-lg transition hover:bg-gray-100"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-gray-400">
                    Password must contain at least 6 characters.
                  </p>
                </div>

                {/* ==================================================
                    CONFIRM PASSWORD
                ================================================== */}
                <div>
                  <label
                    htmlFor="register-confirm-password"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Confirm Password
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                      🔐
                    </span>

                    <input
                      id="register-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-14 text-gray-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />

                    {/* Show / Hide Confirm Password */}
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((previous) => !previous)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1.5 text-lg transition hover:bg-gray-100"
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {/* ==================================================
                    REGISTER BUTTON
                ================================================== */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3.5 font-bold text-white shadow-lg shadow-orange-200 transition duration-300 hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      {/* Loading spinner */}
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                      Creating Account...
                    </>
                  ) : (
                    <>📝 Create Account</>
                  )}
                </button>
              </form>

              {/* ==================================================
                  SECURITY NOTE
              ================================================== */}
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                <span>🔒</span>
                <span>Your account information is securely handled</span>
              </div>

              {/* ==================================================
                  LOGIN DIVIDER
              ================================================== */}
              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-gray-200"></div>

                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Already registered?
                </span>

                <div className="h-px flex-1 bg-gray-200"></div>
              </div>

              {/* ==================================================
                  LOGIN BUTTON
              ================================================== */}
              <Link
                to="/login"
                className="flex w-full items-center justify-center rounded-xl border-2 border-gray-200 py-3 font-bold text-gray-700 transition duration-300 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
              >
                🔐 Login to Your Account
              </Link>

              {/* ==================================================
                  BACK HOME
              ================================================== */}
              <div className="mt-5 text-center">
                <Link
                  to="/"
                  className="text-sm font-semibold text-gray-400 transition hover:text-orange-600"
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Register;
