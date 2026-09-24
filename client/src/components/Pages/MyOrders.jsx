// ======================================================
// MY ORDERS PAGE
// ======================================================
// Ye page logged-in customer ke orders dikhata hai.
//
// Features:
// 1. Orders fetch
// 2. Search
// 3. Status filter
// 4. Order tracking
// 5. Cancel order
// 6. Order details
// 7. Real-time Socket.io status update
// 8. Customer order notifications
// 9. Scheduled order display
// 10. Ordered food image display
// 11. Combo food image fallback
// ======================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

// ======================================================
// BACKEND SERVER URL
// ======================================================

const API_BASE_URL = "http://localhost:5000";

// ======================================================
// SOCKET.IO SERVER URL
// ======================================================

const SOCKET_URL = "http://localhost:5000";

// ======================================================
// ORDER TRACKING STEPS
// ======================================================

const trackingSteps = [
  "Order Placed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
];

// ======================================================
// STATUS FILTER OPTIONS
// ======================================================

const filterStatuses = [
  "All",
  "Order Placed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

// ======================================================
// GET IMAGE URL
// ======================================================
// Backend se image different formats me aa sakti hai.
//
// Supported:
// - https://example.com/image.jpg
// - /uploads/image.jpg
// - uploads/image.jpg
// - /images/image.jpg
// - { url: "..." }
// - { secure_url: "..." }
// - { src: "..." }
// - { path: "..." }
// ======================================================

const getImageUrl = (image) => {
  if (!image) {
    return "";
  }

  // ----------------------------------------------------
  // Direct string
  // ----------------------------------------------------

  if (typeof image === "string") {
    const cleanImage = image.trim();

    if (!cleanImage) {
      return "";
    }

    // External image URL
    if (cleanImage.startsWith("http://") || cleanImage.startsWith("https://")) {
      return cleanImage;
    }

    // Public frontend images
    // Example: /images/pizza.jpg
    if (cleanImage.startsWith("/images/")) {
      return cleanImage;
    }

    // Backend uploaded images
    // Example: /uploads/pizza.jpg
    if (cleanImage.startsWith("/")) {
      return `${API_BASE_URL}${cleanImage}`;
    }

    // Relative backend path
    return `${API_BASE_URL}/${cleanImage}`;
  }

  // ----------------------------------------------------
  // Image object
  // ----------------------------------------------------

  if (typeof image === "object") {
    const possibleUrl =
      image.url ||
      image.secure_url ||
      image.src ||
      image.path ||
      image.imageUrl ||
      image.photo ||
      "";

    if (typeof possibleUrl !== "string") {
      return "";
    }

    const cleanImage = possibleUrl.trim();

    if (!cleanImage) {
      return "";
    }

    // External image URL
    if (cleanImage.startsWith("http://") || cleanImage.startsWith("https://")) {
      return cleanImage;
    }

    // Public frontend images
    if (cleanImage.startsWith("/images/")) {
      return cleanImage;
    }

    // Backend uploaded images
    if (cleanImage.startsWith("/")) {
      return `${API_BASE_URL}${cleanImage}`;
    }

    return `${API_BASE_URL}/${cleanImage}`;
  }

  return "";
};

// ======================================================
// GET FOOD IMAGE FROM COMBO ITEM
// ======================================================
// Combo ke andar items ka structure normally:
//
// item.items = [
//   {
//     foodId: {
//       name: "...",
//       image: "..."
//     },
//     quantity: 1
//   }
// ]
//
// Kabhi foodId populated object ho sakta hai.
// Kabhi kisi different backend response me food object
// food, product, etc. naam se aa sakta hai.
//
// Is helper ka purpose sirf available image ko safely
// find karna hai.
// ======================================================

const getComboFoodImage = (item) => {
  if (!item || !Array.isArray(item.items)) {
    return "";
  }

  for (const comboItem of item.items) {
    if (!comboItem || typeof comboItem !== "object") {
      continue;
    }

    // --------------------------------------------------
    // Possible populated food object
    // --------------------------------------------------

    const food =
      comboItem.foodId && typeof comboItem.foodId === "object"
        ? comboItem.foodId
        : comboItem.food && typeof comboItem.food === "object"
          ? comboItem.food
          : comboItem.product && typeof comboItem.product === "object"
            ? comboItem.product
            : null;

    if (!food) {
      continue;
    }

    // --------------------------------------------------
    // Try different image fields
    // --------------------------------------------------

    const image =
      food.image ||
      food.imageUrl ||
      food.photo ||
      food.foodImage ||
      food.foodImageUrl ||
      food.photoUrl ||
      "";

    const imageUrl = getImageUrl(image);

    if (imageUrl) {
      return imageUrl;
    }
  }

  return "";
};

// ======================================================
// GET ORDER ITEM IMAGE
// ======================================================
// Different backend field names ko support karta hai.
//
// Priority:
// 1. Item's own image
// 2. Item imageUrl/photo/etc.
// 3. Combo ke andar first food ka image
// 4. Empty string -> UI fallback icon
// ======================================================

const getOrderItemImage = (item) => {
  if (!item) {
    return "";
  }

  // ----------------------------------------------------
  // 1. Direct item image
  // ----------------------------------------------------

  const directImage = getImageUrl(
    item.image ||
      item.imageUrl ||
      item.photo ||
      item.foodImage ||
      item.foodImageUrl ||
      item.photoUrl ||
      "",
  );

  if (directImage) {
    return directImage;
  }

  // ----------------------------------------------------
  // 2. Combo image fallback
  // ----------------------------------------------------
  // Agar combo ka own image empty hai to combo ke andar
  // available food ka image use hoga.

  const comboImage = getComboFoodImage(item);

  if (comboImage) {
    return comboImage;
  }

  return "";
};

// ======================================================
// NORMALIZE ORDER
// ======================================================
// Backend se agar partial/undefined order aaye to UI crash
// na ho, isliye basic safe defaults use karte hain.
// ======================================================

const normalizeOrder = (order) => {
  if (!order || typeof order !== "object") {
    return null;
  }

  return {
    ...order,

    items: Array.isArray(order.items) ? order.items : [],

    statusHistory: Array.isArray(order.statusHistory)
      ? order.statusHistory
      : [],

    status: order.status || "Order Placed",

    totalAmount: Number(order.totalAmount || 0),

    paymentMethod: order.paymentMethod || "Razorpay",

    paymentStatus: order.paymentStatus || "Unknown",
  };
};

// ======================================================
// COMPONENT
// ======================================================

const MyOrders = () => {
  const navigate = useNavigate();

  // ====================================================
  // STATES
  // ====================================================

  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  // ====================================================
  // SEARCH + FILTER
  // ====================================================

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  // ====================================================
  // NOTIFICATION
  // ====================================================

  const [notification, setNotification] = useState(null);

  // ====================================================
  // SHOW NOTIFICATION
  // ====================================================

  const showNotification = (message, type = "info") => {
    setNotification({
      message,
      type,
      id: Date.now(),
    });
  };

  // ====================================================
  // AUTO HIDE NOTIFICATION
  // ====================================================

  useEffect(() => {
    if (!notification) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [notification]);

  // ======================================================
  // FETCH ORDERS
  // ======================================================

  const fetchOrders = async (showRefreshNotification = false) => {
    const token = localStorage.getItem("token");

    // ----------------------------------------------------
    // LOGIN CHECK
    // ----------------------------------------------------

    if (!token) {
      setOrders([]);
      setError("Please login first.");
      setLoading(false);
      return;
    }

    try {
      if (showRefreshNotification) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${API_BASE_URL}/api/orders/my-orders`, {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // --------------------------------------------------
      // SAFE JSON RESPONSE
      // --------------------------------------------------

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch orders.");
      }

      // --------------------------------------------------
      // NORMALIZE ORDERS
      // --------------------------------------------------

      const normalizedOrders = Array.isArray(data.orders)
        ? data.orders.map(normalizeOrder).filter(Boolean)
        : [];

      setOrders(normalizedOrders);

      setError("");

      if (showRefreshNotification) {
        showNotification("🔄 Orders refreshed successfully.", "success");
      }
    } catch (err) {
      console.error("Fetch orders error:", err);

      const message = err.message || "Unable to fetch your orders.";

      setError(message);

      if (showRefreshNotification) {
        showNotification(message, "error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ======================================================
  // INITIAL ORDERS LOAD
  // ======================================================

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      fetchOrders(false);
    }, 0);

    return () => {
      clearTimeout(initialLoad);
    };
  }, []);

  // ======================================================
  // REAL-TIME SOCKET.IO
  // ======================================================

  useEffect(() => {
    const token = localStorage.getItem("token");

    // ----------------------------------------------------
    // No login = no socket
    // ----------------------------------------------------

    if (!token) {
      return undefined;
    }

    // ----------------------------------------------------
    // CREATE SOCKET
    // ----------------------------------------------------

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    // ----------------------------------------------------
    // SOCKET CONNECT
    // ----------------------------------------------------

    const handleConnect = () => {
      console.log("✅ Order Socket connected:", socket.id);
    };

    // ----------------------------------------------------
    // SOCKET CONNECT ERROR
    // ----------------------------------------------------

    const handleConnectError = (err) => {
      console.error("❌ Order Socket connection error:", err?.message || err);
    };

    // ----------------------------------------------------
    // ORDER STATUS UPDATE
    // ----------------------------------------------------

    const handleOrderStatusUpdated = (data) => {
      console.log("🔄 Real-time order update received:", data);

      const normalizedUpdatedOrder = normalizeOrder(data?.order);

      if (!normalizedUpdatedOrder) {
        return;
      }

      // --------------------------------------------------
      // UPDATE ORDER IN STATE
      // --------------------------------------------------

      setOrders((previousOrders) => {
        const orderExists = previousOrders.some(
          (order) =>
            String(order.orderId) === String(normalizedUpdatedOrder.orderId),
        );

        if (!orderExists) {
          return previousOrders;
        }

        return previousOrders.map((order) =>
          String(order.orderId) === String(normalizedUpdatedOrder.orderId)
            ? normalizedUpdatedOrder
            : order,
        );
      });

      // --------------------------------------------------
      // CUSTOMER NOTIFICATION
      // --------------------------------------------------

      const orderNumber = normalizedUpdatedOrder.orderId || "your order";

      const currentStatus = normalizedUpdatedOrder.status;

      if (currentStatus === "Preparing") {
        showNotification(
          `🍳 Order #${orderNumber} is now being prepared.`,
          "info",
        );
      } else if (currentStatus === "Out for Delivery") {
        showNotification(
          `🚚 Order #${orderNumber} is out for delivery.`,
          "info",
        );
      } else if (currentStatus === "Delivered") {
        showNotification(
          `🎉 Order #${orderNumber} has been delivered successfully!`,
          "success",
        );
      } else if (currentStatus === "Cancelled") {
        showNotification(
          `❌ Order #${orderNumber} has been cancelled.`,
          "error",
        );
      } else if (currentStatus === "Order Placed") {
        showNotification(
          `📦 Order #${orderNumber} has been placed.`,
          "success",
        );
      } else {
        showNotification(
          `🔄 Order #${orderNumber} status updated to ${currentStatus}.`,
          "info",
        );
      }
    };

    socket.on("connect", handleConnect);

    socket.on("connect_error", handleConnectError);

    socket.on("order-status-updated", handleOrderStatusUpdated);

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------

    return () => {
      socket.off("connect", handleConnect);

      socket.off("connect_error", handleConnectError);

      socket.off("order-status-updated", handleOrderStatusUpdated);

      socket.disconnect();

      console.log("🔌 Order Socket disconnected.");
    };
  }, []);

  // ======================================================
  // REFRESH ORDERS
  // ======================================================

  const handleRefresh = async () => {
    await fetchOrders(true);
  };

  // ======================================================
  // GET TRACKING STEP STATE
  // ======================================================

  const getStepState = (orderStatus, step) => {
    if (orderStatus === "Cancelled") {
      return "cancelled";
    }

    const currentIndex = trackingSteps.indexOf(orderStatus);

    const stepIndex = trackingSteps.indexOf(step);

    // Unknown status
    if (currentIndex === -1) {
      return stepIndex === 0 ? "current" : "pending";
    }

    if (stepIndex < currentIndex) {
      return "completed";
    }

    if (stepIndex === currentIndex) {
      return "current";
    }

    return "pending";
  };

  // ======================================================
  // CANCEL ORDER
  // ======================================================

  const handleCancelOrder = async (order) => {
    if (!order) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this order?",
    );

    if (!confirmed) {
      return;
    }

    // ----------------------------------------------------
    // BACKEND ROUTE EXPECTS PUBLIC ORDER ID
    // ----------------------------------------------------

    const internalOrderId = order.orderId;

    if (!internalOrderId) {
      alert("❌ Order ID is missing.");
      return;
    }

    // ----------------------------------------------------
    // TOKEN
    // ----------------------------------------------------

    const token = localStorage.getItem("token");

    if (!token) {
      alert("❌ Please login first.");
      navigate("/login");
      return;
    }

    try {
      setCancellingOrderId(order._id || order.orderId);

      const response = await fetch(
        `${API_BASE_URL}/api/orders/${internalOrderId}/cancel`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      // --------------------------------------------------
      // SAFE JSON RESPONSE
      // --------------------------------------------------

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel order.");
      }

      // --------------------------------------------------
      // NORMALIZE UPDATED ORDER
      // --------------------------------------------------

      const updatedOrder = normalizeOrder(data.order);

      if (!updatedOrder) {
        throw new Error("Server returned an invalid cancelled order.");
      }

      // --------------------------------------------------
      // UPDATE ORDER
      // --------------------------------------------------

      setOrders((previousOrders) =>
        previousOrders.map((existingOrder) =>
          String(existingOrder.orderId) === String(updatedOrder.orderId)
            ? updatedOrder
            : existingOrder,
        ),
      );

      // --------------------------------------------------
      // SUCCESS NOTIFICATION
      // --------------------------------------------------

      showNotification("❌ Order cancelled successfully.", "error");

      alert("✅ Order cancelled successfully.");
    } catch (err) {
      console.error("Cancel order error:", err);

      const message = err.message || "Unable to cancel order.";

      showNotification(message, "error");

      alert(`❌ ${message}`);
    } finally {
      setCancellingOrderId(null);
    }
  };

  // ======================================================
  // OPEN ORDER DETAILS
  // ======================================================

  const handleViewDetails = (orderId) => {
    if (!orderId) {
      return;
    }

    navigate(`/order-details/${orderId}`);
  };

  // ======================================================
  // FORMAT SCHEDULED DATE
  // ======================================================

  const formatScheduledDate = (scheduledFor) => {
    if (!scheduledFor) {
      return "Not available";
    }

    const date = new Date(scheduledFor);

    if (Number.isNaN(date.getTime())) {
      return "Invalid schedule";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ======================================================
  // FORMAT SCHEDULED TIME
  // ======================================================

  const formatScheduledTime = (scheduledFor) => {
    if (!scheduledFor) {
      return "Not available";
    }

    const date = new Date(scheduledFor);

    if (Number.isNaN(date.getTime())) {
      return "Invalid schedule";
    }

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ======================================================
  // CHECK SCHEDULED ORDER
  // ======================================================

  const isScheduledOrder = (order) => {
    return order?.orderType === "Scheduled" && Boolean(order?.scheduledFor);
  };

  // ======================================================
  // FILTERED ORDERS
  // ======================================================

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const orderMongoId = order?._id?.toString().toLowerCase() || "";

      const orderInternalId = order?.orderId?.toString().toLowerCase() || "";

      const matchesSearch =
        search === "" ||
        orderMongoId.includes(search) ||
        orderInternalId.includes(search);

      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // ======================================================
  // NOTIFICATION CLASS
  // ======================================================

  const getNotificationClass = (type) => {
    if (type === "success") {
      return "bg-green-50 border-green-300 text-green-800";
    }

    if (type === "error") {
      return "bg-red-50 border-red-300 text-red-800";
    }

    if (type === "warning") {
      return "bg-yellow-50 border-yellow-300 text-yellow-800";
    }

    return "bg-blue-50 border-blue-300 text-blue-800";
  };

  // ======================================================
  // LOADING SCREEN
  // ======================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">📦</div>

          <p className="text-lg font-semibold text-orange-600">
            Loading your orders...
          </p>

          <p className="text-sm text-gray-500 mt-2">Please wait.</p>
        </div>
      </div>
    );
  }

  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <div className="min-h-screen bg-orange-50 px-4 py-8">
      {/* ==================================================
          CUSTOMER NOTIFICATION
      ================================================== */}

      {notification && (
        <div className="fixed top-5 right-5 z-50 w-[calc(100%-2rem)] sm:w-96">
          <div
            className={`border rounded-xl shadow-lg p-4 flex items-start gap-3 ${getNotificationClass(
              notification.type,
            )}`}
          >
            {/* Icon */}

            <div className="text-xl">🔔</div>

            {/* Message */}

            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm mb-1">Order Notification</p>

              <p className="text-sm break-words">{notification.message}</p>
            </div>

            {/* Close */}

            <button
              type="button"
              onClick={() => setNotification(null)}
              className="font-bold text-lg leading-none opacity-70 hover:opacity-100"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ==================================================
          PAGE CONTAINER
      ================================================== */}

      <div className="max-w-6xl mx-auto">
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-600">
              Order History
            </p>

            <h1 className="text-3xl font-bold text-gray-800 mt-1">
              📦 My Orders
            </h1>

            <p className="text-gray-600 mt-1">Track and manage your orders</p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-5 py-2.5 rounded-lg font-semibold transition"
          >
            {refreshing ? "Refreshing..." : "🔄 Refresh Orders"}
          </button>
        </div>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p>{error}</p>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-fit bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                🔐 Login
              </button>
            </div>
          </div>
        )}

        {/* ==================================================
            SEARCH & FILTER
        ================================================== */}

        {!error && orders.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-5 mb-8">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Search */}

              <div className="md:col-span-2">
                <label
                  htmlFor="order-search"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  🔎 Search Order
                </label>

                <input
                  id="order-search"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Enter Order ID..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {/* Status */}

              <div>
                <label
                  htmlFor="order-status-filter"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  📋 Filter by Status
                </label>

                <select
                  id="order-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  {filterStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filter information */}

            <div className="mt-4 flex flex-col sm:flex-row justify-between gap-2 text-sm">
              <p className="text-gray-600">
                Showing{" "}
                <span className="font-bold text-orange-600">
                  {filteredOrders.length}
                </span>{" "}
                of <span className="font-bold">{orders.length}</span> orders
              </p>

              {(searchTerm || statusFilter !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("All");
                  }}
                  className="text-orange-600 hover:text-orange-700 font-semibold text-left"
                >
                  ✖ Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* ==================================================
            EMPTY ORDERS
        ================================================== */}

        {!error && orders.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <div className="text-5xl mb-4">📦</div>

            <h2 className="text-xl font-bold text-gray-800">No orders yet</h2>

            <p className="text-gray-600 mt-2">
              Your orders will appear here after placing an order.
            </p>

            <button
              type="button"
              onClick={() => navigate("/menu")}
              className="mt-5 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold"
            >
              🍴 Explore Menu
            </button>
          </div>
        )}

        {/* ==================================================
            NO SEARCH RESULTS
        ================================================== */}

        {!error && orders.length > 0 && filteredOrders.length === 0 && (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <div className="text-5xl mb-4">🔍</div>

            <h2 className="text-xl font-bold text-gray-800">
              No matching orders
            </h2>

            <p className="text-gray-600 mt-2">
              Try another Order ID or change the status filter.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("All");
              }}
              className="mt-5 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-semibold"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* ==================================================
            ORDERS
        ================================================== */}

        <div className="space-y-8">
          {filteredOrders.map((order, orderIndex) => {
            const orderKey =
              order._id || order.orderId || `order-${orderIndex}`;

            const displayOrderId =
              order.orderId || order._id?.slice(-8) || "Unknown";

            const currentStatus = order.status || "Order Placed";

            const canCancel =
              currentStatus !== "Delivered" && currentStatus !== "Cancelled";

            return (
              <article
                key={orderKey}
                className="bg-white rounded-2xl shadow-md overflow-hidden"
              >
                {/* ==================================================
                      ORDER HEADER
                  ================================================== */}

                <div className="p-6 border-b border-gray-100">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                        Order ID
                      </p>

                      <h2 className="font-bold text-xl text-gray-800 mt-1 break-all">
                        #{displayOrderId}
                      </h2>

                      <p className="text-sm text-gray-500 mt-1">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString("en-IN")
                          : "Date unavailable"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* ORDER TYPE */}

                      {isScheduledOrder(order) ? (
                        <span className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                          🕐 Scheduled Order
                        </span>
                      ) : (
                        <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                          ⚡ Immediate Order
                        </span>
                      )}

                      {/* STATUS */}

                      <span
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                          currentStatus === "Delivered"
                            ? "bg-green-100 text-green-700"
                            : currentStatus === "Cancelled"
                              ? "bg-red-100 text-red-700"
                              : currentStatus === "Preparing"
                                ? "bg-yellow-100 text-yellow-700"
                                : currentStatus === "Out for Delivery"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {currentStatus}
                      </span>

                      {/* DETAILS */}

                      <button
                        type="button"
                        onClick={() =>
                          handleViewDetails(order._id || order.orderId)
                        }
                        className="border border-orange-500 text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-lg font-semibold transition"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>

                {/* ==================================================
                      SCHEDULED ORDER
                  ================================================== */}

                {isScheduledOrder(order) && (
                  <div className="mx-6 mt-6 bg-purple-50 border border-purple-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🕐</div>

                      <div className="flex-1">
                        <h3 className="font-bold text-purple-800 text-lg">
                          Scheduled Delivery
                        </h3>

                        <p className="text-purple-700 text-sm mt-1">
                          Your order is scheduled for the following date and
                          time.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4 mt-4">
                          <div className="bg-white rounded-lg p-4 border border-purple-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase">
                              📅 Date
                            </p>

                            <p className="font-bold text-gray-800 mt-1">
                              {formatScheduledDate(order.scheduledFor)}
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-4 border border-purple-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase">
                              ⏰ Time
                            </p>

                            <p className="font-bold text-gray-800 mt-1">
                              {formatScheduledTime(order.scheduledFor)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ==================================================
                      CANCELLED ORDER MESSAGE
                  ================================================== */}

                {currentStatus === "Cancelled" ? (
                  <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="font-semibold text-red-700">
                      ❌ This order has been cancelled.
                    </p>

                    {isScheduledOrder(order) && (
                      <p className="text-sm text-red-600 mt-2">
                        The scheduled delivery for this order has also been
                        cancelled.
                      </p>
                    )}

                    {order.statusHistory?.length > 0 && (
                      <div className="mt-4">
                        <p className="font-semibold text-gray-700">
                          Order History
                        </p>

                        <div className="mt-2 space-y-1">
                          {order.statusHistory.map((history, index) => (
                            <p
                              key={history._id || index}
                              className="text-sm text-gray-600"
                            >
                              {history.status || "Unknown"} —{" "}
                              {history.changedAt || history.updatedAt
                                ? new Date(
                                    history.changedAt || history.updatedAt,
                                  ).toLocaleString("en-IN")
                                : "Date unavailable"}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ==================================================
                       TRACKING
                    ================================================== */

                  <div className="px-6 pt-8">
                    <h3 className="font-bold text-gray-800 mb-5">
                      Order Tracking
                    </h3>

                    <div className="grid grid-cols-4 gap-2">
                      {trackingSteps.map((step, index) => {
                        const state = getStepState(currentStatus, step);

                        return (
                          <div
                            key={step}
                            className="flex flex-col items-center text-center"
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                state === "completed"
                                  ? "bg-green-500 text-white"
                                  : state === "current"
                                    ? "bg-orange-500 text-white"
                                    : "bg-gray-200 text-gray-500"
                              }`}
                            >
                              {state === "completed" ? "✓" : index + 1}
                            </div>

                            <p
                              className={`text-xs sm:text-sm mt-2 ${
                                state === "current"
                                  ? "font-bold text-orange-600"
                                  : state === "completed"
                                    ? "font-semibold text-green-600"
                                    : "text-gray-500"
                              }`}
                            >
                              {step}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ==================================================
                      ORDER ITEMS
                  ================================================== */}

                <div className="px-6 mt-8">
                  <h3 className="font-bold text-gray-800 mb-3">
                    🍽️ Order Items
                  </h3>

                  {order.items.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-500">
                      No order items available.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {order.items.map((item, index) => {
                        const itemImage = getOrderItemImage(item);

                        const quantity = Number(item.quantity || 1);

                        const price = Number(item.price || 0);

                        const itemTotal = price * quantity;

                        return (
                          <div
                            key={item._id || index}
                            className="flex items-center justify-between gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100"
                          >
                            {/* IMAGE + NAME */}

                            <div className="flex items-center gap-3 min-w-0">
                              {itemImage ? (
                                <img
                                  src={itemImage}
                                  alt={item.name || "Food item"}
                                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                                  loading="lazy"
                                  onError={(event) => {
                                    event.currentTarget.style.display = "none";

                                    const fallback =
                                      event.currentTarget.nextElementSibling;

                                    if (fallback) {
                                      fallback.style.display = "flex";
                                    }
                                  }}
                                />
                              ) : null}

                              {/* IMAGE FALLBACK */}

                              <div
                                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-orange-100 border border-orange-200 items-center justify-center text-2xl flex-shrink-0 ${
                                  itemImage ? "hidden" : "flex"
                                }`}
                              >
                                🍽️
                              </div>

                              {/* NAME */}

                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 truncate">
                                  {item.name || "Food item"}
                                </p>

                                <p className="text-gray-500 text-sm mt-1">
                                  × {quantity}
                                </p>

                                <p className="text-xs text-gray-500 mt-1">
                                  ₹{price} each
                                </p>
                              </div>
                            </div>

                            {/* TOTAL */}

                            <span className="font-semibold text-gray-800 whitespace-nowrap">
                              ₹{itemTotal}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ==================================================
                      ORDER INFORMATION
                  ================================================== */}

                <div className="px-6 mt-6 grid md:grid-cols-3 gap-4">
                  {/* PAYMENT */}

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Payment</p>

                    <p className="font-semibold text-gray-800 mt-1">
                      {order.paymentMethod || "Razorpay"}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      Status: {order.paymentStatus || "Unknown"}
                    </p>
                  </div>

                  {/* TOTAL */}

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Total</p>

                    <p className="font-bold text-orange-600 text-lg mt-1">
                      ₹{Number(order.totalAmount || 0)}
                    </p>
                  </div>

                  {/* ADDRESS */}

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Address</p>

                    <p className="font-semibold text-gray-800 mt-1 break-words">
                      {order.address || "Not available"}
                    </p>
                  </div>
                </div>

                {/* ==================================================
                      SCHEDULE SUMMARY
                  ================================================== */}

                {isScheduledOrder(order) && (
                  <div className="mx-6 mt-6 border border-purple-200 bg-purple-50 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-sm text-purple-600 font-semibold">
                          🕐 Scheduled Order
                        </p>

                        <p className="font-bold text-purple-800 mt-1">
                          {formatScheduledDate(order.scheduledFor)} at{" "}
                          {formatScheduledTime(order.scheduledFor)}
                        </p>
                      </div>

                      <div className="text-sm text-purple-700 font-medium">
                        Order will be handled for the selected schedule.
                      </div>
                    </div>
                  </div>
                )}

                {/* ==================================================
                      CANCEL BUTTON
                  ================================================== */}

                {canCancel && (
                  <div className="px-6 mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(order)}
                      disabled={
                        cancellingOrderId === (order._id || order.orderId)
                      }
                      className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-5 py-2.5 rounded-lg font-semibold transition"
                    >
                      {cancellingOrderId === (order._id || order.orderId)
                        ? "Cancelling..."
                        : "❌ Cancel Order"}
                    </button>
                  </div>
                )}

                {/* ==================================================
                      DELIVERED MESSAGE
                  ================================================== */}

                {currentStatus === "Delivered" && (
                  <div className="mx-6 mt-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 font-semibold">
                    ✅ Order delivered successfully.
                  </div>
                )}

                {/* ==================================================
                      BOTTOM SPACING
                  ================================================== */}

                <div className="h-6"></div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ======================================================
// EXPORT
// ======================================================

export default MyOrders;
