import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// ======================================================
// ORDERS PAGE
// ======================================================
// Logged-in customer ke orders yahan show hote hain.
//
// Features:
// - Secure JWT based order fetching
// - Order tracking
// - Status history
// - Delivery details
// - Ordered items
// - Payment status
// - Order cancellation
// - Repeat order
// - Scheduled order date/time display
// - Responsive professional UI
// ======================================================

function Orders() {
  const navigate = useNavigate();

  // ====================================================
  // LOGGED-IN USER
  // ====================================================
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

  // ====================================================
  // JWT TOKEN
  // ====================================================
  const token = localStorage.getItem("token");

  // ====================================================
  // STATES
  // ====================================================
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState("");

  // ====================================================
  // FETCH CUSTOMER ORDERS
  // ====================================================
  useEffect(() => {
    const fetchOrders = async () => {
      // Login check
      if (!loggedInUser || !token) {
        setError("Please login to view your orders.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:5000/api/orders/my-orders",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch orders.");
        }

        // Save orders
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (err) {
        console.error("Fetch orders error:", err);

        setError(err.message || "Cannot connect to server.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [loggedInUser?.id, token]);

  // ====================================================
  // STATUS CONFIGURATION
  // ====================================================
  const statusSteps = [
    {
      status: "Order Placed",
      label: "Placed",
      icon: "📦",
    },
    {
      status: "Preparing",
      label: "Preparing",
      icon: "👨‍🍳",
    },
    {
      status: "Out for Delivery",
      label: "Delivery",
      icon: "🚚",
    },
    {
      status: "Delivered",
      label: "Delivered",
      icon: "✅",
    },
  ];

  // ====================================================
  // STATUS STYLE
  // ====================================================
  const getStatusStyle = (status) => {
    if (status === "Delivered") {
      return "bg-green-100 text-green-700 border-green-200";
    }

    if (status === "Cancelled") {
      return "bg-red-100 text-red-700 border-red-200";
    }

    if (status === "Out for Delivery") {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }

    if (status === "Preparing") {
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }

    return "bg-orange-100 text-orange-700 border-orange-200";
  };

  // ====================================================
  // STATUS ICON
  // ====================================================
  const getStatusIcon = (status) => {
    if (status === "Preparing") return "👨‍🍳";
    if (status === "Out for Delivery") return "🚚";
    if (status === "Delivered") return "✅";
    if (status === "Cancelled") return "❌";

    return "📦";
  };

  // ====================================================
  // CHECK COMPLETED TRACKING STEP
  // ====================================================
  const isStepCompleted = (orderStatus, stepStatus) => {
    const currentIndex = statusSteps.findIndex(
      (step) => step.status === orderStatus,
    );

    const stepIndex = statusSteps.findIndex(
      (step) => step.status === stepStatus,
    );

    return currentIndex >= stepIndex;
  };

  // ====================================================
  // SCHEDULED ORDER CHECK
  // ====================================================
  const isScheduledOrder = (order) => {
    return order?.orderType === "Scheduled" && Boolean(order?.scheduledFor);
  };

  // ====================================================
  // FORMAT SCHEDULED DATE
  // ====================================================
  const formatScheduledDate = (dateValue) => {
    if (!dateValue) {
      return "Date unavailable";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // ====================================================
  // FORMAT SCHEDULED TIME
  // ====================================================
  const formatScheduledTime = (dateValue) => {
    if (!dateValue) {
      return "Time unavailable";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Time unavailable";
    }

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ====================================================
  // CANCEL ORDER
  // ====================================================
  const handleCancelOrder = async (orderId) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order?",
    );

    if (!confirmCancel) {
      return;
    }

    setCancellingOrderId(orderId);

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
      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order.orderId === orderId ? data.order : order,
        ),
      );

      alert("❌ Order cancelled successfully.");
    } catch (err) {
      console.error("Cancel order error:", err);

      alert("❌ Cannot connect to server.");
    } finally {
      setCancellingOrderId("");
    }
  };

  // ====================================================
  // REPEAT ORDER
  // ====================================================
  // Previous order ke items ko cart mein dobara add karega.
  // Existing cart items ko preserve karke new items add honge.
  const handleRepeatOrder = (order) => {
    try {
      if (!order || !Array.isArray(order.items) || order.items.length === 0) {
        alert("❌ This order has no items to repeat.");
        return;
      }

      // Existing cart safely read karo.
      const existingCart = JSON.parse(localStorage.getItem("cart")) || [];

      // Previous order ke items ko clean format mein convert karo.
      const repeatItems = order.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity || 1),
      }));

      // Existing cart + repeated items.
      const updatedCart = [...existingCart];

      repeatItems.forEach((repeatItem) => {
        const existingIndex = updatedCart.findIndex(
          (cartItem) =>
            String(cartItem._id) === String(repeatItem._id) &&
            String(cartItem.itemType || "food") ===
              String(repeatItem.itemType || "food"),
        );

        if (existingIndex !== -1) {
          // Same item already cart mein hai,
          // quantity increase karo.
          updatedCart[existingIndex] = {
            ...updatedCart[existingIndex],
            quantity:
              Number(updatedCart[existingIndex].quantity || 0) +
              Number(repeatItem.quantity || 1),
          };
        } else {
          // New item cart mein add karo.
          updatedCart.push(repeatItem);
        }
      });

      // Updated cart save karo.
      localStorage.setItem("cart", JSON.stringify(updatedCart));

      // Customer ko cart page par bhejo.
      alert("🛒 Previous order items added to your cart.");

      navigate("/cart");
    } catch (error) {
      console.error("Repeat order error:", error);

      alert("❌ Unable to repeat this order.");
    }
  };

  // ====================================================
  // LOGIN REQUIRED SCREEN
  // ====================================================
  if (!loggedInUser || !token) {
    return (
      <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50 px-5 py-12">
        {/* Background decoration */}
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl"></div>

        <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl"></div>

        <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className="w-full rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-50 text-5xl">
              🔐
            </div>

            <h1 className="mt-6 text-3xl font-black text-gray-900">
              Login Required
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Please login to view and track your restaurant orders.
            </p>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-7 w-full rounded-xl bg-orange-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-700"
            >
              🔐 Go to Login
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-4 text-sm font-semibold text-gray-400 transition hover:text-orange-600"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ====================================================
  // LOADING SCREEN
  // ====================================================
  if (loading) {
    return (
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50 px-5">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl"></div>

        <div className="relative z-10 w-full max-w-sm rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-4xl">
            📦
          </div>

          <div className="relative mx-auto mt-6 h-10 w-10">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-orange-100 border-t-orange-600"></div>
          </div>

          <h2 className="mt-5 text-xl font-black text-gray-900">
            Loading Your Orders
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Please wait while we fetch your latest orders...
          </p>
        </div>
      </section>
    );
  }

  // ====================================================
  // ERROR SCREEN
  // ====================================================
  if (error) {
    return (
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50 px-5">
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-5xl">
            ⚠️
          </div>

          <h2 className="mt-6 text-2xl font-black text-gray-900">
            Something Went Wrong
          </h2>

          <p className="mt-3 text-sm leading-6 text-red-600">{error}</p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-7 rounded-xl bg-orange-600 px-6 py-3 font-bold text-white transition hover:bg-orange-700"
          >
            🔐 Login Again
          </button>
        </div>
      </section>
    );
  }

  // ====================================================
  // MAIN ORDERS PAGE
  // ====================================================
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50 px-4 py-12 sm:px-6 lg:px-8">
      {/* ==================================================
          BACKGROUND DECORATIONS
      ================================================== */}
      <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-orange-200/30 blur-3xl"></div>

      <div className="pointer-events-none absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl"></div>

      {/* ==================================================
          PAGE HEADER
      ================================================== */}
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-600">
            Order History
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            My Orders 📦
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
            Welcome back,{" "}
            <span className="font-bold text-gray-700">{loggedInUser.name}</span>
            . Track your orders and view your complete order history.
          </p>

          {/* Decorative divider */}
          <div className="mx-auto mt-6 flex items-center justify-center gap-2">
            <div className="h-1 w-10 rounded-full bg-orange-200"></div>
            <div className="h-1 w-16 rounded-full bg-orange-600"></div>
            <div className="h-1 w-10 rounded-full bg-orange-200"></div>
          </div>
        </div>

        {/* ==================================================
            ORDER SUMMARY
        ================================================== */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-orange-100 bg-white p-5 text-center shadow-sm">
            <p className="text-3xl font-black text-orange-600">
              {orders.length}
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">
              Total Orders
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-white p-5 text-center shadow-sm">
            <p className="text-3xl font-black text-green-600">
              {orders.filter((order) => order.status === "Delivered").length}
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">
              Delivered
            </p>
          </div>

          <div className="col-span-2 rounded-2xl border border-orange-100 bg-white p-5 text-center shadow-sm sm:col-span-1">
            <p className="text-3xl font-black text-orange-600">
              {
                orders.filter(
                  (order) =>
                    order.status !== "Delivered" &&
                    order.status !== "Cancelled",
                ).length
              }
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">
              Active Orders
            </p>
          </div>
        </div>

        {/* ==================================================
            NO ORDERS
        ================================================== */}
        {orders.length === 0 ? (
          <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-orange-100 bg-white p-10 text-center shadow-xl sm:p-14">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-orange-50 text-6xl">
              📦
            </div>

            <h2 className="mt-7 text-3xl font-black text-gray-900">
              No Orders Yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              You haven't placed any orders yet. Explore our menu and discover
              something delicious.
            </p>

            <button
              type="button"
              onClick={() => navigate("/menu")}
              className="mt-7 rounded-xl bg-orange-600 px-7 py-3.5 font-bold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-700"
            >
              🍴 Explore Menu
            </button>
          </div>
        ) : (
          /* ==================================================
             ORDERS LIST
          ================================================== */
          <div className="mx-auto mt-10 max-w-5xl space-y-7">
            {orders.map((order, orderIndex) => {
              const currentStatus = order.status || "Order Placed";
              const scheduled = isScheduledOrder(order);

              return (
                <article
                  key={order.orderId || orderIndex}
                  className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-xl"
                >
                  {/* ==================================================
                      ORDER HEADER
                  ================================================== */}
                  <div className="border-b border-gray-100 bg-gradient-to-r from-white to-orange-50/60 p-5 sm:p-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Order ID
                        </p>

                        <h2 className="mt-1 break-all text-xl font-black text-orange-600 sm:text-2xl">
                          #{order.orderId}
                        </h2>

                        <p className="mt-2 text-xs text-gray-500">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleString()
                            : "Date unavailable"}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full border px-4 py-2 text-sm font-bold ${getStatusStyle(
                          currentStatus,
                        )}`}
                      >
                        {getStatusIcon(currentStatus)} {currentStatus}
                      </span>
                    </div>
                  </div>

                  {/* ==================================================
                      SCHEDULED ORDER INFORMATION
                  ================================================== */}
                  {scheduled && (
                    <div className="border-b border-orange-100 bg-orange-50/70 p-5 sm:p-7">
                      <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-3xl">
                              📅
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                                Scheduled Order
                              </p>

                              <h3 className="mt-1 text-lg font-black text-gray-900">
                                Your order is scheduled
                              </h3>

                              <p className="mt-1 text-xs leading-5 text-gray-500">
                                Your restaurant order is scheduled for the
                                selected date and time.
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
                            <div className="rounded-xl bg-orange-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                Date
                              </p>

                              <p className="mt-1 text-sm font-black text-gray-800">
                                📅 {formatScheduledDate(order.scheduledFor)}
                              </p>
                            </div>

                            <div className="rounded-xl bg-orange-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                Time
                              </p>

                              <p className="mt-1 text-sm font-black text-gray-800">
                                ⏰ {formatScheduledTime(order.scheduledFor)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ==================================================
                      TRACKING
                  ================================================== */}
                  <div className="p-5 sm:p-7">
                    {currentStatus !== "Cancelled" ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-black text-gray-900">
                            Order Tracking
                          </h3>

                          <span className="text-xs font-semibold text-orange-600">
                            {currentStatus}
                          </span>
                        </div>

                        {/* Desktop tracking */}
                        <div className="mt-7 hidden sm:block">
                          <div className="relative">
                            {/* Connecting line */}
                            <div className="absolute left-[12.5%] right-[12.5%] top-5 h-1 rounded-full bg-gray-200"></div>

                            <div
                              className="absolute left-[12.5%] top-5 h-1 rounded-full bg-orange-500 transition-all duration-500"
                              style={{
                                width:
                                  currentStatus === "Order Placed"
                                    ? "0%"
                                    : currentStatus === "Preparing"
                                      ? "25%"
                                      : currentStatus === "Out for Delivery"
                                        ? "58%"
                                        : "75%",
                              }}
                            ></div>

                            <div className="relative grid grid-cols-4">
                              {statusSteps.map((step) => {
                                const completed = isStepCompleted(
                                  currentStatus,
                                  step.status,
                                );

                                return (
                                  <div
                                    key={step.status}
                                    className="text-center"
                                  >
                                    <div
                                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-lg shadow-sm transition ${
                                        completed
                                          ? "bg-orange-500 text-white"
                                          : "bg-gray-100 text-gray-400"
                                      }`}
                                    >
                                      {step.icon}
                                    </div>

                                    <p
                                      className={`mt-3 text-xs font-bold ${
                                        completed
                                          ? "text-gray-800"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      {step.label}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Mobile tracking */}
                        <div className="mt-6 space-y-3 sm:hidden">
                          {statusSteps.map((step) => {
                            const completed = isStepCompleted(
                              currentStatus,
                              step.status,
                            );

                            return (
                              <div
                                key={step.status}
                                className={`flex items-center gap-3 rounded-xl border p-3 ${
                                  completed
                                    ? "border-orange-100 bg-orange-50"
                                    : "border-gray-100 bg-gray-50"
                                }`}
                              >
                                <div
                                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                                    completed
                                      ? "bg-orange-500 text-white"
                                      : "bg-gray-200 text-gray-400"
                                  }`}
                                >
                                  {step.icon}
                                </div>

                                <div>
                                  <p className="text-sm font-bold text-gray-800">
                                    {step.status}
                                  </p>

                                  <p className="text-xs text-gray-400">
                                    {completed ? "Completed" : "Pending"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-2xl">
                            ❌
                          </div>

                          <div>
                            <h3 className="font-black text-red-700">
                              Order Cancelled
                            </h3>

                            <p className="mt-1 text-xs leading-5 text-red-600">
                              This order has been cancelled and can no longer be
                              updated.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ==================================================
                        STATUS HISTORY
                    ================================================== */}
                    <div className="mt-8 border-t border-gray-100 pt-7">
                      <h3 className="text-lg font-black text-gray-900">
                        📜 Status History
                      </h3>

                      {Array.isArray(order.statusHistory) &&
                      order.statusHistory.length > 0 ? (
                        <div className="mt-5 space-y-3">
                          {order.statusHistory.map((history, historyIndex) => (
                            <div
                              key={historyIndex}
                              className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <span
                                className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                                  history.status,
                                )}`}
                              >
                                {getStatusIcon(history.status)} {history.status}
                              </span>

                              <span className="text-xs text-gray-400">
                                {history.changedAt
                                  ? new Date(history.changedAt).toLocaleString()
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

                    {/* ==================================================
                        TWO COLUMN INFORMATION
                    ================================================== */}
                    <div className="mt-8 grid gap-5 border-t border-gray-100 pt-7 lg:grid-cols-2">
                      {/* Delivery Details */}
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                        <h3 className="font-black text-gray-900">
                          👤 Delivery Details
                        </h3>

                        <div className="mt-4 space-y-3 text-sm">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                              Name
                            </p>

                            <p className="mt-1 font-semibold text-gray-700">
                              {order.name || "Not available"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                              Phone
                            </p>

                            <p className="mt-1 font-semibold text-gray-700">
                              {order.phone || "Not available"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                              Address
                            </p>

                            <p className="mt-1 leading-6 text-gray-700">
                              {order.address || "Not available"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Payment Details */}
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                        <h3 className="font-black text-gray-900">
                          💳 Payment Details
                        </h3>

                        <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-4">
                          <span className="text-sm font-semibold text-gray-600">
                            Payment Status
                          </span>

                          <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700">
                            ✓ {order.paymentStatus || "Unknown"}
                          </span>
                        </div>

                        <div className="mt-3 rounded-xl bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                            Total Amount
                          </p>

                          <p className="mt-1 text-3xl font-black text-orange-600">
                            ₹{order.totalAmount || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ==================================================
                        ORDERED ITEMS
                    ================================================== */}
                    <div className="mt-8 border-t border-gray-100 pt-7">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-gray-900">
                          🛒 Ordered Items
                        </h3>

                        <span className="text-xs font-semibold text-gray-400">
                          {(order.items || []).length} item
                          {(order.items || []).length === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        {(order.items || []).map((item, itemIndex) => {
                          const quantity = Number(item.quantity || 1);
                          const price = Number(item.price || 0);
                          const subtotal = price * quantity;

                          return (
                            <div
                              key={item._id || itemIndex}
                              className="flex items-center justify-between gap-4 rounded-2xl border border-orange-100 bg-orange-50/70 p-4"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                                  {item.icon || "🍽️"}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-bold text-gray-800">
                                    {item.name || "Food Item"}
                                  </p>

                                  <p className="mt-1 text-xs text-gray-500">
                                    ₹{price} × {quantity}
                                  </p>
                                </div>
                              </div>

                              <p className="flex-shrink-0 font-black text-orange-600">
                                ₹{subtotal}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ==================================================
                        TOTAL SUMMARY
                    ================================================== */}
                    <div className="mt-7 rounded-2xl bg-gray-900 p-5 text-white sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                            Order Total
                          </p>

                          <p className="mt-1 text-sm text-gray-300">
                            Payment: {order.paymentStatus || "Unknown"}
                          </p>
                        </div>

                        <p className="text-2xl font-black text-orange-400 sm:text-3xl">
                          ₹{order.totalAmount || 0}
                        </p>
                      </div>
                    </div>

                    {/* ==================================================
                        CANCEL ORDER
                    ================================================== */}
                    {currentStatus !== "Cancelled" &&
                      currentStatus !== "Delivered" && (
                        <div className="mt-6">
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order.orderId)}
                            disabled={cancellingOrderId === order.orderId}
                            className="w-full rounded-xl border border-red-200 bg-red-50 py-3.5 font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cancellingOrderId === order.orderId ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-red-300 border-t-red-600"></span>
                                Cancelling Order...
                              </span>
                            ) : (
                              "❌ Cancel Order"
                            )}
                          </button>
                        </div>
                      )}

                    {/* ==================================================
                        FINAL STATUS MESSAGE
                    ================================================== */}
                    {currentStatus === "Delivered" && (
                      <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
                        <div className="text-3xl">🎉</div>

                        <p className="mt-2 font-black text-green-700">
                          Order Delivered Successfully
                        </p>

                        <p className="mt-1 text-xs text-green-600">
                          Thank you for ordering from RK Restaurant!
                        </p>

                        <button
                          type="button"
                          onClick={() => handleRepeatOrder(order)}
                          className="mt-4 rounded-xl bg-orange-600 px-5 py-3 font-bold text-white transition hover:bg-orange-700"
                        >
                          🔁 Repeat Order
                        </button>
                      </div>
                    )}

                    {currentStatus === "Cancelled" && (
                      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                        <div className="text-3xl">❌</div>

                        <p className="mt-2 font-black text-red-700">
                          This order has been cancelled.
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ==================================================
            BOTTOM MENU BUTTON
        ================================================== */}
        {orders.length > 0 && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => navigate("/menu")}
              className="rounded-full bg-gray-900 px-7 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-orange-600"
            >
              🍴 Order More Food
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ======================================================
// EXPORT COMPONENT
// ======================================================
export default Orders;
