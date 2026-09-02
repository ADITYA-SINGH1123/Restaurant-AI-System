import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  // Login form data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Login button
  const handleLogin = async (e) => {
    e.preventDefault();

    // Empty field check
    if (!email.trim() || !password.trim()) {
      alert("Please enter email and password.");
      return;
    }

    try {
      // Backend login API
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

      // Login failed
      if (!response.ok) {
        alert(data.message || "Invalid email or password.");
        return;
      }

      // Login successful
      const loggedInUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      };

      // Save logged-in user
      localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));

      // Save JWT token
      localStorage.setItem("token", data.token);

      alert("✅ Login successful!");

      // Go to Home
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);

      alert(
        "❌ Cannot connect to server. Please make sure backend is running.",
      );
    }
  };

  return (
    <section className="min-h-screen bg-orange-50 px-6 py-12">
      <div className="mx-auto max-w-md">
        {/* Login Card */}
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          {/* Heading */}
          <div className="text-center">
            <div className="text-5xl">🍽️</div>

            <h1 className="mt-4 text-3xl font-bold text-gray-900">
              Welcome Back
            </h1>

            <p className="mt-2 text-gray-500">
              Login to your AI Restaurant account.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="mt-8">
            {/* Email */}
            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-600"
              />
            </div>

            {/* Password */}
            <div className="mt-5">
              <label className="mb-2 block font-medium text-gray-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-600"
              />
            </div>

            {/* Remember Me */}
            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" />
                Remember me
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="mt-6 w-full rounded-lg bg-orange-600 py-3 font-semibold text-white hover:bg-orange-700 transition"
            >
              🔐 Login
            </button>
          </form>

          {/* Register */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?
            <Link
              to="/register"
              className="ml-1 font-semibold text-orange-600 hover:text-orange-700"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default Login;
