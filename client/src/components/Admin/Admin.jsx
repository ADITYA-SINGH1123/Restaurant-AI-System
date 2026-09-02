import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Admin() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===============================
  // LOGGED-IN USER
  // ===============================
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

  // ===============================
  // JWT TOKEN
  // ===============================
  const token = localStorage.getItem("token");

  // ===============================
  // FETCH ALL ORDERS
  // ===============================
  useEffect(() => {
    const fetchOrders = async () => {
      // Login check
      if (!loggedInUser || !token) {
        alert("🔐 Please login first.");
        navigate("/login");
        return;
      }

      // Admin check
      if (loggedInUser.role !== "admin") {
        alert("❌ Admin access required.");
        navigate("/");
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/api/orders", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          alert(data.message || "Failed to fetch orders.");
          return;
        }

        setOrders(data.orders || []);
      } catch (error) {
        console.error("Admin orders error:", error);
        alert("❌ Cannot connect to server.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigate, loggedInUser?.id, loggedInUser?.role, token]);

  // ===============================
  // DASHBOARD CALCULATIONS
  // ===============================

  const totalOrders = orders.length;

  const totalSales = orders
    .filter((order) => order.status !== "Cancelled")
    .reduce((total, order) => total + Number(order.totalAmount || 0), 0);

  const preparingOrders = orders.filter(
    (order) => order.status === "Preparing",
  ).length;

  const outForDeliveryOrders = orders.filter(
    (order) => order.status === "Out for Delivery",
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "Delivered",
  ).length;

  const cancelledOrders = orders.filter(
    (order) => order.status === "Cancelled",
  ).length;

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
  // UPDATE ORDER STATUS
  // ===============================
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/orders/${orderId}/status`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            status: newStatus,
          }),
        },
      );

      const data = await response.json();

      // Backend error
      if (!response.ok) {
        alert(data.message || "Failed to update order status.");
        return;
      }

      // Update order in frontend
      const updatedOrders = orders.map((order) =>
        order.orderId === orderId ? data.order : order,
      );

      setOrders(updatedOrders);

      alert("✅ Order status updated successfully!");
    } catch (error) {
      console.error("Update status error:", error);
      alert("❌ Cannot connect to server.");
    }
  };

  // ===============================
  // PAGE
  // ===============================
  return (
    <section className="min-h-screen bg-orange-50 px-6 py-12">
      <div className="max-w-6xl mx-auto">
        {/* ===============================
            ADMIN HEADING
        =============================== */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            👑 Admin Dashboard
          </h1>

          <p className="mt-2 text-gray-600">
            Welcome, {loggedInUser?.name}. Manage your restaurant orders.
          </p>
        </div>

        {/* ===============================
            LOADING
        =============================== */}
        {loading && (
          <div className="mt-10 bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-600">⏳ Loading dashboard...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* ===============================
                DASHBOARD SUMMARY
            =============================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
              {/* Total Orders */}
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                <p className="text-gray-500 font-medium">📦 Total Orders</p>

                <h2 className="text-3xl font-bold text-gray-900 mt-2">
                  {totalOrders}
                </h2>
              </div>

              {/* Total Sales */}
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                <p className="text-gray-500 font-medium">💰 Total Sales</p>

                <h2 className="text-3xl font-bold text-green-600 mt-2">
                  ₹{totalSales}
                </h2>
              </div>

              {/* Preparing */}
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
                <p className="text-gray-500 font-medium">⏳ Preparing</p>

                <h2 className="text-3xl font-bold text-yellow-600 mt-2">
                  {preparingOrders}
                </h2>
              </div>

              {/* Out for Delivery */}
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                <p className="text-gray-500 font-medium">🚚 Out for Delivery</p>

                <h2 className="text-3xl font-bold text-blue-600 mt-2">
                  {outForDeliveryOrders}
                </h2>
              </div>

              {/* Delivered */}
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                <p className="text-gray-500 font-medium">✅ Delivered</p>

                <h2 className="text-3xl font-bold text-green-600 mt-2">
                  {deliveredOrders}
                </h2>
              </div>

              {/* Cancelled */}
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
                <p className="text-gray-500 font-medium">❌ Cancelled</p>

                <h2 className="text-3xl font-bold text-red-600 mt-2">
                  {cancelledOrders}
                </h2>
              </div>
            </div>

            {/* ===============================
                ALL ORDERS
            =============================== */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900">
                📋 All Orders
              </h2>

              {/* NO ORDERS */}
              {orders.length === 0 ? (
                <div className="mt-6 bg-white rounded-xl shadow-md p-8 text-center">
                  <div className="text-5xl">📦</div>

                  <h3 className="mt-4 text-xl font-bold text-gray-800">
                    No Orders Found
                  </h3>

                  <p className="mt-2 text-gray-500">
                    There are currently no orders in the system.
                  </p>
                </div>
              ) : (
                /* ORDERS */
                <div className="mt-6 space-y-6">
                  {orders.map((order) => (
                    <div
                      key={order.orderId}
                      className="bg-white rounded-xl shadow-md p-6"
                    >
                      {/* ===============================
                          ORDER HEADER
                      =============================== */}
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b pb-4">
                        <div>
                          <p className="text-sm text-gray-500">Order ID</p>

                          <h3 className="text-xl font-bold text-orange-600">
                            #{order.orderId}
                          </h3>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          {/* CURRENT STATUS */}
                          <span
                            className={`px-4 py-2 rounded-lg font-semibold text-sm ${getStatusStyle(
                              order.status,
                            )}`}
                          >
                            {order.status}
                          </span>

                          {/* ===============================
                              STATUS DROPDOWN
                          =============================== */}
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleStatusChange(order.orderId, e.target.value)
                            }
                            /*
                              Delivered aur Cancelled orders
                              ko lock kar diya hai.
                            */
                            disabled={
                              order.status === "Delivered" ||
                              order.status === "Cancelled"
                            }
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            <option value="Order Placed">Order Placed</option>

                            <option value="Preparing">Preparing</option>

                            <option value="Out for Delivery">
                              Out for Delivery
                            </option>

                            <option value="Delivered">Delivered</option>
                          </select>
                        </div>
                      </div>

                      {/* ===============================
                          CUSTOMER DETAILS
                      =============================== */}
                      <div className="mt-5">
                        <h4 className="text-lg font-bold text-gray-800">
                          👤 Customer Details
                        </h4>

                        <div className="mt-3 space-y-2 text-gray-700">
                          <p>
                            <span className="font-semibold">Name:</span>{" "}
                            {order.name}
                          </p>

                          <p>
                            <span className="font-semibold">Phone:</span>{" "}
                            {order.phone}
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
                        <h4 className="text-lg font-bold text-gray-800">
                          🛒 Ordered Items
                        </h4>

                        <div className="mt-3 space-y-2">
                          {(order.items || []).map((item, index) => (
                            <div
                              key={index}
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
                      <div className="mt-5 border-t pt-5 flex justify-between">
                        <span className="text-xl font-bold">Total</span>

                        <span className="text-2xl font-bold text-orange-600">
                          ₹{order.totalAmount}
                        </span>
                      </div>

                      {/* ===============================
                          STATUS HISTORY
                      =============================== */}
                      <div className="mt-5 border-t pt-5">
                        <h4 className="text-lg font-bold text-gray-800">
                          📜 Status History
                        </h4>

                        {order.statusHistory &&
                        order.statusHistory.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            {order.statusHistory.map((history, index) => (
                              <div
                                key={index}
                                className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50 p-3 rounded-lg"
                              >
                                {/* STATUS */}
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusStyle(
                                    history.status,
                                  )}`}
                                >
                                  {history.status}
                                </span>

                                {/* DATE */}
                                <span className="text-sm text-gray-500">
                                  {history.changedAt
                                    ? new Date(
                                        history.changedAt,
                                      ).toLocaleString()
                                    : "Date unavailable"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-gray-500">
                            No status history available.
                          </p>
                        )}
                      </div>

                      {/* ===============================
                          ORDER DATE
                      =============================== */}
                      {order.createdAt && (
                        <p className="text-gray-500 text-sm mt-4">
                          🕒 Ordered on:{" "}
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default Admin;
