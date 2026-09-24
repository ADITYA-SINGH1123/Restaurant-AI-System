import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

// Inventory dashboard component
//import InventoryDashboard from "./InventoryDashboard";

// ======================================================
// STAT CARD
// ======================================================

function StatCard({ icon, title, value, description, valueColor }) {
  return (
    <div className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">{title}</p>

          <h3 className={`mt-2 text-3xl font-black ${valueColor}`}>{value}</h3>

          <p className="mt-1 text-xs text-gray-400">{description}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-2xl transition duration-300 group-hover:scale-110">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// ANALYTICS BAR
// ======================================================

function AnalyticsBar({ label, value, total, icon, barClass }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>

          <span className="text-sm font-bold text-gray-700">{label}</span>
        </div>

        <span className="text-sm font-black text-gray-900">{value}</span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClass}`}
          style={{
            width: `${Math.min(percentage, 100)}%`,
          }}
        />
      </div>

      <p className="mt-1 text-right text-xs text-gray-400">
        {percentage}% of total orders
      </p>
    </div>
  );
}

// ======================================================
// FOOD IMAGE
// ======================================================

function FoodImage({ src, alt, icon = "🍽️", className }) {
  const [imageError, setImageError] = useState(false);

  const showImage = Boolean(src) && !imageError;

  if (!showImage) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-orange-50 ${
          className || ""
        }`}
        aria-label={`${alt || "Food"} image fallback`}
      >
        <span className="text-4xl">{icon || "🍽️"}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Food"}
      className={className || "h-full w-full object-cover"}
      onError={() => setImageError(true)}
      onLoad={() => setImageError(false)}
    />
  );
}

// ======================================================
// EMPTY FOOD FORM
// ======================================================

const emptyFoodForm = {
  name: "",
  price: "",
  category: "Pizza",
  image: "",
  icon: "🍽️",
  description: "",
  available: true,
  // Initial inventory stock for a new food item.
  stock: 0,
};

// ======================================================
// CHART TOOLTIP
// ======================================================

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
      <p className="text-xs font-bold text-gray-500">{label}</p>

      {payload.map((item, index) => (
        <p
          key={`${item.dataKey || "value"}-${index}`}
          className="mt-1 text-sm font-black text-gray-900"
        >
          {item.name || item.dataKey}:{" "}
          {item.dataKey === "revenue"
            ? `₹${Number(item.value || 0)}`
            : Number(item.value || 0)}
        </p>
      ))}
    </div>
  );
}

// ======================================================
// SCHEDULED ORDER HELPERS
// ======================================================

function isScheduledOrder(order) {
  return order?.orderType === "Scheduled" && Boolean(order?.scheduledFor);
}

function formatScheduledDate(dateValue) {
  if (!dateValue) return "Not scheduled";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatScheduledTime(dateValue) {
  if (!dateValue) return "Not scheduled";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Invalid time";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScheduleBadge(order) {
  if (!isScheduledOrder(order)) {
    return (
      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-bold text-gray-600">
        ⚡ Immediate
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[10px] font-bold text-purple-700">
      🕐 Scheduled
    </span>
  );
}

// ======================================================
// ADMIN COMPONENT
// ======================================================

function Admin() {
  const navigate = useNavigate();

  // ====================================================
  // LOCAL STORAGE
  // ====================================================

  // Safely read the logged-in user so malformed localStorage data
  // does not crash the Admin component during render.
  let loggedInUser = null;

  try {
    const storedUser = localStorage.getItem("loggedInUser");

    loggedInUser = storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    // Ignore invalid/stale localStorage data and let the normal
    // authentication flow handle the missing user safely.
    console.warn("Invalid loggedInUser data in localStorage:", error);
    loggedInUser = null;
  }

  const token = localStorage.getItem("token");

  // ====================================================
  // ADMIN SOCKET REF
  // ====================================================
  // Keep the active socket in a ref so it does not cause an extra
  // render when the socket is created or disconnected.
  const socketRef = useRef(null);

  // ====================================================
  // AUTHENTICATED API FETCH
  // ====================================================
  // All existing API requests continue to use the same URLs, methods,
  // headers and bodies. This wrapper only handles expired/invalid admin
  // sessions centrally.
  const authenticatedFetch = async (...args) => {
    const response = await fetch(...args);

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("loggedInUser");

      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      navigate("/login", {
        replace: true,
      });
    }

    return response;
  };

  // ====================================================
  // ORDER STATES
  // ====================================================

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [orderTypeFilter, setOrderTypeFilter] = useState("All");

  const [selectedOrder, setSelectedOrder] = useState(null);

  // ====================================================
  // SALES ANALYTICS STATES
  // ====================================================

  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    dailyRevenue: [],
    topSellingItems: [],
    statusDistribution: [],
  });

  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  // ====================================================
  // FOOD STATES
  // ====================================================

  const [foods, setFoods] = useState([]);
  const [foodLoading, setFoodLoading] = useState(true);
  const [foodError, setFoodError] = useState("");
  const [foodRefreshing, setFoodRefreshing] = useState(false);

  const [foodSearch, setFoodSearch] = useState("");
  const [foodCategoryFilter, setFoodCategoryFilter] = useState("All");

  const [showFoodForm, setShowFoodForm] = useState(false);
  const [editingFood, setEditingFood] = useState(null);

  const [foodForm, setFoodForm] = useState(emptyFoodForm);

  const [savingFood, setSavingFood] = useState(false);
  const [deletingFoodId, setDeletingFoodId] = useState(null);

  // ====================================================
  // COMBO OFFER STATES
  // ====================================================

  const [combos, setCombos] = useState([]);
  const [comboLoading, setComboLoading] = useState(true);
  const [comboError, setComboError] = useState("");
  const [comboRefreshing, setComboRefreshing] = useState(false);

  const [showComboForm, setShowComboForm] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [savingCombo, setSavingCombo] = useState(false);
  const [deletingComboId, setDeletingComboId] = useState(null);

  const [comboForm, setComboForm] = useState({
    name: "",
    description: "",
    image: "",
    comboPrice: "",
    validFrom: "",
    validUntil: "",
    available: true,
    items: [],
  });

  // ====================================================
  // ADMIN CHAT STATES
  // ====================================================

  const [chatCustomers, setChatCustomers] = useState([]);
  const [chatCustomersLoading, setChatCustomersLoading] = useState(false);
  const [chatCustomersError, setChatCustomersError] = useState("");
  const [selectedChatCustomer, setSelectedChatCustomer] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatMessagesLoading, setChatMessagesLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [sendingChatMessage, setSendingChatMessage] = useState(false);

  // Chat request protection: rapid customer switching should not allow
  // an older conversation response to overwrite the currently selected chat.
  const chatRequestIdRef = useRef(0);
  const chatAbortControllerRef = useRef(null);
  const selectedChatCustomerRef = useRef(null);

  // Keep the selected customer available to the Socket.IO listener without
  // recreating the socket connection every time the admin changes chats.
  useEffect(() => {
    selectedChatCustomerRef.current = selectedChatCustomer;
  }, [selectedChatCustomer]);

  // ====================================================
  // STATUS LIST
  // ====================================================

  const filterStatuses = [
    "All",
    "Order Placed",
    "Preparing",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
  ];

  // ====================================================
  // FOOD CATEGORIES
  // ====================================================

  const foodCategories = [
    "All",
    "Pizza",
    "Burger",
    "Noodles",
    "Dessert",
    "Healthy",
    "Aloo Paratha",
    "Snacks",
    "Drinks",
  ];

  // ====================================================
  // FETCH ORDERS
  // ====================================================

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      if (!loggedInUser || !token) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      if (loggedInUser.role !== "admin") {
        navigate("/", {
          replace: true,
        });
        return;
      }

      try {
        const response = await authenticatedFetch(
          "http://localhost:5000/api/orders",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setErrorMessage(data.message || "Failed to fetch orders.");
          setLoading(false);
          return;
        }

        setOrders(data.orders || []);
        setErrorMessage("");
        setLoading(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Admin orders error:", error);

        setErrorMessage(
          "Cannot connect to server. Please make sure the backend is running.",
        );

        setLoading(false);
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [navigate, token, loggedInUser?.id, loggedInUser?.role]);

  // ====================================================
  // REFRESH ANALYTICS
  // ====================================================

  const handleRefreshAnalytics = async () => {
    if (!token || analyticsLoading) {
      return;
    }

    setAnalyticsLoading(true);
    setAnalyticsError("");

    try {
      const response = await authenticatedFetch(
        "http://localhost:5000/api/orders/analytics",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setAnalyticsError(data.message || "Failed to refresh sales analytics.");
        return;
      }

      setAnalytics({
        // Backend returns analytics fields at the top level.
        // Keep this mapping aligned with /api/orders/analytics response.
        totalOrders: Number(data.totalOrders || 0),
        totalRevenue: Number(data.totalRevenue || 0),
        dailyRevenue: Array.isArray(data.dailyRevenue) ? data.dailyRevenue : [],
        topSellingItems: Array.isArray(data.topSellingItems)
          ? data.topSellingItems
          : [],
        statusDistribution: Array.isArray(data.statusDistribution)
          ? data.statusDistribution
          : [],
      });
    } catch (error) {
      console.error("Analytics refresh error:", error);

      setAnalyticsError(
        "Cannot connect to analytics API. Please make sure the backend is running.",
      );
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // ====================================================
  // REAL-TIME ORDER SOCKET.IO
  // ====================================================
  // Admin dashboard ko customer cancellation/status updates
  // bina page refresh ke receive karne ke liye Socket.IO use hota hai.

  useEffect(() => {
    if (!loggedInUser || !token || loggedInUser.role !== "admin") {
      return undefined;
    }

    const socket = io("http://localhost:5000", {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 Admin Socket connected:", socket.id);

      // Admin ko apne user room me join karna zaroori hai,
      // taaki customer ke new chat messages real-time mil saken.
      if (loggedInUser?._id || loggedInUser?.id) {
        socket.emit(
          "joinUserRoom",
          String(loggedInUser._id || loggedInUser.id),
        );
      }
    });

    socket.on("order-status-updated", (data) => {
      const updatedOrder = data?.order;

      if (!updatedOrder?.orderId) {
        return;
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.orderId === updatedOrder.orderId ? updatedOrder : order,
        ),
      );

      setSelectedOrder((currentOrder) =>
        currentOrder?.orderId === updatedOrder.orderId
          ? updatedOrder
          : currentOrder,
      );

      // Order status change ke baad analytics ko backend se fresh data
      // ke saath sync karo. Existing analytics UI/state ko preserve kiya gaya hai.
      void handleRefreshAnalytics();

      // Analytics cards/charts ko bhi latest data ke saath sync rakho.
      if (updatedOrder.status === "Cancelled") {
        console.log(
          "🔴 Real-time order cancellation received:",
          updatedOrder.orderId,
        );
      } else {
        console.log(
          "📦 Real-time order update received:",
          updatedOrder.orderId,
        );
      }
    });

    socket.on("newChatMessage", (message) => {
      if (!message?._id) {
        return;
      }

      const customerId = String(
        message.senderRole === "customer"
          ? message.senderId?._id || message.senderId
          : message.receiverId?._id || message.receiverId,
      );

      // Only append the message when it belongs to the conversation currently
      // open in the admin panel. Messages from other customers still update
      // the customer list, but must not leak into the active chat window.
      const selectedCustomerId = selectedChatCustomerRef.current?._id
        ? String(selectedChatCustomerRef.current._id)
        : "";

      if (selectedCustomerId && selectedCustomerId === customerId) {
        setChatMessages((currentMessages) => {
          if (currentMessages.some((item) => item._id === message._id)) {
            return currentMessages;
          }
          return [...currentMessages, message];
        });
      }

      // Customer list ko latest message ke saath refresh karo.
      setChatCustomers((currentCustomers) =>
        currentCustomers.map((customer) =>
          String(customer._id) === customerId
            ? {
                ...customer,
                lastMessage: message.message,
                lastMessageAt: message.createdAt,
              }
            : customer,
        ),
      );
    });

    socket.on("connect_error", (error) => {
      console.error("Admin Socket connection error:", error);

      const socketErrorMessage = String(error?.message || "").toLowerCase();

      if (
        socketErrorMessage.includes("unauthorized") ||
        socketErrorMessage.includes("invalid token") ||
        socketErrorMessage.includes("expired token") ||
        socketErrorMessage.includes("authentication")
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("loggedInUser");

        socket.disconnect();

        navigate("/login", {
          replace: true,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 Admin Socket disconnected");
    });

    return () => {
      socket.off("connect");
      socket.off("order-status-updated");
      socket.off("newChatMessage");
      socket.off("connect_error");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, [token, loggedInUser?.id, loggedInUser?.role]);

  // Current admin orders ke rooms join karo.
  // Orders fetch/update hone ke baad latest room list join hoti hai.
  useEffect(() => {
    const socket = socketRef.current;

    if (!socket || !socket.connected || !Array.isArray(orders)) {
      return;
    }

    orders.forEach((order) => {
      if (order?.orderId) {
        socket.emit("join-order-room", order.orderId);
      }
    });
  }, [orders]);

  // ====================================================
  // FETCH SALES ANALYTICS
  // ====================================================

  useEffect(() => {
    let isMounted = true;

    const fetchAnalytics = async () => {
      if (!loggedInUser || !token || loggedInUser.role !== "admin") {
        if (isMounted) {
          setAnalyticsLoading(false);
        }

        return;
      }

      try {
        setAnalyticsLoading(true);
        setAnalyticsError("");

        const response = await authenticatedFetch(
          "http://localhost:5000/api/orders/analytics",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setAnalyticsError(data.message || "Failed to fetch sales analytics.");

          setAnalyticsLoading(false);
          return;
        }

        setAnalytics({
          // Backend returns analytics fields at the top level.
          // Keep this mapping aligned with /api/orders/analytics response.
          totalOrders: Number(data.totalOrders || 0),
          totalRevenue: Number(data.totalRevenue || 0),
          dailyRevenue: Array.isArray(data.dailyRevenue)
            ? data.dailyRevenue
            : [],
          topSellingItems: Array.isArray(data.topSellingItems)
            ? data.topSellingItems
            : [],
          statusDistribution: Array.isArray(data.statusDistribution)
            ? data.statusDistribution
            : [],
        });

        setAnalyticsError("");
        setAnalyticsLoading(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Sales analytics error:", error);

        setAnalyticsError(
          "Cannot connect to analytics API. Please make sure the backend is running.",
        );

        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();

    return () => {
      isMounted = false;
    };
  }, [token, loggedInUser?.id, loggedInUser?.role]);

  // ====================================================
  // INITIAL FOOD FETCH
  // ====================================================

  useEffect(() => {
    let isMounted = true;

    const fetchFoods = async () => {
      if (!loggedInUser || !token || loggedInUser.role !== "admin") {
        if (isMounted) {
          setFoodLoading(false);
        }

        return;
      }

      try {
        const response = await authenticatedFetch(
          "http://localhost:5000/api/foods/admin/all",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setFoodError(data.message || "Failed to fetch food items.");
          setFoodLoading(false);
          return;
        }

        setFoods(data.foods || []);
        setFoodError("");
        setFoodLoading(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Admin foods error:", error);

        setFoodError(
          "Cannot connect to server. Please make sure the backend is running.",
        );

        setFoodLoading(false);
      }
    };

    fetchFoods();

    return () => {
      isMounted = false;
    };
  }, [token, loggedInUser?.id, loggedInUser?.role]);

  // ====================================================
  // INITIAL COMBO OFFER FETCH
  // ====================================================

  useEffect(() => {
    let isMounted = true;

    const fetchCombos = async () => {
      if (!loggedInUser || !token || loggedInUser.role !== "admin") {
        if (isMounted) {
          setComboLoading(false);
        }
        return;
      }

      try {
        const response = await authenticatedFetch(
          "http://localhost:5000/api/combos/admin/all",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setComboError(data.message || "Failed to fetch combo offers.");
          setComboLoading(false);
          return;
        }

        setCombos(data.combos || []);
        setComboError("");
        setComboLoading(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Admin combos error:", error);

        setComboError(
          "Cannot connect to combo offer API. Please make sure the backend is running.",
        );
        setComboLoading(false);
      }
    };

    fetchCombos();

    return () => {
      isMounted = false;
    };
  }, [token, loggedInUser?.id, loggedInUser?.role]);

  // ====================================================
  // REFRESH ORDERS
  // ====================================================

  const handleRefresh = async () => {
    if (!token || refreshing) {
      return;
    }

    setRefreshing(true);
    setErrorMessage("");

    try {
      const response = await authenticatedFetch(
        "http://localhost:5000/api/orders",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Failed to refresh orders.");
        return;
      }

      setOrders(data.orders || []);
    } catch (error) {
      console.error("Refresh error:", error);

      setErrorMessage(
        "Cannot connect to server. Please make sure the backend is running.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  // ====================================================
  // REFRESH FOODS
  // ====================================================

  const handleRefreshFoods = async () => {
    if (!token || foodRefreshing) {
      return;
    }

    setFoodRefreshing(true);
    setFoodError("");

    try {
      const response = await authenticatedFetch(
        "http://localhost:5000/api/foods/admin/all",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setFoodError(data.message || "Failed to refresh food items.");
        return;
      }

      setFoods(data.foods || []);
    } catch (error) {
      console.error("Food refresh error:", error);

      setFoodError(
        "Cannot connect to server. Please make sure the backend is running.",
      );
    } finally {
      setFoodRefreshing(false);
    }
  };

  // ====================================================
  // DASHBOARD CALCULATIONS
  // ====================================================

  const totalOrders = orders.length;

  const activeOrders = orders.filter(
    (order) => order.status !== "Delivered" && order.status !== "Cancelled",
  ).length;

  const nonCancelledOrders = orders.filter(
    (order) => order.status !== "Cancelled",
  );

  const totalSales = nonCancelledOrders.reduce(
    (total, order) => total + Number(order.totalAmount || 0),
    0,
  );

  const today = new Date();

  const todayOrders = orders.filter((order) => {
    if (!order.createdAt || order.status === "Cancelled") {
      return false;
    }

    const orderDate = new Date(order.createdAt);

    return (
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getFullYear() === today.getFullYear()
    );
  });

  const todayRevenue = todayOrders.reduce(
    (total, order) => total + Number(order.totalAmount || 0),
    0,
  );

  const placedOrders = orders.filter(
    (order) => order.status === "Order Placed",
  ).length;

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

  const scheduledOrders = orders.filter((order) => isScheduledOrder(order));

  // React render must stay pure: use the already-created `today` value instead of Date.now().
  const nowTime = today.getTime();

  const upcomingScheduledOrders = scheduledOrders.filter((order) => {
    if (!order.scheduledFor || order.status === "Cancelled") return false;
    const scheduledDate = new Date(order.scheduledFor);
    return (
      !Number.isNaN(scheduledDate.getTime()) &&
      scheduledDate.getTime() > nowTime
    );
  });

  // ====================================================
  // ANALYTICS
  // ====================================================

  const averageOrderValue =
    nonCancelledOrders.length > 0
      ? Math.round(totalSales / nonCancelledOrders.length)
      : 0;

  const deliveredRevenue = orders
    .filter((order) => order.status === "Delivered")
    .reduce((total, order) => total + Number(order.totalAmount || 0), 0);

  const pendingRevenue = orders
    .filter(
      (order) => order.status !== "Delivered" && order.status !== "Cancelled",
    )
    .reduce((total, order) => total + Number(order.totalAmount || 0), 0);

  const cancellationRate =
    totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0;

  // ====================================================
  // CHART DATA
  // ====================================================

  const dailyRevenueChartData = useMemo(() => {
    return analytics.dailyRevenue.map((item) => ({
      date: item._id || "Unknown",
      revenue: Number(item.revenue || 0),
      orders: Number(item.orders || 0),
    }));
  }, [analytics.dailyRevenue]);

  const topSellingChartData = useMemo(() => {
    return analytics.topSellingItems
      .filter((item) => Number(item.quantity || 0) > 0)
      .slice(0, 10)
      .map((item, index) => ({
        name: item.name || `Item ${index + 1}`,
        quantity: Number(item.quantity || 0),
        revenue: Number(item.revenue || 0),
      }));
  }, [analytics.topSellingItems]);

  const statusChartData = useMemo(() => {
    return analytics.statusDistribution
      .filter((item) => Number(item.value || item.count || 0) > 0)
      .map((item) => ({
        // Backend sends `{ name, value }` for status distribution.
        name: item.name || item._id || "Unknown",
        value: Number(item.value || item.count || 0),
      }));
  }, [analytics.statusDistribution]);

  const statusChartColors = [
    "#f97316",
    "#eab308",
    "#3b82f6",
    "#22c55e",
    "#ef4444",
  ];

  // ====================================================
  // ORDER SEARCH + FILTER
  // ====================================================

  const filteredOrders = orders.filter((order) => {
    const search = searchTerm.trim().toLowerCase();

    const orderId = String(order.orderId || "").toLowerCase();

    const customerName = String(order.name || "").toLowerCase();

    const phone = String(order.phone || "").toLowerCase();

    const matchesSearch =
      search === "" ||
      orderId.includes(search) ||
      customerName.includes(search) ||
      phone.includes(search);

    const matchesStatus =
      statusFilter === "All" || order.status === statusFilter;

    const matchesOrderType =
      orderTypeFilter === "All" ||
      String(order.orderType || "Immediate") === orderTypeFilter;

    return matchesSearch && matchesStatus && matchesOrderType;
  });

  // ====================================================
  // RECENT ORDERS
  // ====================================================

  const recentOrders = [...orders]
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();

      const dateB = new Date(b.createdAt || 0).getTime();

      return dateB - dateA;
    })
    .slice(0, 5);

  // ====================================================
  // FOOD FILTER
  // ====================================================

  const filteredFoods = useMemo(() => {
    const search = foodSearch.trim().toLowerCase();

    return foods.filter((food) => {
      const name = String(food.name || "").toLowerCase();

      const category = String(food.category || "").toLowerCase();

      const description = String(food.description || "").toLowerCase();

      const matchesSearch =
        search === "" ||
        name.includes(search) ||
        category.includes(search) ||
        description.includes(search);

      const matchesCategory =
        foodCategoryFilter === "All" ||
        category === foodCategoryFilter.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [foods, foodSearch, foodCategoryFilter]);

  // ====================================================
  // FOOD COUNTS
  // ====================================================

  const totalFoods = foods.length;

  const availableFoods = foods.filter((food) => food.available).length;

  const unavailableFoods = foods.filter((food) => !food.available).length;

  // ====================================================
  // CLEAR ORDER FILTERS
  // ====================================================

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setOrderTypeFilter("All");
  };

  // ====================================================
  // CLEAR FOOD FILTERS
  // ====================================================

  const handleClearFoodFilters = () => {
    setFoodSearch("");
    setFoodCategoryFilter("All");
  };

  // ====================================================
  // STATUS STYLE
  // ====================================================

  const getStatusStyle = (status) => {
    switch (status) {
      case "Delivered":
        return "border-green-200 bg-green-50 text-green-700";

      case "Cancelled":
        return "border-red-200 bg-red-50 text-red-700";

      case "Out for Delivery":
        return "border-blue-200 bg-blue-50 text-blue-700";

      case "Preparing":
        return "border-yellow-200 bg-yellow-50 text-yellow-700";

      default:
        return "border-orange-200 bg-orange-50 text-orange-700";
    }
  };

  // ====================================================
  // STATUS ICON
  // ====================================================

  const getStatusIcon = (status) => {
    switch (status) {
      case "Delivered":
        return "✅";

      case "Cancelled":
        return "❌";

      case "Out for Delivery":
        return "🚚";

      case "Preparing":
        return "👨‍🍳";

      default:
        return "📦";
    }
  };

  // ====================================================
  // UPDATE ORDER STATUS
  // ====================================================

  const handleStatusChange = async (orderId, newStatus) => {
    if (updatingOrderId) {
      return;
    }

    setUpdatingOrderId(orderId);

    try {
      const response = await authenticatedFetch(
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

      if (!response.ok) {
        alert(data.message || "Failed to update order status.");
        return;
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.orderId === orderId ? data.order : order,
        ),
      );

      if (selectedOrder?.orderId === orderId) {
        setSelectedOrder(data.order);
      }

      alert("✅ Order status updated successfully!");

      handleRefreshAnalytics();
    } catch (error) {
      console.error("Status update error:", error);

      alert("❌ Cannot connect to server.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // ====================================================
  // OPEN ADD FOOD FORM
  // ====================================================

  const openAddFoodForm = () => {
    setEditingFood(null);

    setFoodForm({ ...emptyFoodForm });

    setShowFoodForm(true);
  };

  // ====================================================
  // OPEN EDIT FOOD FORM
  // ====================================================

  const openEditFoodForm = (food) => {
    setEditingFood(food);

    setFoodForm({
      name: food.name || "",
      price: food.price ?? "",
      category: food.category || "Pizza",
      image: food.image || "",
      icon: food.icon || "🍽️",
      description: food.description || "",
      available: food.available !== false,
      // Existing foods without stock get 0 until stock is added.
      stock: food.stock ?? 0,
    });

    setShowFoodForm(true);
  };

  // ====================================================
  // CLOSE FOOD FORM
  // ====================================================

  const closeFoodForm = () => {
    if (savingFood) {
      return;
    }

    setShowFoodForm(false);

    setEditingFood(null);

    setFoodForm({ ...emptyFoodForm });
  };

  // ====================================================
  // FOOD FORM CHANGE
  // ====================================================

  const handleFoodFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFoodForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ====================================================
  // SAVE FOOD
  // ====================================================

  const handleSaveFood = async (event) => {
    event.preventDefault();

    if (savingFood) {
      return;
    }

    if (!foodForm.name.trim()) {
      alert("Please enter food name.");
      return;
    }

    if (
      foodForm.price === "" ||
      Number.isNaN(Number(foodForm.price)) ||
      Number(foodForm.price) < 0
    ) {
      alert("Please enter a valid food price.");
      return;
    }

    if (!foodForm.category.trim()) {
      alert("Please enter food category.");
      return;
    }

    // Inventory stock must be a whole number and cannot be negative.
    const numericStock = Number(foodForm.stock);

    if (
      foodForm.stock === "" ||
      !Number.isFinite(numericStock) ||
      !Number.isInteger(numericStock) ||
      numericStock < 0
    ) {
      alert("Please enter a valid stock quantity (0 or more).");
      return;
    }

    setSavingFood(true);

    try {
      const isEditing = Boolean(editingFood);

      const url = isEditing
        ? `http://localhost:5000/api/foods/${editingFood._id}`
        : "http://localhost:5000/api/foods";

      const response = await authenticatedFetch(url, {
        method: isEditing ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          name: foodForm.name.trim(),
          price: Number(foodForm.price),
          category: foodForm.category.trim(),
          image: foodForm.image.trim(),
          icon: foodForm.icon.trim() || "🍽️",
          description: foodForm.description.trim(),
          available: Boolean(foodForm.available),
          // Send trusted numeric stock to the inventory API.
          stock: numericStock,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to save food item.");
        return;
      }

      if (isEditing) {
        setFoods((currentFoods) =>
          currentFoods.map((food) =>
            food._id === editingFood._id ? data.food : food,
          ),
        );

        alert("✅ Food item updated successfully!");
      } else {
        setFoods((currentFoods) => [data.food, ...currentFoods]);

        alert("✅ Food item added successfully!");
      }

      closeFoodForm();
    } catch (error) {
      console.error("Save food error:", error);

      alert("❌ Cannot connect to server.");
    } finally {
      setSavingFood(false);
    }
  };

  // ====================================================
  // DELETE FOOD
  // ====================================================

  const handleDeleteFood = async (food) => {
    if (deletingFoodId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${food.name}" permanently?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingFoodId(food._id);

    try {
      const response = await authenticatedFetch(
        `http://localhost:5000/api/foods/${food._id}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to delete food item.");
        return;
      }

      setFoods((currentFoods) =>
        currentFoods.filter((item) => item._id !== food._id),
      );

      alert("✅ Food item deleted successfully!");
    } catch (error) {
      console.error("Delete food error:", error);

      alert("❌ Cannot connect to server.");
    } finally {
      setDeletingFoodId(null);
    }
  };

  // ====================================================
  // TOGGLE FOOD AVAILABILITY
  // ====================================================

  const handleToggleAvailability = async (food) => {
    if (savingFood || deletingFoodId) {
      return;
    }

    try {
      const response = await authenticatedFetch(
        `http://localhost:5000/api/foods/${food._id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            available: !food.available,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to update availability.");
        return;
      }

      setFoods((currentFoods) =>
        currentFoods.map((item) => (item._id === food._id ? data.food : item)),
      );
    } catch (error) {
      console.error("Availability update error:", error);

      alert("❌ Cannot connect to server.");
    }
  };

  // ====================================================
  // COMBO HELPERS
  // ====================================================

  const getComboOriginalPrice = (items) => {
    if (!Array.isArray(items)) {
      return 0;
    }

    return items.reduce((total, item) => {
      const foodId =
        typeof item?.foodId === "object" ? item.foodId?._id : item?.foodId;

      const food = foods.find((currentFood) => currentFood._id === foodId);

      return total + Number(food?.price || 0) * Number(item?.quantity || 0);
    }, 0);
  };

  const formatComboDate = (dateValue) => {
    if (!dateValue) {
      return "No date";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Invalid date";
    }

    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatComboDateTimeInput = (dateValue) => {
    if (!dateValue) {
      return "";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const pad = (value) => String(value).padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const openAddComboForm = () => {
    setEditingCombo(null);
    setComboForm({
      name: "",
      description: "",
      image: "",
      comboPrice: "",
      validFrom: "",
      validUntil: "",
      available: true,
      items: [],
    });
    setShowComboForm(true);
  };

  const openEditComboForm = (combo) => {
    const comboItems = Array.isArray(combo.items)
      ? combo.items.map((item) => ({
          foodId:
            typeof item.foodId === "object"
              ? item.foodId?._id || ""
              : item.foodId || "",
          quantity: Number(item.quantity || 1),
        }))
      : [];

    setEditingCombo(combo);
    setComboForm({
      name: combo.name || "",
      description: combo.description || "",
      image: combo.image || "",
      comboPrice: combo.comboPrice ?? "",
      validFrom: formatComboDateTimeInput(combo.validFrom),
      validUntil: formatComboDateTimeInput(combo.validUntil),
      available: combo.available !== false,
      items: comboItems,
    });
    setShowComboForm(true);
  };

  const closeComboForm = () => {
    if (savingCombo) {
      return;
    }

    setShowComboForm(false);
    setEditingCombo(null);
    setComboForm({
      name: "",
      description: "",
      image: "",
      comboPrice: "",
      validFrom: "",
      validUntil: "",
      available: true,
      items: [],
    });
  };

  const handleComboFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setComboForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleComboItemChange = (index, field, value) => {
    setComboForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: field === "quantity" ? Number(value) : value,
            }
          : item,
      ),
    }));
  };

  const addComboItem = () => {
    setComboForm((current) => ({
      ...current,
      items: [...current.items, { foodId: "", quantity: 1 }],
    }));
  };

  const removeComboItem = (index) => {
    setComboForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSaveCombo = async (event) => {
    event.preventDefault();

    if (savingCombo) {
      return;
    }

    if (!comboForm.name.trim()) {
      alert("Please enter combo name.");
      return;
    }

    if (!Array.isArray(comboForm.items) || comboForm.items.length === 0) {
      alert("Please add at least one food item to the combo.");
      return;
    }

    const validItems = comboForm.items.every(
      (item) =>
        item.foodId &&
        Number.isInteger(Number(item.quantity)) &&
        Number(item.quantity) >= 1,
    );

    if (!validItems) {
      alert("Please select a food and valid quantity for every combo item.");
      return;
    }

    const duplicateFoodIds = comboForm.items.map((item) => item.foodId);
    const hasDuplicates =
      new Set(duplicateFoodIds).size !== duplicateFoodIds.length;

    if (hasDuplicates) {
      alert(
        "Please do not add the same food twice. Increase its quantity instead.",
      );
      return;
    }

    const originalPrice = getComboOriginalPrice(comboForm.items);
    const comboPrice = Number(comboForm.comboPrice);

    if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
      alert(
        "Could not calculate combo original price. Please select valid foods.",
      );
      return;
    }

    if (!Number.isFinite(comboPrice) || comboPrice < 0) {
      alert("Please enter a valid combo price.");
      return;
    }

    if (comboPrice > originalPrice) {
      alert(
        `Combo price cannot be greater than original price (₹${originalPrice}).`,
      );
      return;
    }

    if (
      comboForm.validFrom &&
      comboForm.validUntil &&
      new Date(comboForm.validUntil).getTime() <
        new Date(comboForm.validFrom).getTime()
    ) {
      alert("Valid Until cannot be earlier than Valid From.");
      return;
    }

    setSavingCombo(true);

    try {
      const isEditing = Boolean(editingCombo);

      const url = isEditing
        ? `http://localhost:5000/api/combos/${editingCombo._id}`
        : "http://localhost:5000/api/combos";

      const response = await authenticatedFetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: comboForm.name.trim(),
          items: comboForm.items.map((item) => ({
            foodId: item.foodId,
            quantity: Number(item.quantity),
          })),
          originalPrice,
          comboPrice,
          description: comboForm.description.trim(),
          image: comboForm.image.trim(),
          available: Boolean(comboForm.available),
          validFrom: comboForm.validFrom
            ? new Date(comboForm.validFrom).toISOString()
            : null,
          validUntil: comboForm.validUntil
            ? new Date(comboForm.validUntil).toISOString()
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to save combo offer.");
        return;
      }

      if (isEditing) {
        setCombos((currentCombos) =>
          currentCombos.map((combo) =>
            combo._id === editingCombo._id ? data.combo : combo,
          ),
        );
        alert("✅ Combo offer updated successfully!");
      } else {
        setCombos((currentCombos) => [data.combo, ...currentCombos]);
        alert("✅ Combo offer added successfully!");
      }

      closeComboForm();
    } catch (error) {
      console.error("Save combo error:", error);
      alert("❌ Cannot connect to combo offer API.");
    } finally {
      setSavingCombo(false);
    }
  };

  const handleDeleteCombo = async (combo) => {
    if (deletingComboId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${combo.name}" permanently?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingComboId(combo._id);

    try {
      const response = await authenticatedFetch(
        `http://localhost:5000/api/combos/${combo._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to delete combo offer.");
        return;
      }

      setCombos((currentCombos) =>
        currentCombos.filter((item) => item._id !== combo._id),
      );

      alert("✅ Combo offer deleted successfully!");
    } catch (error) {
      console.error("Delete combo error:", error);
      alert("❌ Cannot connect to combo offer API.");
    } finally {
      setDeletingComboId(null);
    }
  };

  const handleToggleComboAvailability = async (combo) => {
    if (savingCombo || deletingComboId) {
      return;
    }

    try {
      const response = await authenticatedFetch(
        `http://localhost:5000/api/combos/${combo._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            available: !combo.available,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to update combo availability.");
        return;
      }

      setCombos((currentCombos) =>
        currentCombos.map((item) =>
          item._id === combo._id ? data.combo : item,
        ),
      );
    } catch (error) {
      console.error("Combo availability update error:", error);
      alert("❌ Cannot connect to combo offer API.");
    }
  };

  const handleRefreshCombos = async () => {
    if (!token || comboRefreshing) {
      return;
    }

    setComboRefreshing(true);
    setComboError("");

    try {
      const response = await authenticatedFetch(
        "http://localhost:5000/api/combos/admin/all",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setComboError(data.message || "Failed to refresh combo offers.");
        return;
      }

      setCombos(data.combos || []);
    } catch (error) {
      console.error("Combo refresh error:", error);
      setComboError("Cannot connect to combo offer API.");
    } finally {
      setComboRefreshing(false);
    }
  };

  const totalCombos = combos.length;
  const availableCombos = combos.filter((combo) => combo.available).length;
  const unavailableCombos = combos.filter((combo) => !combo.available).length;

  // ====================================================
  // ADMIN CHAT - FETCH CUSTOMERS
  // ====================================================

  const fetchChatCustomers = async () => {
    if (!token) {
      return;
    }

    try {
      setChatCustomersLoading(true);
      setChatCustomersError("");

      const response = await authenticatedFetch(
        "http://localhost:5000/api/chat/admin/customers",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setChatCustomersError(data.message || "Failed to load chat customers.");
        return;
      }

      // Backend customer list me customer details nested hain:
      // { customer, lastMessageAt, unreadCount }.
      // UI ke liye inhe flat object me normalize karte hain.
      setChatCustomers(
        (data.customers || []).map((item) => ({
          ...(item.customer || {}),
          lastMessageAt: item.lastMessageAt || null,
          unreadCount: Number(item.unreadCount || 0),
        })),
      );
      setChatCustomersError("");
    } catch (error) {
      console.error("Admin chat customers error:", error);
      setChatCustomersError(
        "Cannot connect to chat API. Please make sure the backend is running.",
      );
    } finally {
      setChatCustomersLoading(false);
    }
  };

  // Admin dashboard load hone par chat customers fetch karo.
  useEffect(() => {
    if (!loggedInUser || !token || loggedInUser.role !== "admin") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      fetchChatCustomers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [token, loggedInUser?.id, loggedInUser?.role]);

  // ====================================================
  // ADMIN CHAT - OPEN CUSTOMER
  // ====================================================

  const openChatCustomer = async (customer) => {
    if (!customer?._id || !token) {
      return;
    }

    const requestId = chatRequestIdRef.current + 1;
    chatRequestIdRef.current = requestId;

    // Cancel the previous conversation request so a slow response from an
    // older customer cannot overwrite the newly selected conversation.
    chatAbortControllerRef.current?.abort();
    const controller = new AbortController();
    chatAbortControllerRef.current = controller;

    setSelectedChatCustomer(customer);
    selectedChatCustomerRef.current = customer;
    setChatMessages([]);
    setChatMessagesLoading(true);
    setChatMessage("");

    try {
      const response = await authenticatedFetch(
        `http://localhost:5000/api/chat/admin/${customer._id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        },
      );

      const data = await response.json();

      // Ignore a response that belongs to an older customer selection.
      if (requestId !== chatRequestIdRef.current) {
        return;
      }

      if (!response.ok) {
        alert(data.message || "Failed to load conversation.");
        return;
      }

      setChatMessages(data.messages || []);

      // Conversation open hote hi customer ke unread messages read mark karo.
      // This request is intentionally independent from the conversation GET.
      await authenticatedFetch(
        `http://localhost:5000/api/chat/read/${customer._id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    } catch (error) {
      // Abort is expected when the admin switches customers quickly.
      if (error?.name === "AbortError") {
        return;
      }

      if (requestId !== chatRequestIdRef.current) {
        return;
      }

      console.error("Admin chat conversation error:", error);
      alert("❌ Cannot connect to chat server.");
    } finally {
      if (requestId === chatRequestIdRef.current) {
        setChatMessagesLoading(false);
      }

      if (chatAbortControllerRef.current === controller) {
        chatAbortControllerRef.current = null;
      }
    }
  };

  // Cancel any in-flight chat history request when Admin.jsx unmounts.
  useEffect(() => {
    return () => {
      chatRequestIdRef.current += 1;
      chatAbortControllerRef.current?.abort();
    };
  }, []);

  // ====================================================
  // ADMIN CHAT - SEND MESSAGE
  // ====================================================

  const handleSendChatMessage = async (event) => {
    event?.preventDefault();

    const messageText = chatMessage.trim();

    if (!messageText || !selectedChatCustomer || sendingChatMessage) {
      return;
    }

    try {
      setSendingChatMessage(true);

      const response = await authenticatedFetch(
        `http://localhost:5000/api/chat/admin/${selectedChatCustomer._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: messageText }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to send message.");
        return;
      }

      // POST API actual chat document ko `chatMessage` key me return karti hai.
      if (data.chatMessage) {
        setChatMessages((currentMessages) => {
          if (
            currentMessages.some((item) => item._id === data.chatMessage._id)
          ) {
            return currentMessages;
          }
          return [...currentMessages, data.chatMessage];
        });
      }

      setChatMessage("");
      fetchChatCustomers();
    } catch (error) {
      console.error("Admin chat send error:", error);
      alert("❌ Cannot connect to chat server.");
    } finally {
      setSendingChatMessage(false);
    }
  };

  // ====================================================
  // UNAUTHORIZED
  // ====================================================

  if (!loggedInUser || !token) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="text-center">
          <div className="text-5xl">🔐</div>

          <h2 className="mt-4 text-xl font-black text-gray-900">
            Checking Login...
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Redirecting to login page.
          </p>
        </div>
      </section>
    );
  }

  if (loggedInUser.role !== "admin") {
    return (
      <section className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="text-center">
          <div className="text-5xl">🚫</div>

          <h2 className="mt-4 text-xl font-black text-gray-900">
            Admin Access Required
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Redirecting to homepage...
          </p>
        </div>
      </section>
    );
  }

  // ====================================================
  // MAIN
  // ====================================================

  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/40 to-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="rounded-3xl bg-gradient-to-r from-gray-950 via-gray-900 to-orange-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/20 text-3xl">
                  👑
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-300">
                    RK Restaurant
                  </p>

                  <h1 className="text-2xl font-black sm:text-3xl">
                    Admin Dashboard
                  </h1>
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-300 sm:text-base">
                Welcome back,{" "}
                <span className="font-bold text-white">
                  {loggedInUser.name}
                </span>
                . Manage restaurant performance, menu and orders.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? "🔄 Refreshing..." : "🔄 Refresh Orders"}
              </button>

              <button
                type="button"
                onClick={handleRefreshAnalytics}
                disabled={analyticsLoading}
                className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analyticsLoading ? "📊 Loading..." : "📊 Refresh Analytics"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/inventory")}
                className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
              >
                📦 Inventory
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-500"
              >
                🏠 Website
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading && (
          <div className="mt-8 rounded-3xl bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />

            <h2 className="mt-5 text-xl font-black text-gray-900">
              Loading Dashboard
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Fetching latest restaurant data...
            </p>
          </div>
        )}

        {/* ==================================================
            ERROR
        ================================================== */}

        {!loading && errorMessage && (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="text-5xl">⚠️</div>

            <h2 className="mt-4 text-xl font-black text-red-800">
              Unable to Load Orders
            </h2>

            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="mt-6 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              🔄 Try Again
            </button>
          </div>
        )}

        {/* ==================================================
            DASHBOARD
        ================================================== */}

        {!loading && !errorMessage && (
          <>
            {/* ==================================================
                QUICK ACTIONS
            ================================================== */}
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-2xl bg-blue-500 p-6 text-left text-white shadow transition hover:bg-blue-600 disabled:opacity-60"
              >
                <div className="text-4xl">🔄</div>

                <h3 className="mt-3 text-lg font-bold">Refresh Orders</h3>

                <p className="mt-1 text-sm text-blue-100">Load latest orders</p>
              </button>

              <button
                type="button"
                onClick={openAddFoodForm}
                className="rounded-2xl bg-orange-500 p-6 text-left text-white shadow transition hover:bg-orange-600"
              >
                <div className="text-4xl">➕</div>

                <h3 className="mt-3 text-lg font-bold">Add Food</h3>

                <p className="mt-1 text-sm text-orange-100">
                  Add a new menu item
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-2xl bg-green-500 p-6 text-left text-white shadow transition hover:bg-green-600"
              >
                <div className="text-4xl">🌐</div>

                <h3 className="mt-3 text-lg font-bold">Open Website</h3>

                <p className="mt-1 text-sm text-green-100">
                  View customer website
                </p>
              </button>
            </div>
            {/* ==================================================
                MAIN STAT CARDS
            ================================================== */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <StatCard
                icon="📦"
                title="Total Orders"
                value={totalOrders}
                description="All orders"
                valueColor="text-gray-900"
              />

              <StatCard
                icon="🕐"
                title="Scheduled Orders"
                value={scheduledOrders.length}
                description={`${upcomingScheduledOrders.length} upcoming`}
                valueColor="text-purple-600"
              />

              <StatCard
                icon="💰"
                title="Total Sales"
                value={`₹${totalSales}`}
                description="Excluding cancelled"
                valueColor="text-green-600"
              />

              <StatCard
                icon="📅"
                title="Today Revenue"
                value={`₹${todayRevenue}`}
                description={`${todayOrders.length} orders today`}
                valueColor="text-orange-600"
              />

              <StatCard
                icon="⏳"
                title="Active Orders"
                value={activeOrders}
                description="Currently processing"
                valueColor="text-purple-600"
              />

              <StatCard
                icon="👨‍🍳"
                title="Preparing"
                value={preparingOrders}
                description="Kitchen orders"
                valueColor="text-yellow-600"
              />

              <StatCard
                icon="🚚"
                title="Delivery"
                value={outForDeliveryOrders}
                description="On the way"
                valueColor="text-blue-600"
              />

              <StatCard
                icon="✅"
                title="Delivered"
                value={deliveredOrders}
                description={`${cancelledOrders} cancelled`}
                valueColor="text-green-600"
              />
            </div>
            {/* ==================================================
                SALES ANALYTICS DASHBOARD
            ================================================== */}
            <div className="mt-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">
                    Sales Analytics
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
                    📊 Restaurant Performance
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Live sales insights powered by MongoDB analytics.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshAnalytics}
                  disabled={analyticsLoading}
                  className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {analyticsLoading
                    ? "📊 Loading Analytics..."
                    : "🔄 Refresh Analytics"}
                </button>
              </div>

              {/* ANALYTICS ERROR */}

              {analyticsError && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black text-red-800">
                        ⚠️ Analytics unavailable
                      </p>

                      <p className="mt-1 text-sm text-red-600">
                        {analyticsError}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRefreshAnalytics}
                      className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* ANALYTICS LOADING */}

              {analyticsLoading ? (
                <div className="mt-6 rounded-3xl bg-white p-12 text-center shadow-sm">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />

                  <h3 className="mt-4 text-lg font-black text-gray-900">
                    Loading Sales Analytics
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Fetching revenue and sales data...
                  </p>
                </div>
              ) : (
                <>
                  {/* ANALYTICS SUMMARY CARDS */}

                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            API Total Revenue
                          </p>

                          <p className="mt-2 text-3xl font-black text-green-600">
                            ₹{analytics.totalRevenue}
                          </p>
                        </div>

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-2xl">
                          💰
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            API Total Orders
                          </p>

                          <p className="mt-2 text-3xl font-black text-blue-600">
                            {analytics.totalOrders}
                          </p>
                        </div>

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                          📦
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Daily Records
                          </p>

                          <p className="mt-2 text-3xl font-black text-orange-600">
                            {dailyRevenueChartData.length}
                          </p>
                        </div>

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-2xl">
                          📅
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Top Items
                          </p>

                          <p className="mt-2 text-3xl font-black text-purple-600">
                            {topSellingChartData.length}
                          </p>
                        </div>

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-2xl">
                          🏆
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DAILY REVENUE CHART */}

                  <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                        Revenue Trend
                      </p>

                      <h3 className="mt-1 text-xl font-black text-gray-900">
                        💰 Daily Revenue
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Revenue generated on each order date.
                      </p>
                    </div>

                    {dailyRevenueChartData.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="text-5xl">📊</div>

                        <p className="mt-3 text-sm text-gray-500">
                          No daily revenue data available.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-6 h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={dailyRevenueChartData}
                            margin={{
                              top: 10,
                              right: 20,
                              left: 10,
                              bottom: 10,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />

                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11 }}
                              tickMargin={8}
                            />

                            <YAxis
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) => `₹${value}`}
                            />

                            <Tooltip
                              content={<ChartTooltip />}
                              cursor={{ strokeDasharray: "3 3" }}
                            />

                            <Line
                              type="monotone"
                              dataKey="revenue"
                              name="Revenue"
                              stroke="#f97316"
                              strokeWidth={3}
                              dot={{ r: 4 }}
                              activeDot={{ r: 7 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* DAILY ORDERS CHART */}

                  <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                        Order Trend
                      </p>

                      <h3 className="mt-1 text-xl font-black text-gray-900">
                        📦 Daily Orders
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Number of orders received each day.
                      </p>
                    </div>

                    {dailyRevenueChartData.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="text-5xl">📦</div>

                        <p className="mt-3 text-sm text-gray-500">
                          No daily order data available.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-6 h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={dailyRevenueChartData}
                            margin={{
                              top: 10,
                              right: 20,
                              left: 10,
                              bottom: 10,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />

                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11 }}
                              tickMargin={8}
                            />

                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 11 }}
                            />

                            <Tooltip
                              content={<ChartTooltip />}
                              cursor={{ fill: "rgba(249,115,22,0.08)" }}
                            />

                            <Bar
                              dataKey="orders"
                              name="Orders"
                              fill="#3b82f6"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* TOP SELLING + STATUS */}

                  <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {/* TOP SELLING ITEMS */}

                    <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
                          Product Performance
                        </p>

                        <h3 className="mt-1 text-xl font-black text-gray-900">
                          🏆 Top Selling Items
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          Best-performing menu items by quantity sold.
                        </p>
                      </div>

                      {topSellingChartData.length === 0 ? (
                        <div className="py-12 text-center">
                          <div className="text-5xl">🏆</div>

                          <p className="mt-3 text-sm text-gray-500">
                            No item sales data available.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-6 h-[360px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={topSellingChartData}
                              layout="vertical"
                              margin={{
                                top: 10,
                                right: 20,
                                left: 30,
                                bottom: 10,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />

                              <XAxis
                                type="number"
                                allowDecimals={false}
                                tick={{ fontSize: 11 }}
                              />

                              <YAxis
                                type="category"
                                dataKey="name"
                                width={120}
                                tick={{ fontSize: 11 }}
                              />

                              <Tooltip
                                content={<ChartTooltip />}
                                cursor={{
                                  fill: "rgba(168,85,247,0.08)",
                                }}
                              />

                              <Bar
                                dataKey="quantity"
                                name="Quantity Sold"
                                fill="#a855f7"
                                radius={[0, 6, 6, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* STATUS DISTRIBUTION */}

                    <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-green-600">
                          Order Performance
                        </p>

                        <h3 className="mt-1 text-xl font-black text-gray-900">
                          📊 Status Distribution
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          Current order status breakdown.
                        </p>
                      </div>

                      {statusChartData.length === 0 ? (
                        <div className="py-12 text-center">
                          <div className="text-5xl">📊</div>

                          <p className="mt-3 text-sm text-gray-500">
                            No status data available.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="mt-4 h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={statusChartData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={100}
                                  innerRadius={55}
                                  paddingAngle={3}
                                  label={({ name, percent }) =>
                                    `${name} ${Math.round(percent * 100)}%`
                                  }
                                >
                                  {statusChartData.map((entry, index) => (
                                    <Cell
                                      key={`status-cell-${entry.name}-${index}`}
                                      fill={
                                        statusChartColors[
                                          index % statusChartColors.length
                                        ]
                                      }
                                    />
                                  ))}
                                </Pie>

                                <Tooltip />

                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="mt-4 space-y-2">
                            {statusChartData.map((item, index) => (
                              <div
                                key={`${item.name}-${index}`}
                                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className="h-3 w-3 rounded-full"
                                    style={{
                                      backgroundColor:
                                        statusChartColors[
                                          index % statusChartColors.length
                                        ],
                                    }}
                                  />

                                  <span className="text-sm font-bold text-gray-700">
                                    {item.name}
                                  </span>
                                </div>

                                <span className="text-sm font-black text-gray-900">
                                  {item.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* ==================================================
                REVENUE ANALYTICS
            ================================================== */}
            <div className="mt-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">
                  Analytics
                </p>

                <h2 className="mt-1 text-2xl font-black text-gray-900">
                  Revenue & Performance
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Quick view of restaurant financial performance.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-500">
                        Total Revenue
                      </p>

                      <p className="mt-2 text-3xl font-black text-gray-900">
                        ₹{totalSales}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-2xl">
                      💰
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-500">Delivered Revenue</span>

                      <span className="text-green-600">
                        ₹{deliveredRevenue}
                      </span>
                    </div>

                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all duration-700"
                        style={{
                          width:
                            totalSales > 0
                              ? `${Math.min(
                                  (deliveredRevenue / totalSales) * 100,
                                  100,
                                )}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Pending revenue</span>

                    <span className="font-bold text-orange-600">
                      ₹{pendingRevenue}
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-500">
                        Average Order Value
                      </p>

                      <p className="mt-2 text-3xl font-black text-gray-900">
                        ₹{averageOrderValue}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                      📊
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-blue-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-500">
                      Calculation
                    </p>

                    <p className="mt-2 text-sm font-semibold text-blue-900">
                      Total revenue ÷ non-cancelled orders
                    </p>
                  </div>

                  <p className="mt-4 text-xs text-gray-400">
                    Based on {nonCancelledOrders.length} valid orders
                  </p>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-500">
                        Cancellation Rate
                      </p>

                      <p className="mt-2 text-3xl font-black text-gray-900">
                        {cancellationRate}%
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-2xl">
                      ❌
                    </div>
                  </div>

                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all duration-700"
                      style={{
                        width: `${Math.min(cancellationRate, 100)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Cancelled orders
                    </span>

                    <span className="font-bold text-red-600">
                      {cancelledOrders}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* ==================================================
                ORDER STATUS ANALYTICS
            ================================================== */}
            <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                    Order Analytics
                  </p>

                  <h2 className="mt-1 text-xl font-black text-gray-900">
                    Status Distribution
                  </h2>
                </div>

                <div className="mt-6 space-y-6">
                  <AnalyticsBar
                    label="Order Placed"
                    value={placedOrders}
                    total={totalOrders}
                    icon="📦"
                    barClass="bg-orange-500"
                  />

                  <AnalyticsBar
                    label="Preparing"
                    value={preparingOrders}
                    total={totalOrders}
                    icon="👨‍🍳"
                    barClass="bg-yellow-500"
                  />

                  <AnalyticsBar
                    label="Out for Delivery"
                    value={outForDeliveryOrders}
                    total={totalOrders}
                    icon="🚚"
                    barClass="bg-blue-500"
                  />

                  <AnalyticsBar
                    label="Delivered"
                    value={deliveredOrders}
                    total={totalOrders}
                    icon="✅"
                    barClass="bg-green-500"
                  />

                  <AnalyticsBar
                    label="Cancelled"
                    value={cancelledOrders}
                    total={totalOrders}
                    icon="❌"
                    barClass="bg-red-500"
                  />
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                      Activity
                    </p>

                    <h2 className="mt-1 text-xl font-black text-gray-900">
                      Recent Orders
                    </h2>
                  </div>

                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
                    Latest 5
                  </span>
                </div>

                {recentOrders.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="text-5xl">📦</div>

                    <p className="mt-3 text-sm text-gray-500">
                      No recent orders.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {recentOrders.map((order) => (
                      <div
                        key={order.orderId}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4 transition hover:bg-orange-50"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                            {getStatusIcon(order.status)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-gray-800">
                              #{order.orderId}
                            </p>

                            <p className="mt-1 truncate text-xs text-gray-500">
                              {order.name || "Customer"}
                            </p>
                          </div>
                        </div>

                        <div className="flex-shrink-0 text-right">
                          <p className="font-black text-orange-600">
                            ₹{Number(order.totalAmount || 0)}
                          </p>

                          <p className="mt-1 text-[10px] font-bold">
                            {order.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* ==================================================
                STATUS SUMMARY
            ================================================== */}
            <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">
                    Live Overview
                  </p>

                  <h2 className="mt-1 text-xl font-black text-gray-900">
                    Order Status Summary
                  </h2>
                </div>

                <div className="rounded-full bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">
                  {totalOrders} Total
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-2xl bg-orange-50 p-4 text-center">
                  <p className="text-2xl font-black text-orange-600">
                    {placedOrders}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-gray-600">
                    Order Placed
                  </p>
                </div>

                <div className="rounded-2xl bg-yellow-50 p-4 text-center">
                  <p className="text-2xl font-black text-yellow-600">
                    {preparingOrders}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-gray-600">
                    Preparing
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 p-4 text-center">
                  <p className="text-2xl font-black text-blue-600">
                    {outForDeliveryOrders}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-gray-600">
                    Delivery
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50 p-4 text-center">
                  <p className="text-2xl font-black text-green-600">
                    {deliveredOrders}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-gray-600">
                    Delivered
                  </p>
                </div>

                <div className="rounded-2xl bg-red-50 p-4 text-center">
                  <p className="text-2xl font-black text-red-600">
                    {cancelledOrders}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-gray-600">
                    Cancelled
                  </p>
                </div>

                <div className="rounded-2xl bg-purple-50 p-4 text-center">
                  <p className="text-2xl font-black text-purple-600">
                    {activeOrders}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-gray-600">
                    Active
                  </p>
                </div>
              </div>
            </div>
            {/* ==================================================
                ADMIN LIVE CHAT
            ================================================== */}
            <div className="mt-10 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
                    Customer Support
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-gray-900">
                    💬 Live Chat
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Customers ke messages yahin se read aur reply karein.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchChatCustomers}
                  disabled={chatCustomersLoading}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {chatCustomersLoading ? "🔄 Loading..." : "🔄 Refresh Chat"}
                </button>
              </div>

              {chatCustomersError && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {chatCustomersError}
                </div>
              )}

              <div className="mt-5 grid min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-gray-200 md:grid-cols-[280px_1fr]">
                {/* CUSTOMER LIST */}
                <div className="border-b border-gray-200 bg-gray-50 md:border-b-0 md:border-r">
                  <div className="border-b border-gray-200 bg-white px-4 py-3">
                    <p className="text-sm font-black text-gray-900">
                      Customers ({chatCustomers.length})
                    </p>
                  </div>

                  <div className="max-h-[460px] overflow-y-auto p-2">
                    {chatCustomersLoading ? (
                      <div className="p-6 text-center text-sm text-gray-500">
                        Loading customers...
                      </div>
                    ) : chatCustomers.length === 0 ? (
                      <div className="p-6 text-center">
                        <div className="text-4xl">💬</div>
                        <p className="mt-2 text-sm font-semibold text-gray-500">
                          No customer conversations yet.
                        </p>
                      </div>
                    ) : (
                      chatCustomers.map((customer) => {
                        const isSelected =
                          selectedChatCustomer?._id === customer._id;

                        return (
                          <button
                            key={customer._id}
                            type="button"
                            onClick={() => openChatCustomer(customer)}
                            className={`mb-2 w-full rounded-xl border p-3 text-left transition ${
                              isSelected
                                ? "border-orange-300 bg-orange-50"
                                : "border-gray-100 bg-white hover:border-orange-200 hover:bg-orange-50/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg">
                                👤
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-black text-gray-900">
                                  {customer.name || "Customer"}
                                </p>
                                <p className="truncate text-xs text-gray-500">
                                  {customer.phone || "No phone"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              {customer.lastMessage ? (
                                <p className="min-w-0 flex-1 truncate text-xs text-gray-500">
                                  {customer.lastMessage}
                                </p>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  No recent message
                                </span>
                              )}

                              {Number(customer.unreadCount || 0) > 0 && (
                                <span className="shrink-0 rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-black text-white">
                                  {customer.unreadCount}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* CHAT WINDOW */}
                <div className="flex min-h-[520px] flex-col bg-white">
                  {!selectedChatCustomer ? (
                    <div className="flex flex-1 items-center justify-center p-8 text-center">
                      <div>
                        <div className="text-6xl">💬</div>
                        <h3 className="mt-4 text-xl font-black text-gray-900">
                          Select a customer
                        </h3>
                        <p className="mt-2 max-w-sm text-sm text-gray-500">
                          Left side se customer select karke conversation open
                          karein.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-4 sm:px-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-xl">
                          👤
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-black text-gray-900">
                            {selectedChatCustomer.name || "Customer"}
                          </h3>
                          <p className="truncate text-xs text-gray-500">
                            {selectedChatCustomer.phone ||
                              "Customer support chat"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChatCustomer(null);
                            setChatMessages([]);
                            setChatMessage("");
                          }}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                        >
                          Close
                        </button>
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4 sm:p-5">
                        {chatMessagesLoading ? (
                          <div className="flex h-full items-center justify-center text-sm text-gray-500">
                            Loading conversation...
                          </div>
                        ) : chatMessages.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-center">
                            <div>
                              <div className="text-5xl">👋</div>
                              <p className="mt-3 text-sm font-semibold text-gray-500">
                                No messages yet.
                              </p>
                            </div>
                          </div>
                        ) : (
                          chatMessages.map((message) => {
                            const isAdminMessage =
                              message.senderRole === "admin";

                            return (
                              <div
                                key={message._id}
                                className={`flex ${
                                  isAdminMessage
                                    ? "justify-end"
                                    : "justify-start"
                                }`}
                              >
                                <div
                                  className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${
                                    isAdminMessage
                                      ? "rounded-br-md bg-orange-600 text-white"
                                      : "rounded-bl-md border border-gray-200 bg-white text-gray-800"
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                    {message.message}
                                  </p>
                                  <p
                                    className={`mt-1 text-[10px] ${
                                      isAdminMessage
                                        ? "text-orange-100"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {message.createdAt
                                      ? new Date(
                                          message.createdAt,
                                        ).toLocaleString()
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <form
                        onSubmit={handleSendChatMessage}
                        className="border-t border-gray-200 bg-white p-3 sm:p-4"
                      >
                        <div className="flex gap-2">
                          <input
                            type="text"
                            aria-label="Type your reply"
                            value={chatMessage}
                            onChange={(event) =>
                              setChatMessage(event.target.value)
                            }
                            maxLength={2000}
                            placeholder="Type your reply..."
                            disabled={sendingChatMessage}
                            className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-50"
                          />
                          <button
                            type="submit"
                            disabled={!chatMessage.trim() || sendingChatMessage}
                            className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {sendingChatMessage ? "Sending..." : "Send"}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
            //{" "}
            {/* ==================================================
                INVENTORY DASHBOARD// <InventoryDashboard token={token} />///// <InventoryDashboard token={token} />///
            ================================================== */}
            ////..
            {/* ==================================================
                FOOD MANAGEMENT
            ================================================== */}
            <div className="mt-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">
                    Menu Management
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
                    🍽️ Food Menu
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Add, edit, delete and control food availability.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAddFoodForm}
                  className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow transition hover:bg-orange-700"
                >
                  ➕ Add New Food
                </button>
              </div>

              {/* FOOD SUMMARY */}

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Total Foods
                  </p>

                  <p className="mt-2 text-3xl font-black text-gray-900">
                    {totalFoods}
                  </p>
                </div>

                <div className="rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-green-600">
                    Available
                  </p>

                  <p className="mt-2 text-3xl font-black text-green-700">
                    {availableFoods}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                    Unavailable
                  </p>

                  <p className="mt-2 text-3xl font-black text-red-700">
                    {unavailableFoods}
                  </p>
                </div>
              </div>

              {/* FOOD SEARCH */}

              <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                  <div className="lg:col-span-2">
                    <label
                      htmlFor="search-food"
                      className="mb-2 block text-sm font-bold text-gray-700"
                    >
                      🔎 Search Food
                    </label>

                    <input
                      type="text"
                      id="search-food"
                      value={foodSearch}
                      onChange={(event) => setFoodSearch(event.target.value)}
                      placeholder="Search food name, category..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="food-category-filter"
                      className="mb-2 block text-sm font-bold text-gray-700"
                    >
                      🏷️ Category
                    </label>

                    <select
                      id="food-category-filter"
                      value={foodCategoryFilter}
                      onChange={(event) =>
                        setFoodCategoryFilter(event.target.value)
                      }
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      {foodCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={handleClearFoodFilters}
                      disabled={
                        foodSearch === "" && foodCategoryFilter === "All"
                      }
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ✖️ Clear
                    </button>

                    <button
                      type="button"
                      onClick={handleRefreshFoods}
                      disabled={foodRefreshing}
                      className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
                    >
                      {foodRefreshing ? "🔄" : "🔄 Refresh"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 border-t pt-4 text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-black text-orange-600">
                    {filteredFoods.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-black text-gray-900">{totalFoods}</span>{" "}
                  foods
                </div>
              </div>

              {/* FOOD ERROR */}

              {foodError && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                  <p className="font-bold text-red-700">⚠️ {foodError}</p>

                  <button
                    type="button"
                    onClick={handleRefreshFoods}
                    className="mt-3 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* FOOD LOADING */}

              {foodLoading ? (
                <div className="mt-6 rounded-3xl bg-white p-12 text-center shadow-sm">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />

                  <p className="mt-4 font-bold text-gray-600">
                    Loading food menu...
                  </p>
                </div>
              ) : filteredFoods.length === 0 ? (
                <div className="mt-6 rounded-3xl bg-white p-12 text-center shadow-sm">
                  <div className="text-6xl">🍽️</div>

                  <h3 className="mt-5 text-2xl font-black text-gray-900">
                    No Food Found
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Add a new food item or change your filters.
                  </p>

                  <button
                    type="button"
                    onClick={openAddFoodForm}
                    className="mt-6 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
                  >
                    ➕ Add Food
                  </button>
                </div>
              ) : (
                <>
                  {/* DESKTOP FOOD TABLE */}

                  <div className="mt-6 hidden overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm md:block">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1050px]">
                        <thead className="bg-gray-950 text-left text-xs font-bold uppercase tracking-wider text-gray-300">
                          <tr>
                            <th className="px-5 py-4">Food</th>

                            <th className="px-5 py-4">Category</th>

                            <th className="px-5 py-4">Price</th>

                            <th className="px-5 py-4">Availability</th>

                            <th className="px-5 py-4">Description</th>

                            <th className="px-5 py-4 text-right">Actions</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                          {filteredFoods.map((food) => (
                            <tr
                              key={food._id}
                              className="transition hover:bg-orange-50/40"
                            >
                              <td className="px-5 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-orange-50">
                                    <FoodImage
                                      src={food.image}
                                      alt={food.name}
                                      icon={food.icon}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>

                                  <div className="min-w-0">
                                    <p className="font-black text-gray-900">
                                      {food.name}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-400">
                                      ID: {String(food._id).slice(-8)}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-5">
                                <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">
                                  {food.category}
                                </span>
                              </td>

                              <td className="px-5 py-5">
                                <p className="font-black text-orange-600">
                                  ₹{Number(food.price || 0)}
                                </p>
                              </td>

                              <td className="px-5 py-5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAvailability(food)}
                                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                                    food.available
                                      ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                      : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                  }`}
                                >
                                  {food.available
                                    ? "🟢 Available"
                                    : "🔴 Unavailable"}
                                </button>
                              </td>

                              <td className="px-5 py-5">
                                <p className="max-w-[250px] truncate text-sm text-gray-500">
                                  {food.description ||
                                    "No description available."}
                                </p>
                              </td>

                              <td className="px-5 py-5">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openEditFoodForm(food)}
                                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                                  >
                                    ✏️ Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFood(food)}
                                    disabled={deletingFoodId === food._id}
                                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {deletingFoodId === food._id
                                      ? "⏳"
                                      : "🗑️ Delete"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* MOBILE FOOD CARDS */}

                  <div className="mt-6 space-y-4 md:hidden">
                    {filteredFoods.map((food) => (
                      <div
                        key={food._id}
                        className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
                      >
                        <div className="flex gap-4 p-5">
                          <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-orange-50">
                            <FoodImage
                              src={food.image}
                              alt={food.name}
                              icon={food.icon}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-black text-gray-900">
                                {food.name}
                              </h3>

                              <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700">
                                {food.category}
                              </span>
                            </div>

                            <p className="mt-2 text-xl font-black text-orange-600">
                              ₹{Number(food.price || 0)}
                            </p>

                            <button
                              type="button"
                              onClick={() => handleToggleAvailability(food)}
                              className={`mt-2 rounded-full border px-3 py-1 text-xs font-bold ${
                                food.available
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : "border-red-200 bg-red-50 text-red-700"
                              }`}
                            >
                              {food.available
                                ? "🟢 Available"
                                : "🔴 Unavailable"}
                            </button>
                          </div>
                        </div>

                        <div className="border-t bg-gray-50 p-5">
                          <p className="text-sm leading-6 text-gray-600">
                            {food.description || "No description available."}
                          </p>

                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditFoodForm(food)}
                              className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700"
                            >
                              ✏️ Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteFood(food)}
                              disabled={deletingFoodId === food._id}
                              className="flex-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"
                            >
                              {deletingFoodId === food._id
                                ? "⏳ Deleting..."
                                : "🗑️ Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            {/* ==================================================
                ORDER MANAGEMENT
            ================================================== */}
            <div className="mt-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">
                    Order Management
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
                    📋 Orders
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Manage customer orders and delivery status.
                  </p>
                </div>

                <div className="rounded-full bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">
                  Showing {filteredOrders.length} of {totalOrders}
                </div>
              </div>

              {/* ORDER SEARCH */}

              {orders.length > 0 && (
                <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <div className="lg:col-span-2">
                      <label
                        htmlFor="search-orders"
                        className="mb-2 block text-sm font-bold text-gray-700"
                      >
                        🔎 Search Orders
                      </label>

                      <input
                        type="text"
                        id="search-orders"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Order ID, customer name or phone..."
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="order-status-filter"
                        className="mb-2 block text-sm font-bold text-gray-700"
                      >
                        📋 Status
                      </label>

                      <select
                        id="order-status-filter"
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                      >
                        {filterStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="order-type-filter"
                        className="mb-2 block text-sm font-bold text-gray-700"
                      >
                        🕐 Order Type
                      </label>

                      <select
                        id="order-type-filter"
                        value={orderTypeFilter}
                        onChange={(event) =>
                          setOrderTypeFilter(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                      >
                        <option value="All">All Orders</option>
                        <option value="Immediate">Immediate</option>
                        <option value="Scheduled">Scheduled</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        disabled={searchTerm === "" && statusFilter === "All"}
                        className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ✖️ Clear Filters
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-gray-600">
                      Showing{" "}
                      <span className="font-black text-orange-600">
                        {filteredOrders.length}
                      </span>{" "}
                      of{" "}
                      <span className="font-black text-gray-900">
                        {orders.length}
                      </span>{" "}
                      orders
                    </p>

                    {(searchTerm ||
                      statusFilter !== "All" ||
                      orderTypeFilter !== "All") && (
                      <p className="font-semibold text-orange-600">
                        Filters active
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ORDERS */}

              {orders.length === 0 ? (
                <div className="mt-6 rounded-3xl bg-white p-12 text-center shadow-sm">
                  <div className="text-6xl">📦</div>

                  <h3 className="mt-5 text-2xl font-black text-gray-900">
                    No Orders Found
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    New customer orders will appear here.
                  </p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="mt-6 rounded-3xl bg-white p-12 text-center shadow-sm">
                  <div className="text-6xl">🔍</div>

                  <h3 className="mt-5 text-2xl font-black text-gray-900">
                    No Matching Orders
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Try another search or change the status filter.
                  </p>

                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="mt-6 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                  {/* DESKTOP TABLE */}

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-gray-950 text-left text-xs font-bold uppercase tracking-wider text-gray-300">
                        <tr>
                          <th className="px-5 py-4">Order</th>

                          <th className="px-5 py-4">Customer</th>

                          <th className="px-5 py-4">Items</th>

                          <th className="px-5 py-4">Amount</th>

                          <th className="px-5 py-4">Date</th>

                          <th className="px-5 py-4">Status</th>

                          <th className="px-5 py-4 text-right">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {filteredOrders.map((order) => (
                          <tr
                            key={order.orderId}
                            className="transition hover:bg-orange-50/40"
                          >
                            <td className="px-5 py-5">
                              <p className="font-black text-orange-600">
                                #{order.orderId}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">ID</p>
                              <div className="mt-2">
                                {getScheduleBadge(order)}
                              </div>
                            </td>

                            <td className="px-5 py-5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-lg">
                                  👤
                                </div>

                                <div>
                                  <p className="font-bold text-gray-800">
                                    {order.name || "Unknown"}
                                  </p>

                                  <p className="mt-1 text-xs text-gray-500">
                                    {order.phone || "No phone"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-5">
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                                {(order.items || []).length}{" "}
                                {(order.items || []).length === 1
                                  ? "Item"
                                  : "Items"}
                              </span>

                              <p className="mt-2 max-w-[180px] truncate text-xs text-gray-500">
                                {(order.items || [])
                                  .map(
                                    (item) =>
                                      `${item.name || "Food"} × ${
                                        item.quantity || 1
                                      }`,
                                  )
                                  .join(", ")}
                              </p>
                            </td>

                            <td className="px-5 py-5">
                              <p className="font-black text-gray-900">
                                ₹{Number(order.totalAmount || 0)}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">
                                {order.paymentMethod || "Razorpay"}
                              </p>
                            </td>

                            <td className="px-5 py-5">
                              <p className="text-sm font-semibold text-gray-700">
                                {order.createdAt
                                  ? new Date(
                                      order.createdAt,
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">
                                {order.createdAt
                                  ? new Date(
                                      order.createdAt,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : ""}
                              </p>

                              {isScheduledOrder(order) && (
                                <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50 p-2.5">
                                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-500">
                                    Scheduled Delivery
                                  </p>
                                  <p className="mt-1 text-xs font-black text-purple-800">
                                    📅 {formatScheduledDate(order.scheduledFor)}
                                  </p>
                                  <p className="mt-1 text-xs font-bold text-purple-700">
                                    ⏰ {formatScheduledTime(order.scheduledFor)}
                                  </p>
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-5">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                                  order.status,
                                )}`}
                              >
                                {getStatusIcon(order.status)} {order.status}
                              </span>
                            </td>

                            <td className="px-5 py-5">
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrder(order)}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600"
                                >
                                  👁️ Details
                                </button>

                                <select
                                  value={order.status}
                                  onChange={(event) =>
                                    handleStatusChange(
                                      order.orderId,
                                      event.target.value,
                                    )
                                  }
                                  disabled={
                                    order.status === "Delivered" ||
                                    order.status === "Cancelled" ||
                                    updatingOrderId === order.orderId
                                  }
                                  className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-bold outline-none focus:border-orange-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                                >
                                  <option value="Order Placed">
                                    Order Placed
                                  </option>

                                  <option value="Preparing">Preparing</option>

                                  <option value="Out for Delivery">
                                    Out for Delivery
                                  </option>

                                  <option value="Delivered">Delivered</option>
                                </select>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARDS */}

                  <div className="divide-y divide-gray-100 md:hidden">
                    {filteredOrders.map((order) => (
                      <div key={order.orderId} className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                              Order
                            </p>

                            <h3 className="mt-1 font-black text-orange-600">
                              #{order.orderId}
                            </h3>
                            <div className="mt-2">
                              {getScheduleBadge(order)}
                            </div>
                          </div>

                          <span
                            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                              order.status,
                            )}`}
                          >
                            {getStatusIcon(order.status)} {order.status}
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-4">
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-bold text-gray-400">
                              CUSTOMER
                            </p>

                            <p className="mt-1 font-bold text-gray-800">
                              {order.name || "Unknown"}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {order.phone || "No phone"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-bold text-gray-400">
                              AMOUNT
                            </p>

                            <p className="mt-1 text-lg font-black text-orange-600">
                              ₹{Number(order.totalAmount || 0)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl bg-gray-50 p-3">
                          <p className="text-xs font-bold text-gray-400">
                            ITEMS
                          </p>

                          <p className="mt-1 text-sm font-semibold text-gray-700">
                            {(order.items || [])
                              .map(
                                (item) =>
                                  `${item.name || "Food"} × ${
                                    item.quantity || 1
                                  }`,
                              )
                              .join(", ")}
                          </p>
                        </div>

                        <div className="mt-4 text-xs text-gray-500">
                          📅{" "}
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleString()
                            : "Date unavailable"}
                        </div>

                        {isScheduledOrder(order) && (
                          <div className="mt-4 rounded-2xl border border-purple-100 bg-purple-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wider text-purple-500">
                              🕐 Scheduled Delivery
                            </p>
                            <p className="mt-2 font-black text-purple-800">
                              📅 {formatScheduledDate(order.scheduledFor)}
                            </p>
                            <p className="mt-1 text-sm font-bold text-purple-700">
                              ⏰ {formatScheduledTime(order.scheduledFor)}
                            </p>
                          </div>
                        )}

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                          >
                            👁️ Details
                          </button>

                          <select
                            value={order.status}
                            onChange={(event) =>
                              handleStatusChange(
                                order.orderId,
                                event.target.value,
                              )
                            }
                            disabled={
                              order.status === "Delivered" ||
                              order.status === "Cancelled" ||
                              updatingOrderId === order.orderId
                            }
                            className="flex-1 rounded-xl border border-gray-200 bg-white px-2 py-2.5 text-xs font-bold outline-none disabled:bg-gray-100"
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
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ======================================================
          ADD / EDIT FOOD MODAL
      ====================================================== */}

      {showFoodForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={closeFoodForm}
        >
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* FORM HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                  Menu Management
                </p>

                <h2 className="mt-1 text-xl font-black text-gray-900">
                  {editingFood ? "✏️ Edit Food" : "➕ Add New Food"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeFoodForm}
                disabled={savingFood}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-600 transition hover:bg-gray-200 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* FORM */}

            <form onSubmit={handleSaveFood} className="p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* NAME */}

                <div className="sm:col-span-2">
                  <label
                    htmlFor="food-name"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Food Name *
                  </label>

                  <input
                    type="text"
                    id="food-name"
                    name="name"
                    value={foodForm.name}
                    onChange={handleFoodFormChange}
                    placeholder="e.g. Margherita Pizza"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </div>

                {/* PRICE */}

                <div>
                  <label
                    htmlFor="food-price"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Price (₹) *
                  </label>

                  <input
                    type="number"
                    id="food-price"
                    name="price"
                    value={foodForm.price}
                    onChange={handleFoodFormChange}
                    placeholder="249"
                    min="0"
                    step="1"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </div>

                {/* STOCK */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    📦 Stock Quantity *
                  </label>

                  <input
                    type="number"
                    name="stock"
                    value={foodForm.stock}
                    onChange={handleFoodFormChange}
                    placeholder="50"
                    min="0"
                    step="1"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    required
                  />

                  <p className="mt-2 text-xs text-gray-400">
                    Enter the current available quantity.
                  </p>
                </div>

                {/* CATEGORY */}

                <div>
                  <label
                    htmlFor="food-category"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Category *
                  </label>

                  <select
                    id="food-category"
                    name="category"
                    value={foodForm.category}
                    onChange={handleFoodFormChange}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    required
                  >
                    {foodCategories
                      .filter((category) => category !== "All")
                      .map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                  </select>
                </div>

                {/* ICON */}

                <div>
                  <label
                    htmlFor="food-icon"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Food Icon / Emoji
                  </label>

                  <input
                    type="text"
                    id="food-icon"
                    name="icon"
                    value={foodForm.icon}
                    onChange={handleFoodFormChange}
                    placeholder="🍕"
                    maxLength="10"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xl outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                {/* IMAGE */}

                <div>
                  <label
                    htmlFor="food-image"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Image Path / URL
                  </label>

                  <input
                    type="text"
                    id="food-image"
                    name="image"
                    value={foodForm.image}
                    onChange={handleFoodFormChange}
                    placeholder="/images/burger.jpg or https://..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />

                  <p className="mt-2 text-xs text-gray-400">
                    Local image: /images/burger.jpg &nbsp; | &nbsp; Online
                    image: https://example.com/image.jpg
                  </p>
                </div>

                {/* DESCRIPTION */}

                <div className="sm:col-span-2">
                  <label
                    htmlFor="food-description"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Description
                  </label>

                  <textarea
                    id="food-description"
                    name="description"
                    value={foodForm.description}
                    onChange={handleFoodFormChange}
                    placeholder="Describe the food item..."
                    rows="4"
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                {/* AVAILABLE */}

                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-orange-50">
                    <input
                      type="checkbox"
                      name="available"
                      checked={foodForm.available}
                      onChange={handleFoodFormChange}
                      className="h-5 w-5 accent-orange-600"
                    />

                    <div>
                      <p className="font-bold text-gray-800">
                        Food is Available
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Available food items will appear on the customer menu.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* PREVIEW */}

              <div className="mt-6 rounded-2xl bg-orange-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                  Preview
                </p>

                <div className="mt-4 flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl bg-white">
                    <FoodImage
                      src={foodForm.image}
                      alt={foodForm.name || "Food preview"}
                      icon={foodForm.icon}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-gray-900">
                      {foodForm.name || "Food Name"}
                    </h3>

                    <p className="mt-1 text-sm font-bold text-orange-600">
                      ₹{foodForm.price || "0"}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      {foodForm.category}
                    </p>
                  </div>
                </div>
              </div>

              {/* FORM ACTIONS */}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeFoodForm}
                  disabled={savingFood}
                  className="rounded-xl border border-gray-200 bg-gray-100 px-6 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingFood}
                  className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingFood
                    ? "⏳ Saving..."
                    : editingFood
                      ? "💾 Update Food"
                      : "➕ Add Food"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          COMBO OFFER MANAGEMENT
      ====================================================== */}

      <div className="mt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-purple-600">
              Combo Offers
            </p>

            <h2 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
              🎁 Combo Offer Management
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Create discounted food combinations and manage their availability.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddComboForm}
            className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white shadow transition hover:bg-purple-700"
          >
            ➕ Add Combo Offer
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Total Combos
            </p>
            <p className="mt-2 text-3xl font-black text-gray-900">
              {totalCombos}
            </p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-green-600">
              Available
            </p>
            <p className="mt-2 text-3xl font-black text-green-700">
              {availableCombos}
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600">
              Unavailable
            </p>
            <p className="mt-2 text-3xl font-black text-red-700">
              {unavailableCombos}
            </p>
          </div>
        </div>

        {comboError && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-bold text-red-700">⚠️ {comboError}</p>

              <button
                type="button"
                onClick={handleRefreshCombos}
                disabled={comboRefreshing}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {comboRefreshing ? "🔄 Refreshing..." : "Try Again"}
              </button>
            </div>
          </div>
        )}

        {comboLoading ? (
          <div className="mt-6 rounded-3xl bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
            <p className="mt-4 font-bold text-gray-600">
              Loading combo offers...
            </p>
          </div>
        ) : combos.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white p-12 text-center shadow-sm">
            <div className="text-6xl">🎁</div>

            <h3 className="mt-5 text-2xl font-black text-gray-900">
              No Combo Offers
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Create your first combo offer from the button below.
            </p>

            <button
              type="button"
              onClick={openAddComboForm}
              className="mt-6 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-purple-700"
            >
              ➕ Create Combo
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {combos.map((combo) => {
                const comboItems = Array.isArray(combo.items)
                  ? combo.items
                  : [];

                const calculatedOriginalPrice =
                  Number(combo.originalPrice || 0) ||
                  getComboOriginalPrice(comboItems);

                const discount =
                  calculatedOriginalPrice > 0
                    ? Math.round(
                        ((calculatedOriginalPrice -
                          Number(combo.comboPrice || 0)) /
                          calculatedOriginalPrice) *
                          100,
                      )
                    : 0;

                return (
                  <div
                    key={combo._id}
                    className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative h-44 bg-purple-50">
                      <FoodImage
                        src={combo.image}
                        alt={combo.name}
                        icon="🎁"
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute left-3 top-3">
                        <span
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                            combo.available
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {combo.available ? "🟢 Available" : "🔴 Unavailable"}
                        </span>
                      </div>

                      {discount > 0 && (
                        <div className="absolute right-3 top-3 rounded-full bg-purple-600 px-3 py-1.5 text-xs font-black text-white">
                          {discount}% OFF
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-gray-900">
                            {combo.name}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {combo.description || "No description available."}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleComboAvailability(combo)}
                          className="flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                          title="Toggle availability"
                        >
                          {combo.available ? "ON" : "OFF"}
                        </button>
                      </div>

                      <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Combo Items
                        </p>

                        <div className="mt-3 space-y-2">
                          {comboItems.map((item, index) => {
                            const food =
                              typeof item.foodId === "object"
                                ? item.foodId
                                : foods.find(
                                    (currentFood) =>
                                      currentFood._id === item.foodId,
                                  );

                            return (
                              <div
                                key={`${combo._id}-${index}`}
                                className="flex items-center justify-between gap-3 text-sm"
                              >
                                <span className="min-w-0 truncate font-semibold text-gray-700">
                                  {food?.name || "Food item"}
                                </span>

                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-purple-700">
                                  ×{Number(item.quantity || 1)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-400 line-through">
                            ₹{calculatedOriginalPrice}
                          </p>

                          <p className="text-2xl font-black text-purple-600">
                            ₹{Number(combo.comboPrice || 0)}
                          </p>
                        </div>

                        <div className="text-right text-xs text-gray-500">
                          <p>
                            From:{" "}
                            <span className="font-bold text-gray-700">
                              {formatComboDate(combo.validFrom)}
                            </span>
                          </p>

                          <p className="mt-1">
                            Until:{" "}
                            <span className="font-bold text-gray-700">
                              {formatComboDate(combo.validUntil)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditComboForm(combo)}
                          className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                        >
                          ✏️ Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCombo(combo)}
                          disabled={deletingComboId === combo._id}
                          className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingComboId === combo._id
                            ? "⏳ Deleting..."
                            : "🗑️ Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleRefreshCombos}
                disabled={comboRefreshing}
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-600 disabled:opacity-60"
              >
                {comboRefreshing ? "🔄 Refreshing..." : "🔄 Refresh Combos"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ======================================================
          COMBO FORM MODAL
      ====================================================== */}

      {showComboForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={closeComboForm}
        >
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-600">
                  Combo Offer
                </p>

                <h2 className="mt-1 text-xl font-black text-gray-900 sm:text-2xl">
                  {editingCombo ? "✏️ Edit Combo Offer" : "➕ Add Combo Offer"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeComboForm}
                disabled={savingCombo}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-black text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCombo} className="p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="combo-name"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Combo Name *
                  </label>

                  <input
                    type="text"
                    id="combo-name"
                    name="name"
                    value={comboForm.name}
                    onChange={handleComboFormChange}
                    placeholder="Example: Family Feast Combo"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="combo-price"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Combo Price *
                  </label>

                  <input
                    type="number"
                    id="combo-price"
                    name="comboPrice"
                    min="0"
                    step="1"
                    value={comboForm.comboPrice}
                    onChange={handleComboFormChange}
                    placeholder="299"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="combo-image"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Image URL
                  </label>

                  <input
                    type="url"
                    id="combo-image"
                    name="image"
                    value={comboForm.image}
                    onChange={handleComboFormChange}
                    placeholder="https://example.com/combo.jpg"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="combo-description"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Description
                  </label>

                  <textarea
                    id="combo-description"
                    name="description"
                    value={comboForm.description}
                    onChange={handleComboFormChange}
                    rows="3"
                    placeholder="Describe what is included in this combo..."
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="combo-valid-from"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Valid From
                  </label>

                  <input
                    type="datetime-local"
                    id="combo-valid-from"
                    name="validFrom"
                    value={comboForm.validFrom}
                    onChange={handleComboFormChange}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="combo-valid-until"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Valid Until
                  </label>

                  <input
                    type="datetime-local"
                    id="combo-valid-until"
                    name="validUntil"
                    value={comboForm.validUntil}
                    onChange={handleComboFormChange}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-100"
                  />
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-purple-100 bg-purple-50/50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-black text-gray-900">
                      🍔 Combo Food Items
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Select foods and their quantities.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addComboItem}
                    className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700"
                  >
                    ➕ Add Food Item
                  </button>
                </div>

                {comboForm.items.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-purple-200 bg-white p-6 text-center">
                    <p className="text-sm font-semibold text-gray-500">
                      No food items added yet.
                    </p>

                    <button
                      type="button"
                      onClick={addComboItem}
                      className="mt-3 text-sm font-black text-purple-600 hover:text-purple-700"
                    >
                      Add the first item →
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {comboForm.items.map((item, index) => (
                      <div
                        key={`combo-item-${index}`}
                        className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 sm:grid-cols-[1fr_130px_auto]"
                      >
                        <div>
                          <label className="mb-2 block text-xs font-bold text-gray-500">
                            Food
                          </label>

                          <select
                            value={item.foodId}
                            onChange={(event) =>
                              handleComboItemChange(
                                index,
                                "foodId",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-semibold outline-none focus:border-purple-500 focus:bg-white"
                          >
                            <option value="">Select food</option>

                            {foods
                              .filter((food) => food.available)
                              .map((food) => (
                                <option key={food._id} value={food._id}>
                                  {food.name} — ₹{Number(food.price || 0)}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-bold text-gray-500">
                            Quantity
                          </label>

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              handleComboItemChange(
                                index,
                                "quantity",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-semibold outline-none focus:border-purple-500 focus:bg-white"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeComboItem(index)}
                            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 sm:w-auto"
                          >
                            🗑️ Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Calculated Original Price
                    </p>

                    <p className="mt-1 text-xl font-black text-gray-900">
                      ₹{getComboOriginalPrice(comboForm.items)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Your Combo Price
                    </p>

                    <p className="mt-1 text-xl font-black text-purple-600">
                      ₹{Number(comboForm.comboPrice || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <input
                  type="checkbox"
                  name="available"
                  checked={comboForm.available}
                  onChange={handleComboFormChange}
                  className="h-5 w-5 accent-purple-600"
                />

                <span>
                  <span className="block text-sm font-black text-gray-800">
                    Combo is available
                  </span>

                  <span className="mt-1 block text-xs text-gray-500">
                    Customers can see/order this combo when available.
                  </span>
                </span>
              </label>

              {comboForm.image && (
                <div className="mt-5 overflow-hidden rounded-3xl border border-gray-100 bg-gray-50">
                  <p className="border-b bg-white px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Image Preview
                  </p>

                  <div className="h-52">
                    <FoodImage
                      src={comboForm.image}
                      alt={comboForm.name || "Combo"}
                      icon="🎁"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeComboForm}
                  disabled={savingCombo}
                  className="rounded-xl border border-gray-200 bg-gray-100 px-6 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingCombo}
                  className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white shadow transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingCombo
                    ? "⏳ Saving..."
                    : editingCombo
                      ? "💾 Update Combo"
                      : "➕ Create Combo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          ORDER DETAILS MODAL
      ====================================================== */}

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Order Details
                </p>

                <h2 className="mt-1 text-xl font-black text-orange-600">
                  #{selectedOrder.orderId}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-600 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {/* STATUS */}

              <div className="rounded-2xl bg-gray-50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-400">
                      Current Status
                    </p>

                    <p className="mt-1 font-black text-gray-800">
                      {getStatusIcon(selectedOrder.status)}{" "}
                      {selectedOrder.status}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-4 py-2 text-sm font-bold ${getStatusStyle(
                      selectedOrder.status,
                    )}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* SCHEDULE INFORMATION */}

              <div
                className={`mt-5 rounded-2xl border p-5 ${
                  isScheduledOrder(selectedOrder)
                    ? "border-purple-200 bg-purple-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Order Type
                    </p>
                    <p className="mt-1 font-black text-gray-800">
                      {isScheduledOrder(selectedOrder)
                        ? "🕐 Scheduled Order"
                        : "⚡ Immediate Order"}
                    </p>
                  </div>

                  {getScheduleBadge(selectedOrder)}
                </div>

                {isScheduledOrder(selectedOrder) && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-4">
                      <p className="text-xs font-bold text-gray-400">
                        SCHEDULED DATE
                      </p>
                      <p className="mt-1 font-black text-purple-800">
                        📅 {formatScheduledDate(selectedOrder.scheduledFor)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-4">
                      <p className="text-xs font-bold text-gray-400">
                        SCHEDULED TIME
                      </p>
                      <p className="mt-1 font-black text-purple-800">
                        ⏰ {formatScheduledTime(selectedOrder.scheduledFor)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* CUSTOMER */}

              <div className="mt-5 rounded-2xl border border-gray-100 p-5">
                <h3 className="font-black text-gray-900">
                  👤 Customer Information
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold text-gray-400">NAME</p>

                    <p className="mt-1 font-semibold text-gray-800">
                      {selectedOrder.name || "Not available"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-400">PHONE</p>

                    <p className="mt-1 font-semibold text-gray-800">
                      {selectedOrder.phone || "Not available"}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold text-gray-400">ADDRESS</p>

                    <p className="mt-1 text-sm leading-6 text-gray-700">
                      {selectedOrder.address || "Not available"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ITEMS */}

              <div className="mt-5 rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-gray-900">🛒 Ordered Items</h3>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                    {(selectedOrder.items || []).length} Items
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {(selectedOrder.items || []).map((item, index) => {
                    const quantity = item.quantity || 1;

                    const itemTotal = Number(item.price || 0) * quantity;

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white text-xl">
                            {item.icon || "🍽️"}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-bold text-gray-800">
                              {item.name || "Food Item"}
                            </p>

                            <p className="text-xs text-gray-500">
                              ₹{Number(item.price || 0)} × {quantity}
                            </p>
                          </div>
                        </div>

                        <p className="font-black text-orange-600">
                          ₹{itemTotal}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between border-t pt-5">
                  <span className="font-bold text-gray-600">Total</span>

                  <span className="text-2xl font-black text-orange-600">
                    ₹{Number(selectedOrder.totalAmount || 0)}
                  </span>
                </div>
              </div>

              {/* PAYMENT */}

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-xs font-bold text-gray-400">PAYMENT</p>

                  <p className="mt-1 font-bold text-gray-800">
                    {selectedOrder.paymentMethod || "Razorpay"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-xs font-bold text-gray-400">ORDER DATE</p>

                  <p className="mt-1 text-sm font-semibold text-gray-800">
                    {selectedOrder.createdAt
                      ? new Date(selectedOrder.createdAt).toLocaleString()
                      : "Not available"}
                  </p>
                </div>
              </div>

              {/* STATUS HISTORY */}

              <div className="mt-5 rounded-2xl bg-gray-50 p-5">
                <h3 className="font-black text-gray-900">📜 Status History</h3>

                {selectedOrder.statusHistory &&
                selectedOrder.statusHistory.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {selectedOrder.statusHistory.map((history, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-4 rounded-xl bg-white p-3"
                      >
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyle(
                            history.status,
                          )}`}
                        >
                          {getStatusIcon(history.status)} {history.status}
                        </span>

                        <span className="text-xs text-gray-500">
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
            </div>

            {/* MODAL FOOTER */}

            <div className="sticky bottom-0 border-t bg-white p-5">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-full rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Admin;
