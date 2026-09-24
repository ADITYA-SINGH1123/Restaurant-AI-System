import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// ======================================================
// LOGIN COMPONENT
// ======================================================
// User login page.
// - Backend authentication
// - JWT token storage
// - User information storage
// - Password show/hide
// - Loading state
// - Professional responsive UI
// ======================================================

function Login() {
  const navigate = useNavigate();

  // ====================================================
  // FORM STATES
  // ====================================================
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Error message
  const [errorMessage, setErrorMessage] = useState("");

  // ====================================================
  // LOGIN HANDLER
  // ====================================================
  const handleLogin = async (e) => {
    e.preventDefault();

    // Clear previous error
    setErrorMessage("");

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      // ================================================
      // BACKEND LOGIN API
      // ================================================
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      // ================================================
      // LOGIN FAILED
      // ================================================
      if (!response.ok) {
        setErrorMessage(data.message || "Invalid email or password.");
        return;
      }

      // ================================================
      // SAVE USER INFORMATION
      // ================================================
      const loggedInUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      };

      localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));

      // ================================================
      // SAVE JWT TOKEN
      // ================================================
      localStorage.setItem("token", data.token);

      // ================================================
      // SUCCESS
      // ================================================
      alert("✅ Login successful!");

      // Go to homepage
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);

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
          MAIN LOGIN AREA
      ================================================== */}
      <div className="relative z-10 mx-auto flex min-h-[75vh] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl lg:grid-cols-2">
          {/* ==================================================
              LEFT BRAND SECTION
          ================================================== */}
          <div className="relative hidden overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-10 text-white lg:flex lg:min-h-[620px] lg:flex-col lg:justify-between">
            {/* Decorative circles */}
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10"></div>

            <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-white/10"></div>

            <div className="relative z-10">
              {/* Restaurant Logo */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-4xl shadow-lg backdrop-blur-sm">
                🍽️
              </div>

              <p className="mt-8 text-sm font-bold uppercase tracking-[0.3em] text-orange-100">
                Welcome to
              </p>

              <h2 className="mt-3 text-5xl font-black leading-tight">
                RK
                <br />
                Restaurant
              </h2>

              <div className="mt-6 h-1 w-16 rounded-full bg-white"></div>

              <p className="mt-6 max-w-md text-base leading-7 text-orange-50">
                Delicious food, smart recommendations and easy ordering — all in
                one place.
              </p>
            </div>

            {/* Feature list */}
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  🤖
                </span>
                <span className="text-sm font-semibold">
                  AI-powered food recommendations
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  🛒
                </span>
                <span className="text-sm font-semibold">
                  Simple and fast online ordering
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  🔒
                </span>
                <span className="text-sm font-semibold">
                  Secure account authentication
                </span>
              </div>
            </div>
          </div>

          {/* ==================================================
              RIGHT LOGIN FORM
          ================================================== */}
          <div className="flex items-center p-6 sm:p-10 lg:p-12">
            <div className="w-full max-w-md mx-auto">
              {/* Mobile Logo */}
              <div className="mb-8 text-center lg:hidden">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-4xl">
                  🍽️
                </div>

                <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-orange-600">
                  RK Restaurant
                </p>
              </div>

              {/* Heading */}
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">
                  Account Login
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                  Welcome Back 👋
                </h1>

                <p className="mt-3 text-sm leading-6 text-gray-500 sm:text-base">
                  Sign in to continue your delicious journey.
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
                  LOGIN FORM
              ================================================== */}
              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Email Address
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                      ✉️
                    </span>

                    <input
                      id="login-email"
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

                {/* Password */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-bold text-gray-700"
                    >
                      Password
                    </label>

                    <Link
                      to="/forgot-password"
                      className="text-xs font-bold text-orange-600 transition hover:text-orange-700 sm:text-sm"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                      🔒
                    </span>

                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="Enter your password"
                      autoComplete="current-password"
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
                </div>

                {/* Remember Me */}
                <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />

                  <span>Remember me</span>
                </label>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3.5 font-bold text-white shadow-lg shadow-orange-200 transition duration-300 hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                      Signing in...
                    </>
                  ) : (
                    <>🔐 Sign In</>
                  )}
                </button>
              </form>

              {/* Security note */}
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                <span>🔒</span>
                <span>Your account is securely authenticated</span>
              </div>

              {/* Divider */}
              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-gray-200"></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  New here?
                </span>
                <div className="h-px flex-1 bg-gray-200"></div>
              </div>

              {/* Register */}
              <Link
                to="/register"
                className="flex w-full items-center justify-center rounded-xl border-2 border-gray-200 py-3 font-bold text-gray-700 transition duration-300 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
              >
                Create New Account
              </Link>

              {/* Back Home */}
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

export default Login;
