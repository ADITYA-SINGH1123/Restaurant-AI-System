import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/navbar/Navbar";
import Hero from "./components/Hero/Hero";
import Categories from "./components/Categories/Categories";
import Footer from "./components/Footer/Footer";
import About from "./components/About/About";
import Menu from "./components/Menu/Menu";
import Cart from "./components/Cart/Cart";
import FoodDetails from "./components/FoodDetails/FoodDetails";
import Login from "./components/Login/Login";
import Register from "./components/Register/Register";
import Checkout from "./components/Checkout/Checkout";
import OrderSuccess from "./components/OrderSuccess/OrderSuccess";
import Orders from "./components/Orders/Orders";
import Admin from "./components/Admin/Admin";
import InventoryDashboard from "./components/Admin/InventoryDashboard";

import MyOrders from "./components/Pages/MyOrders";
import ForgotPassword from "./components/Pages/ForgotPassword";
import ResetPassword from "./components/Pages/ResetPassword";
import Profile from "./components/Pages/Profile";
import ChangePassword from "./components/Pages/ChangePassword";
import AIRecommendation from "./components/Pages/AIRecommendation";
import AIHistory from "./components/Pages/AIHistory";
import Favorites from "./components/Pages/Favorites";
import OrderDetails from "./components/Pages/OrderDetails";
import Reservation from "./components/Pages/Reservation";
import MyReservations from "./components/Pages/MyReservations";
import AdminReservations from "./components/Pages/AdminReservations";
import HelpSupport from "./components/Pages/HelpSupport";

// ===============================
// CUSTOMER LOGIN PROTECTION
// ===============================
function ProtectedRoute({ children }) {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

  const token = localStorage.getItem("token");

  if (!loggedInUser || !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// ===============================
// ADMIN LOGIN PROTECTION
// ===============================
function AdminRoute({ children }) {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

  const token = localStorage.getItem("token");

  // Not logged in
  if (!loggedInUser || !token) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not admin
  if (loggedInUser.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // Return requested admin page
  return children;
}

function Home() {
  return (
    <>
      <Hero />
      <Categories />
    </>
  );
}

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        {/* ================= HOME ================= */}
        <Route path="/" element={<Home />} />

        {/* ================= ABOUT ================= */}
        <Route path="/about" element={<About />} />

        {/* ================= MENU ================= */}
        <Route path="/menu" element={<Menu />} />

        {/* ================= FOOD DETAILS ================= */}
        <Route path="/food/:id" element={<FoodDetails />} />

        {/* ================= CART ================= */}
        <Route path="/cart" element={<Cart />} />

        {/* ================= AUTH ================= */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ================= CHECKOUT ================= */}
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />

        {/* ================= ORDER SUCCESS ================= */}
        <Route
          path="/order-success"
          element={
            <ProtectedRoute>
              <OrderSuccess />
            </ProtectedRoute>
          }
        />

        {/* ================= ORDERS ================= */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />

        {/* ================= MY ORDERS ================= */}
        <Route
          path="/my-orders"
          element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          }
        />

        {/* ================= ORDER DETAILS ================= */}
        <Route
          path="/order-details/:orderId"
          element={
            <ProtectedRoute>
              <OrderDetails />
            </ProtectedRoute>
          }
        />

        {/* ================= PROFILE ================= */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* ================= CHANGE PASSWORD ================= */}
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        {/* ================= PASSWORD RESET ================= */}
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* ================= AI ================= */}
        <Route
          path="/ai-recommendation"
          element={
            <ProtectedRoute>
              <AIRecommendation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-history"
          element={
            <ProtectedRoute>
              <AIHistory />
            </ProtectedRoute>
          }
        />

        {/* ================= FAVORITES ================= */}
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />

        {/* ================= RESERVATION ================= */}
        <Route
          path="/reservation"
          element={
            <ProtectedRoute>
              <Reservation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-reservations"
          element={
            <ProtectedRoute>
              <MyReservations />
            </ProtectedRoute>
          }
        />

        {/* ================= HELP & SUPPORT ================= */}
        <Route path="/help-support" element={<HelpSupport />} />

        {/* ================= ADMIN DASHBOARD ================= */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />

        {/* ================= ADMIN INVENTORY ================= */}
        {/* Inventory ab Admin Dashboard se separate page par open hoga. */}
        <Route
          path="/admin/inventory"
          element={
            <AdminRoute>
              <InventoryDashboard token={localStorage.getItem("token")} />
            </AdminRoute>
          }
        />

        {/* ================= ADMIN RESERVATIONS ================= */}
        <Route
          path="/admin/reservations"
          element={
            <AdminRoute>
              <AdminReservations />
            </AdminRoute>
          }
        />

        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </>
  );
}

export default App;
