import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// ======================================================
// ORDER SUCCESS COMPONENT
// ======================================================
// Payment/order successfully complete hone ke baad
// customer ko ye confirmation page dikhaya jata hai.
//
// Features:
// - Order ID display
// - Professional success UI
// - Responsive design
// - My Orders navigation
// - Home navigation
// - React Router based navigation
// ======================================================

function OrderSuccess() {
  const navigate = useNavigate();

  // ====================================================
  // ORDER ID
  // ====================================================
  // Checkout ke time save ki gayi lastOrderId ko read
  // kar rahe hain.
  const [orderId] = useState(() => {
    const savedOrderId = localStorage.getItem("lastOrderId");

    // Agar existing order ID available hai
    if (savedOrderId) {
      return savedOrderId;
    }

    // Fallback ID
    // Normally Checkout ke baad ye required nahi hoga.
    const newOrderId = "RK-" + Math.floor(100000 + Math.random() * 900000);

    localStorage.setItem("lastOrderId", newOrderId);

    return newOrderId;
  });

  // ====================================================
  // GO TO HOME
  // ====================================================
  const goToHome = () => {
    navigate("/");
  };

  // ====================================================
  // GO TO MY ORDERS
  // ====================================================
  const goToMyOrders = () => {
    navigate("/my-orders");
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50 px-5 py-12 sm:px-6 lg:px-8">
      {/* ==================================================
          BACKGROUND DECORATIONS
      ================================================== */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl"></div>

      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl"></div>

      {/* ==================================================
          MAIN CONTENT
      ================================================== */}
      <div className="relative z-10 mx-auto flex min-h-[75vh] max-w-3xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl">
          {/* ==================================================
              SUCCESS HEADER
          ================================================== */}
          <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-12 text-center text-white sm:px-10">
            {/* Decorative circles */}
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10"></div>

            <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-white/10"></div>

            {/* Success icon */}
            <div className="relative z-10 mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white text-5xl shadow-xl">
              ✓
            </div>

            {/* Heading */}
            <h1 className="relative z-10 mt-7 text-3xl font-black sm:text-4xl">
              Order Confirmed!
            </h1>

            <p className="relative z-10 mx-auto mt-3 max-w-lg text-sm leading-6 text-green-50 sm:text-base">
              Your order has been successfully placed. Thank you for choosing RK
              Restaurant!
            </p>
          </div>

          {/* ==================================================
              ORDER INFORMATION
          ================================================== */}
          <div className="px-6 py-8 sm:px-10">
            {/* Order ID Card */}
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Your Order ID
              </p>

              <p className="mt-2 break-all text-2xl font-black text-orange-600 sm:text-3xl">
                #{orderId}
              </p>

              <p className="mt-2 text-xs text-gray-500">
                Please keep this ID for order tracking.
              </p>
            </div>

            {/* ==================================================
                ORDER STATUS
            ================================================== */}
            <div className="mt-7 rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-center gap-4">
                {/* Status icon */}
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-green-100 text-2xl">
                  📦
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Order Placed
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Your restaurant order is being prepared. You can track its
                    status from My Orders.
                  </p>
                </div>
              </div>
            </div>

            {/* ==================================================
                QUICK FEATURES
            ================================================== */}
            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <div className="text-2xl">🍽️</div>

                <p className="mt-2 text-xs font-bold text-gray-800">
                  Fresh Food
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <div className="text-2xl">🚚</div>

                <p className="mt-2 text-xs font-bold text-gray-800">
                  Easy Delivery
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <div className="text-2xl">🔒</div>

                <p className="mt-2 text-xs font-bold text-gray-800">
                  Secure Order
                </p>
              </div>
            </div>

            {/* ==================================================
                ACTION BUTTONS
            ================================================== */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {/* My Orders */}
              <button
                type="button"
                onClick={goToMyOrders}
                className="rounded-xl bg-orange-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-orange-200 transition duration-300 hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-xl"
              >
                📋 Track My Order
              </button>

              {/* Continue Shopping */}
              <button
                type="button"
                onClick={goToHome}
                className="rounded-xl border-2 border-gray-200 bg-white px-6 py-3.5 font-bold text-gray-700 transition duration-300 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
              >
                🏠 Back to Home
              </button>
            </div>

            {/* ==================================================
                MENU LINK
            ================================================== */}
            <div className="mt-6 text-center">
              <Link
                to="/menu"
                className="text-sm font-bold text-orange-600 transition hover:text-orange-700"
              >
                🍴 Continue Exploring Menu →
              </Link>
            </div>

            {/* ==================================================
                THANK YOU MESSAGE
            ================================================== */}
            <div className="mt-8 border-t border-gray-100 pt-6 text-center">
              <p className="text-sm font-semibold text-gray-700">
                Thank you for ordering from RK Restaurant! ❤️
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Fresh Food • Smart Choices • Easy Ordering
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default OrderSuccess;
