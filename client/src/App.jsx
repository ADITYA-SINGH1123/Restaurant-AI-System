import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/navbar/Navbar";
import Hero from "./components/Hero/Hero";
import Categories from "./components/Categories/Categories";
import Footer from "./components/Footer/Footer";

import Menu from "./components/Menu/Menu";
import Cart from "./components/Cart/Cart";
import FoodDetails from "./components/FoodDetails/FoodDetails";
import Login from "./components/Login/Login";
import Register from "./components/Register/Register";
import Checkout from "./components/Checkout/Checkout";
import OrderSuccess from "./components/OrderSuccess/OrderSuccess";
import Orders from "./components/Orders/Orders";
import Admin from "./components/Admin/Admin";

// ===============================
// HOME PAGE
// ===============================
function Home() {
  return (
    <>
      <Hero />
      <Categories />
    </>
  );
}

// ===============================
// ADMIN PROTECTED ROUTE
// ===============================
function AdminRoute() {
  // Get logged-in user
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

  // Get JWT token
  const token = localStorage.getItem("token");

  // Check login and JWT token
  if (!loggedInUser || !token) {
    return <Navigate to="/login" replace />;
  }

  // Check admin role
  if (loggedInUser.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // Admin is authenticated
  return <Admin />;
}

// ===============================
// MAIN APP
// ===============================
function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <Navbar />

      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* Menu */}
        <Route path="/menu" element={<Menu />} />

        {/* Cart */}
        <Route path="/cart" element={<Cart />} />

        {/* Food Details */}
        <Route path="/food/:id" element={<FoodDetails />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Checkout */}
        <Route path="/checkout" element={<Checkout />} />

        {/* Order Success */}
        <Route path="/order-success" element={<OrderSuccess />} />

        {/* My Orders */}
        <Route path="/orders" element={<Orders />} />

        {/* Protected Admin Panel */}
        <Route path="/admin" element={<AdminRoute />} />
      </Routes>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
