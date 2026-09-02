import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  // Form data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Register
  const handleRegister = async (e) => {
    e.preventDefault();

    // Empty fields check
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      alert("Please fill all details.");
      return;
    }

    // Password length
    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    // Password match
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      // ===============================
      // SEND DATA TO BACKEND
      // ===============================
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

      // ===============================
      // REGISTRATION FAILED
      // ===============================
      if (!response.ok) {
        alert(data.message || "Registration failed.");
        return;
      }

      // ===============================
      // REGISTRATION SUCCESSFUL
      // ===============================
      alert("✅ Account created successfully!");

      // Go to Login page
      navigate("/login");
    } catch (error) {
      console.error("Register error:", error);

      alert(
        "❌ Cannot connect to server. Please make sure backend is running.",
      );
    }
  };

  return (
    <section className="min-h-screen bg-orange-50 px-6 py-12">
      <div className="mx-auto max-w-md">
        {/* Register Card */}
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          {/* Heading */}
          <div className="text-center">
            <div className="text-5xl">🍽️</div>

            <h1 className="mt-4 text-3xl font-bold text-gray-900">
              Create Account
            </h1>

            <p className="mt-2 text-gray-500">Join our AI Restaurant today.</p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleRegister} className="mt-8">
            {/* Name */}
            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Full Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-600"
              />
            </div>

            {/* Email */}
            <div className="mt-5">
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
                placeholder="Create password"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-600"
              />
            </div>

            {/* Confirm Password */}
            <div className="mt-5">
              <label className="mb-2 block font-medium text-gray-700">
                Confirm Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-600"
              />
            </div>

            {/* Register Button */}
            <button
              type="submit"
              className="mt-6 w-full rounded-lg bg-orange-600 py-3 font-semibold text-white hover:bg-orange-700 transition"
            >
              📝 Create Account
            </button>
          </form>

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?
            <Link
              to="/login"
              className="ml-1 font-semibold text-orange-600 hover:text-orange-700"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default Register;
