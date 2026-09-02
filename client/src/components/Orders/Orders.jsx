import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Orders() {
  const navigate = useNavigate();

  // ===============================
  // LOGGED-IN USER
  // ===============================
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

  // ===============================
  // JWT TOKEN
  // ===============================
  const token = localStorage.getItem("token");

  // ===============================
  // ORDERS
  // ===============================
  const [orders, setOrders] = useState([]);

  // ===============================
  // FETCH USER ORDERS
  // ===============================
  useEffect(() => {
    const fetchOrders = async () => {
      // Login check
      if (!loggedInUser?.id || !token) {
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/orders/user/${loggedInUser.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          alert(data.message || "Failed to fetch orders.");
          return;
        }

        setOrders(data.orders || []);
      } catch (error) {
        console.error("Fetch orders error:", error);
        alert("❌ Cannot connect to server.");
      }
    };

    fetchOrders();
  }, [loggedInUser?.id, token]);

  // ===============================
  // LOGIN CHECK
  // ===============================
  if (!loggedInUser || !token) {
    return (
      <section className="min-h-screen bg-orange-50 px-4 sm:px-6 py-12">
        <div className="max-w-md mx-auto mt-10 bg-white rounded-2xl shadow-md p-8 text-center">
          <div className="text-6xl mb-5">🔐</div>

          <h2 className="text-2xl font-bold text-gray-900">Login Required</h2>

          <p className="text-gray-500 mt-3">
            Please login to view your orders.
          </p>

          <button
            onClick={() => navigate("/login")}
            className="mt-6 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700"
          >
            🔐 Go to Login
          </button>
        </div>
      </section>
    );
  }

  // ===============================
  // CANCEL ORDER
  // ===============================
  const handleCancelOrder = async (orderId) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order?",
    );

    if (!confirmCancel) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/orders/${orderId}/cancel`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to cancel order.");
        return;
      }

      // Update only cancelled order
      const updatedOrders = orders.map((order) =>
        order.orderId === orderId ? data.order : order,
      );

      setOrders(updatedOrders);

      alert("❌ Order cancelled successfully.");
    } catch (error) {
      console.error("Cancel order error:", error);
      alert("❌ Cannot connect to server.");
    }
  };

  // ===============================
  // STATUS COLOR
  // ===============================
  const getStatusStyle = (status) => {
    if (status === "Delivered") {
      return "bg-green-100 text-green-700";
    }

    if (status === "Cancelled") {
      return "bg-red-100 text-red-700";
    }

    if (status === "Out for Delivery") {
      return "bg-blue-100 text-blue-700";
    }

    if (status === "Preparing") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-orange-100 text-orange-700";
  };

  // ===============================
  // STATUS ICON
  // ===============================
  const getStatusIcon = (status) => {
    if (status === "Order Placed") {
      return "📦";
    }

    if (status === "Preparing") {
      return "👨‍🍳";
    }

    if (status === "Out for Delivery") {
      return "🚚";
    }

    if (status === "Delivered") {
      return "✅";
    }

    if (status === "Cancelled") {
      return "❌";
    }

    return "📋";
  };

  // ===============================
  // TRACKING STATUS CHECK
  // ===============================
  const isStepCompleted = (orderStatus, step) => {
    const steps = [
      "Order Placed",
      "Preparing",
      "Out for Delivery",
      "Delivered",
    ];

    const currentIndex = steps.indexOf(orderStatus);
    const stepIndex = steps.indexOf(step);

    return currentIndex >= stepIndex;
  };

  // ===============================
  // PAGE
  // ===============================
  return (
    <section className="min-h-screen bg-orange-50 px-4 sm:px-6 py-12">
      {/* ===============================
          HEADING
      =============================== */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">📦 My Orders</h2>

        <p className="text-gray-500 mt-2">Welcome, {loggedInUser.name} 👋</p>
      </div>

      {/* ===============================
          NO ORDERS
      =============================== */}
      {orders.length === 0 ? (
        <div className="max-w-2xl mx-auto mt-10 bg-white rounded-xl shadow-md p-10 text-center">
          <div className="text-6xl mb-4">📦</div>

          <h3 className="text-2xl font-bold text-gray-800">No Orders Yet</h3>

          <p className="text-gray-500 mt-2">
            Your placed orders will appear here.
          </p>

          <button
            onClick={() => navigate("/menu")}
            className="mt-6 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700"
          >
            🍴 Explore Menu
          </button>
        </div>
      ) : (
        /* ===============================
           ORDERS LIST
        =============================== */
        <div className="max-w-3xl mx-auto mt-10 space-y-6">
          {orders.map((order, index) => (
            <div
              key={order.orderId || index}
              className="bg-white rounded-xl shadow-md p-5 sm:p-6"
            >
              {/* ===============================
                  ORDER HEADER
              =============================== */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-4">
                <div>
                  <p className="text-gray-500 text-sm">Order ID</p>

                  <h3 className="text-xl font-bold text-orange-600">
                    #{order.orderId}
                  </h3>
                </div>

                {/* Current Status */}
                <span
                  className={`w-fit px-4 py-2 rounded-lg font-semibold text-sm ${getStatusStyle(
                    order.status,
                  )}`}
                >
                  {getStatusIcon(order.status)} {order.status}
                </span>
              </div>

              {/* ===============================
                  ORDER TRACKING
              =============================== */}
              {order.status !== "Cancelled" ? (
                <div className="mt-6">
                  <h4 className="font-bold text-lg text-gray-800">
                    🚚 Order Tracking
                  </h4>

                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {/* ORDER PLACED */}
                    <div className="text-center">
                      <div
                        className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center ${
                          isStepCompleted(order.status, "Order Placed")
                            ? "bg-orange-500 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        📦
                      </div>

                      <p className="text-xs sm:text-sm mt-2 font-semibold">
                        Placed
                      </p>
                    </div>

                    {/* PREPARING */}
                    <div className="text-center">
                      <div
                        className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center ${
                          isStepCompleted(order.status, "Preparing")
                            ? "bg-yellow-500 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        👨‍🍳
                      </div>

                      <p className="text-xs sm:text-sm mt-2 font-semibold">
                        Preparing
                      </p>
                    </div>

                    {/* DELIVERY */}
                    <div className="text-center">
                      <div
                        className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center ${
                          isStepCompleted(order.status, "Out for Delivery")
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        🚚
                      </div>

                      <p className="text-xs sm:text-sm mt-2 font-semibold">
                        Delivery
                      </p>
                    </div>

                    {/* DELIVERED */}
                    <div className="text-center">
                      <div
                        className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center ${
                          order.status === "Delivered"
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        ✅
                      </div>

                      <p className="text-xs sm:text-sm mt-2 font-semibold">
                        Delivered
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* CANCELLED TRACKING */
                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-red-700 font-semibold">
                    ❌ This order has been cancelled.
                  </p>
                </div>
              )}

              {/* ===============================
                  STATUS HISTORY
              =============================== */}
              <div className="mt-6 border-t pt-5">
                <h4 className="font-bold text-lg text-gray-800">
                  📜 Order Status History
                </h4>

                {order.statusHistory && order.statusHistory.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {order.statusHistory.map((history, historyIndex) => (
                      <div
                        key={historyIndex}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 bg-gray-50 p-3 rounded-lg"
                      >
                        <span
                          className={`w-fit px-3 py-1 rounded-full text-sm font-semibold ${getStatusStyle(
                            history.status,
                          )}`}
                        >
                          {getStatusIcon(history.status)} {history.status}
                        </span>

                        <span className="text-sm text-gray-500">
                          {history.changedAt
                            ? new Date(history.changedAt).toLocaleString()
                            : "Date unavailable"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">
                    No status history available for this order.
                  </p>
                )}
              </div>

              {/* ===============================
                  DELIVERY DETAILS
              =============================== */}
              <div className="mt-5 border-t pt-5">
                <h4 className="font-bold text-lg text-gray-800">
                  👤 Delivery Details
                </h4>

                <div className="mt-3 space-y-2 text-gray-700">
                  <p>
                    <span className="font-semibold">Name:</span> {order.name}
                  </p>

                  <p>
                    <span className="font-semibold">Phone:</span> {order.phone}
                  </p>

                  <p>
                    <span className="font-semibold">Address:</span>{" "}
                    {order.address}
                  </p>
                </div>
              </div>

              {/* ===============================
                  ORDERED ITEMS
              =============================== */}
              <div className="mt-5 border-t pt-5">
                <h4 className="font-bold text-lg text-gray-800">
                  🛒 Ordered Items
                </h4>

                <div className="mt-3 space-y-2">
                  {(order.items || []).map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex justify-between items-center bg-orange-50 p-3 rounded-lg"
                    >
                      <span>
                        {item.icon} {item.name}
                      </span>

                      <span className="font-semibold text-orange-600">
                        ₹{item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ===============================
                  TOTAL
              =============================== */}
              <div className="mt-5 border-t pt-5 flex justify-between items-center">
                <span className="text-xl font-bold">Total</span>

                <span className="text-2xl font-bold text-orange-600">
                  ₹{order.totalAmount}
                </span>
              </div>

              {/* ===============================
                  ORDER DATE
              =============================== */}
              {order.createdAt && (
                <p className="text-gray-500 text-sm mt-4">
                  🕒 Ordered on: {new Date(order.createdAt).toLocaleString()}
                </p>
              )}

              {/* ===============================
                  CANCEL BUTTON
              =============================== */}
              {order.status !== "Cancelled" && order.status !== "Delivered" && (
                <div className="mt-5">
                  <button
                    onClick={() => handleCancelOrder(order.orderId)}
                    className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition"
                  >
                    ❌ Cancel Order
                  </button>
                </div>
              )}

              {/* ===============================
                  CANCELLED MESSAGE
              =============================== */}
              {order.status === "Cancelled" && (
                <div className="mt-5 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-red-700 font-semibold">
                    ❌ This order has been cancelled.
                  </p>
                </div>
              )}

              {/* ===============================
                  DELIVERED MESSAGE
              =============================== */}
              {order.status === "Delivered" && (
                <div className="mt-5 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-700 font-semibold">
                    ✅ This order has been delivered.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default Orders;
