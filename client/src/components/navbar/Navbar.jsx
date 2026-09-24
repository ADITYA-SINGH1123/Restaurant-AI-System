// ======================================================
// NAVBAR COMPONENT
// ======================================================
// AI Restaurant website ka main navigation bar.
//
// Features:
// 1. Premium restaurant-style navbar
// 2. Home
// 3. Menu
// 4. About
// 5. Help & Support
// 6. Cart with item count
// 7. AI Recommendation
// 8. Favorites
// 9. My Orders
// 10. Table Reservation
// 11. My Reservations
// 12. Profile
// 13. Admin Panel
// 14. Admin Reservations
// 15. Login / Register
// 16. Mobile responsive menu
// 17. Logout confirmation modal
// 18. Active navigation highlighting
// 19. Customer Notifications
// 20. Unread notification badge
// 21. Mark notification as read
// 22. Mark all notifications as read
// 23. Delete notification
// ======================================================

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

// ======================================================
// NAVBAR COMPONENT
// ======================================================

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // ====================================================
  // MOBILE MENU
  // ====================================================

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ====================================================
  // LOGOUT MODAL
  // ====================================================

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ====================================================
  // LOGGED-IN USER
  // ====================================================

  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("loggedInUser")) || null;
    } catch (error) {
      console.error("Navbar user data error:", error);
      return null;
    }
  });

  // Track last localStorage user value.
  // This prevents unnecessary state updates.
  const loggedInUserStorageRef = useRef(
    localStorage.getItem("loggedInUser") || "",
  );

  // ====================================================
  // CART COUNT
  // ====================================================

  const [cartCount, setCartCount] = useState(() => {
    try {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];

      return cart.reduce(
        (total, item) => total + Number(item.quantity || 1),
        0,
      );
    } catch (error) {
      console.error("Navbar cart data error:", error);
      return 0;
    }
  });

  // ====================================================
  // NOTIFICATION STATES
  // ====================================================

  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  // ====================================================
  // GET AUTH TOKEN
  // ====================================================

  const getAuthToken = () => {
    return localStorage.getItem("token") || "";
  };

  // ====================================================
  // REAL-TIME NOTIFICATION SOCKET
  // ====================================================
  // Logged-in customer ko private notification room
  // mein connect karta hai.

  useEffect(() => {
    if (!loggedInUser || loggedInUser.role === "admin") {
      return undefined;
    }

    const token = getAuthToken();
    const userId = loggedInUser._id || loggedInUser.id;

    if (!token || !userId) {
      return undefined;
    }

    const socket = io("http://localhost:5000", {
      auth: {
        token,
      },
    });

    socket.on("connect", () => {
      console.log("🔔 Notification socket connected");

      // User-specific notification room join.
      socket.emit("joinUserRoom", String(userId));
    });

    socket.on("new-notification", ({ notification }) => {
      if (!notification) {
        return;
      }

      // Duplicate notification prevent.
      setNotifications((previousNotifications) => {
        const alreadyExists = previousNotifications.some(
          (item) => item._id === notification._id,
        );

        if (alreadyExists) {
          return previousNotifications;
        }

        return [notification, ...previousNotifications].slice(0, 50);
      });

      // Unread notification count update.
      if (!notification.isRead) {
        setUnreadNotificationCount((previousCount) => previousCount + 1);
      }
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Notification socket error:", error.message);
    });

    // Socket cleanup.
    return () => {
      socket.off("connect");
      socket.off("new-notification");
      socket.off("connect_error");
      socket.disconnect();
    };
  }, [loggedInUser]);

  // ====================================================
  // FETCH NOTIFICATIONS
  // ====================================================

  const fetchNotifications = async () => {
    // Notifications normal customers ke liye hain.
    if (!loggedInUser || loggedInUser.role === "admin") {
      setNotifications([]);
      setUnreadNotificationCount(0);
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setNotifications([]);
      setUnreadNotificationCount(0);
      return;
    }

    setNotificationLoading(true);
    setNotificationError("");

    try {
      // ==================================================
      // FETCH NOTIFICATION LIST
      // ==================================================

      const response = await fetch("http://localhost:5000/api/notifications", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setNotificationError(data.message || "Failed to fetch notifications.");
        return;
      }

      const notificationList = Array.isArray(data.notifications)
        ? data.notifications
        : [];

      setNotifications(notificationList);

      // ==================================================
      // FETCH UNREAD COUNT
      // ==================================================

      const countResponse = await fetch(
        "http://localhost:5000/api/notifications/unread-count",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const countData = await countResponse.json();

      if (countResponse.ok) {
        setUnreadNotificationCount(Number(countData.unreadCount || 0));
      } else {
        // Fallback: notification list se unread count.
        const localUnreadCount = notificationList.filter(
          (notification) => !notification.isRead,
        ).length;

        setUnreadNotificationCount(localUnreadCount);
      }
    } catch (error) {
      console.error("Notification fetch error:", error);

      setNotificationError("Cannot connect to notification API.");
    } finally {
      setNotificationLoading(false);
    }
  };

  // ====================================================
  // FETCH NOTIFICATIONS WHEN USER CHANGES
  // ====================================================

  useEffect(() => {
    const notificationFetch = setTimeout(() => {
      fetchNotifications();
    }, 0);

    return () => clearTimeout(notificationFetch);
  }, [loggedInUser]);

  // ====================================================
  // AUTO REFRESH NOTIFICATIONS
  // ====================================================
  // Har 10 seconds latest notification data refresh hota hai.

  useEffect(() => {
    if (!loggedInUser || loggedInUser.role === "admin") {
      return undefined;
    }

    const notificationInterval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => {
      clearInterval(notificationInterval);
    };
  }, [loggedInUser]);

  // ====================================================
  // UPDATE USER + CART
  // ====================================================

  useEffect(() => {
    const updateNavbar = () => {
      // ==================================================
      // LOGGED-IN USER READ
      // ==================================================

      const storedUserRaw = localStorage.getItem("loggedInUser") || "";

      if (storedUserRaw !== loggedInUserStorageRef.current) {
        loggedInUserStorageRef.current = storedUserRaw;

        try {
          const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;

          setLoggedInUser(user);
        } catch (error) {
          console.error("Navbar user update error:", error);

          // Invalid localStorage data ke case mein logout state.
          setLoggedInUser(null);
        }
      }

      // ==================================================
      // CART READ
      // ==================================================

      try {
        const cart = JSON.parse(localStorage.getItem("cart")) || [];

        const totalQuantity = cart.reduce(
          (total, item) => total + Number(item.quantity || 1),
          0,
        );

        setCartCount(totalQuantity);
      } catch (error) {
        console.error("Navbar cart update error:", error);
        setCartCount(0);
      }
    };

    // Initial update.
    updateNavbar();

    // Browser storage event.
    window.addEventListener("storage", updateNavbar);

    // Same-tab changes detect.
    const interval = setInterval(updateNavbar, 500);

    return () => {
      window.removeEventListener("storage", updateNavbar);
      clearInterval(interval);
    };
  }, []);

  // ====================================================
  // CLOSE MOBILE MENU
  // ====================================================

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
  };

  // ====================================================
  // TOGGLE NOTIFICATION DROPDOWN
  // ====================================================

  const handleNotificationToggle = () => {
    setIsNotificationOpen((previous) => !previous);

    // Dropdown open hone par latest data fetch.
    if (!isNotificationOpen) {
      fetchNotifications();
    }
  };

  // ====================================================
  // MARK ONE NOTIFICATION AS READ
  // ====================================================

  const handleMarkNotificationRead = async (notification) => {
    if (notification.isRead) {
      return;
    }

    const token = getAuthToken();

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/notifications/${notification._id}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Mark notification read error:", data.message);
        return;
      }

      // Local notification update.
      setNotifications((previousNotifications) =>
        previousNotifications.map((item) =>
          item._id === notification._id
            ? {
                ...item,
                isRead: true,
              }
            : item,
        ),
      );

      // Unread count decrease.
      setUnreadNotificationCount((previousCount) =>
        Math.max(0, previousCount - 1),
      );
    } catch (error) {
      console.error("Mark notification read request error:", error);
    }
  };

  // ====================================================
  // HANDLE NOTIFICATION CLICK
  // ====================================================

  const handleNotificationClick = async (notification) => {
    await handleMarkNotificationRead(notification);

    // Action URL available ho to navigate.
    if (notification.actionUrl) {
      setIsNotificationOpen(false);
      setIsMenuOpen(false);

      navigate(notification.actionUrl);
    }
  };

  // ====================================================
  // MARK ALL NOTIFICATIONS AS READ
  // ====================================================

  const handleMarkAllNotificationsRead = async () => {
    if (unreadNotificationCount === 0) {
      return;
    }

    const token = getAuthToken();

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/notifications/read-all",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Mark all notifications read error:", data.message);
        return;
      }

      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      );

      setUnreadNotificationCount(0);
    } catch (error) {
      console.error("Mark all notifications request error:", error);
    }
  };

  // ====================================================
  // DELETE NOTIFICATION
  // ====================================================

  const handleDeleteNotification = async (event, notification) => {
    // Parent notification click ko prevent.
    event.stopPropagation();

    const token = getAuthToken();

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/notifications/${notification._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Delete notification error:", data.message);
        return;
      }

      // Notification local list se remove.
      setNotifications((previousNotifications) =>
        previousNotifications.filter((item) => item._id !== notification._id),
      );

      // Unread notification delete hui ho to count decrease.
      if (!notification.isRead) {
        setUnreadNotificationCount((previousCount) =>
          Math.max(0, previousCount - 1),
        );
      }
    } catch (error) {
      console.error("Delete notification request error:", error);
    }
  };

  // ====================================================
  // FORMAT NOTIFICATION DATE
  // ====================================================

  const formatNotificationDate = (dateValue) => {
    if (!dateValue) {
      return "";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  // ====================================================
  // CLOSE LOGOUT MODAL
  // ====================================================

  const handleCloseLogoutModal = () => {
    setShowLogoutModal(false);
  };

  // ====================================================
  // CONFIRM LOGOUT
  // ====================================================

  const handleConfirmLogout = () => {
    // User data remove.
    localStorage.removeItem("loggedInUser");

    // JWT token remove.
    localStorage.removeItem("token");

    // Navbar state update.
    setLoggedInUser(null);

    // Notifications clear.
    setNotifications([]);
    setUnreadNotificationCount(0);
    setIsNotificationOpen(false);

    // Mobile menu close.
    setIsMenuOpen(false);

    // Modal close.
    setShowLogoutModal(false);

    // Home page redirect.
    navigate("/");
  };

  // ====================================================
  // DESKTOP NAVIGATION STYLE
  // ====================================================

  const navLinkClass = ({ isActive }) =>
    `relative py-2 text-sm font-semibold transition duration-300 ${
      isActive ? "text-orange-600" : "text-gray-700 hover:text-orange-600"
    }`;

  // ====================================================
  // MOBILE NAVIGATION STYLE
  // ====================================================

  const mobileLinkClass = ({ isActive }) =>
    `flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? "bg-orange-50 text-orange-600"
        : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
    }`;

  // ====================================================
  // NOTIFICATION TYPE ICON
  // ====================================================

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order":
        return "📦";

      case "payment":
        return "💳";

      case "delivery":
        return "🛵";

      case "offer":
        return "🎁";

      case "loyalty":
        return "⭐";

      case "system":
      default:
        return "🔔";
    }
  };

  // ====================================================
  // NAVBAR UI
  // ====================================================

  return (
    <>
      {/* ==================================================
          MAIN NAVBAR
      ================================================== */}

      <nav className="sticky top-0 z-40 border-b border-orange-100 bg-white/95 shadow-sm backdrop-blur-md">
        {/* ==================================================
            NAVBAR CONTAINER
        ================================================== */}

        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          {/* ==================================================
              LOGO
          ================================================== */}

          <Link to="/" className="group flex items-center gap-3">
            {/* Logo icon */}
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-2xl shadow-md transition duration-300 group-hover:rotate-3 group-hover:scale-105">
              🍽️
            </div>

            {/* Restaurant name */}
            <div className="hidden sm:block">
              <h1 className="text-xl font-black tracking-tight text-gray-900">
                RK
                <span className="text-orange-600"> Restaurant</span>
              </h1>

              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400">
                Smart Dining
              </p>
            </div>
          </Link>

          {/* ==================================================
              DESKTOP NAVIGATION
          ================================================== */}

          <div className="hidden items-center gap-7 md:flex">
            {/* Home */}
            <NavLink to="/" end className={navLinkClass}>
              Home
              {location.pathname === "/" && (
                <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-orange-600"></span>
              )}
            </NavLink>

            {/* Menu */}
            <NavLink to="/menu" className={navLinkClass}>
              Menu
            </NavLink>

            {/* ==================================================
                ABOUT
            ================================================== */}

            <NavLink to="/about" className={navLinkClass}>
              About
            </NavLink>

            {/* ==================================================
                HELP & SUPPORT
            ================================================== */}

            <NavLink to="/help-support" className={navLinkClass}>
              🆘 Help
            </NavLink>

            {/* ==================================================
                TABLE RESERVATION
            ================================================== */}

            {loggedInUser && loggedInUser.role !== "admin" && (
              <NavLink
                to="/reservation"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition duration-300 ${
                    isActive
                      ? "bg-orange-600 text-white shadow-md"
                      : "bg-orange-50 text-orange-600 hover:bg-orange-100"
                  }`
                }
              >
                🍽️ Reserve Table
              </NavLink>
            )}

            {/* ==================================================
                MY RESERVATIONS
            ================================================== */}

            {loggedInUser && loggedInUser.role !== "admin" && (
              <NavLink to="/my-reservations" className={navLinkClass}>
                📅 Reservations
              </NavLink>
            )}

            {/* ==================================================
                AI RECOMMENDATION
            ================================================== */}

            {loggedInUser && loggedInUser.role !== "admin" && (
              <NavLink
                to="/ai-recommendation"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition duration-300 ${
                    isActive
                      ? "bg-orange-600 text-white shadow-md"
                      : "bg-orange-50 text-orange-600 hover:bg-orange-100"
                  }`
                }
              >
                🤖 AI Recommend
              </NavLink>
            )}

            {/* ==================================================
                FAVORITES
            ================================================== */}

            {loggedInUser && loggedInUser.role !== "admin" && (
              <NavLink to="/favorites" className={navLinkClass}>
                ❤️ Favorites
              </NavLink>
            )}

            {/* ==================================================
                CART
            ================================================== */}

            {loggedInUser && loggedInUser.role !== "admin" && (
              <NavLink to="/cart" className={navLinkClass}>
                <span className="relative">
                  🛒 Cart
                  {cartCount > 0 && (
                    <span className="absolute -right-4 -top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white shadow-sm">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </span>
              </NavLink>
            )}

            {/* ==================================================
                MY ORDERS
            ================================================== */}

            {loggedInUser && loggedInUser.role !== "admin" && (
              <NavLink to="/my-orders" className={navLinkClass}>
                📦 Orders
              </NavLink>
            )}

            {/* ==================================================
                NOTIFICATIONS
            ================================================== */}

            {loggedInUser && loggedInUser.role !== "admin" && (
              <div className="relative">
                {/* Notification button */}

                <button
                  type="button"
                  onClick={handleNotificationToggle}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full transition ${
                    isNotificationOpen
                      ? "bg-orange-100 text-orange-600"
                      : "bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                  aria-label="Notifications"
                  aria-expanded={isNotificationOpen}
                >
                  <span className="text-xl">🔔</span>

                  {unreadNotificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                      {unreadNotificationCount > 99
                        ? "99+"
                        : unreadNotificationCount}
                    </span>
                  )}
                </button>

                {/* ==================================================
                      NOTIFICATION DROPDOWN
                  ================================================== */}

                {isNotificationOpen && (
                  <div className="absolute right-0 top-14 z-[80] w-[360px] max-w-[90vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                    {/* Header */}

                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <div>
                        <h3 className="font-black text-gray-900">
                          Notifications
                        </h3>

                        <p className="text-xs text-gray-400">
                          {unreadNotificationCount > 0
                            ? `${unreadNotificationCount} unread`
                            : "All caught up"}
                        </p>
                      </div>

                      {unreadNotificationCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllNotificationsRead}
                          className="text-xs font-bold text-orange-600 hover:text-orange-700"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Notification body */}

                    <div className="max-h-[420px] overflow-y-auto">
                      {/* Loading */}

                      {notificationLoading && notifications.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                          Loading notifications...
                        </div>
                      )}

                      {/* Error */}

                      {!notificationLoading &&
                        notificationError &&
                        notifications.length === 0 && (
                          <div className="px-4 py-8 text-center">
                            <div className="text-2xl">⚠️</div>

                            <p className="mt-2 text-sm text-gray-500">
                              {notificationError}
                            </p>

                            <button
                              type="button"
                              onClick={fetchNotifications}
                              className="mt-3 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700"
                            >
                              Retry
                            </button>
                          </div>
                        )}

                      {/* Empty */}

                      {!notificationLoading &&
                        !notificationError &&
                        notifications.length === 0 && (
                          <div className="px-4 py-10 text-center">
                            <div className="text-4xl">🔔</div>

                            <h4 className="mt-3 font-bold text-gray-800">
                              No notifications
                            </h4>

                            <p className="mt-1 text-xs text-gray-400">
                              New order and restaurant updates will appear here.
                            </p>
                          </div>
                        )}

                      {/* Notification list */}

                      {notifications.map((notification) => (
                        <div
                          key={notification._id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`group cursor-pointer border-b border-gray-100 px-4 py-3 transition hover:bg-orange-50 ${
                            !notification.isRead
                              ? "bg-orange-50/60"
                              : "bg-white"
                          }`}
                        >
                          <div className="flex gap-3">
                            {/* Notification icon */}

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                              {getNotificationIcon(notification.type)}
                            </div>

                            {/* Content */}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4
                                  className={`text-sm ${
                                    notification.isRead
                                      ? "font-semibold text-gray-700"
                                      : "font-black text-gray-900"
                                  }`}
                                >
                                  {notification.title}
                                </h4>

                                {!notification.isRead && (
                                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-600"></span>
                                )}
                              </div>

                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                                {notification.message}
                              </p>

                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[10px] text-gray-400">
                                  {formatNotificationDate(
                                    notification.createdAt,
                                  )}
                                </span>

                                {/* Delete */}

                                <button
                                  type="button"
                                  onClick={(event) =>
                                    handleDeleteNotification(
                                      event,
                                      notification,
                                    )
                                  }
                                  className="rounded-md px-2 py-1 text-[10px] font-bold text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                                  aria-label="Delete notification"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}

                    {notifications.length > 0 && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-center">
                        <span className="text-[10px] font-semibold text-gray-400">
                          Showing latest {notifications.length} notification
                          {notifications.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ==================================================
                PROFILE
            ================================================== */}

            {loggedInUser && (
              <NavLink
                to="/profile"
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 transition duration-300 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100">
                  👤
                </span>

                <span className="max-w-[100px] truncate">
                  {loggedInUser.name}
                </span>
              </NavLink>
            )}

            {/* ==================================================
                ADMIN PANEL
            ================================================== */}

            {loggedInUser?.role === "admin" && (
              <>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-sm font-bold transition ${
                      isActive
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-900 hover:text-white"
                    }`
                  }
                >
                  👑 Admin
                </NavLink>

                <NavLink
                  to="/admin/reservations"
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-sm font-bold transition ${
                      isActive
                        ? "bg-orange-600 text-white shadow-md"
                        : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                    }`
                  }
                >
                  📋 Reservations
                </NavLink>
              </>
            )}

            {/* ==================================================
                LOGIN / REGISTER
            ================================================== */}

            {!loggedInUser ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="rounded-full px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-orange-50 hover:text-orange-600"
                >
                  🔐 Login
                </Link>

                <Link
                  to="/register"
                  className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition duration-300 hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-lg"
                >
                  📝 Get Started
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLogoutClick}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-500 transition duration-300 hover:bg-red-500 hover:text-white"
              >
                🚪 Logout
              </button>
            )}
          </div>

          {/* ==================================================
              MOBILE MENU BUTTON
          ================================================== */}

          <button
            type="button"
            onClick={() => setIsMenuOpen((previous) => !previous)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xl text-gray-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* ==================================================
            MOBILE MENU
        ================================================== */}

        {isMenuOpen && (
          <div className="border-t border-orange-100 bg-white px-5 pb-5 pt-4 shadow-lg md:hidden">
            <div className="space-y-2">
              {/* Home */}

              <NavLink
                to="/"
                end
                className={mobileLinkClass}
                onClick={closeMobileMenu}
              >
                🏠
                <span className="ml-3">Home</span>
              </NavLink>

              {/* Menu */}

              <NavLink
                to="/menu"
                className={mobileLinkClass}
                onClick={closeMobileMenu}
              >
                🍽️
                <span className="ml-3">Menu</span>
              </NavLink>

              {/* ==================================================
                  MOBILE ABOUT
              ================================================== */}

              <NavLink
                to="/about"
                className={mobileLinkClass}
                onClick={closeMobileMenu}
              >
                ℹ️
                <span className="ml-3">About</span>
              </NavLink>

              {/* ==================================================
                  MOBILE HELP & SUPPORT
              ================================================== */}

              <NavLink
                to="/help-support"
                className={mobileLinkClass}
                onClick={closeMobileMenu}
              >
                🆘
                <span className="ml-3">Help & Support</span>
              </NavLink>

              {/* ==================================================
                  MOBILE TABLE RESERVATION
              ================================================== */}

              {loggedInUser && loggedInUser.role !== "admin" && (
                <NavLink
                  to="/reservation"
                  className={mobileLinkClass}
                  onClick={closeMobileMenu}
                >
                  🍽️
                  <span className="ml-3">Reserve Table</span>
                </NavLink>
              )}

              {/* ==================================================
                  MOBILE MY RESERVATIONS
              ================================================== */}

              {loggedInUser && loggedInUser.role !== "admin" && (
                <NavLink
                  to="/my-reservations"
                  className={mobileLinkClass}
                  onClick={closeMobileMenu}
                >
                  📅
                  <span className="ml-3">My Reservations</span>
                </NavLink>
              )}

              {/* ==================================================
                  MOBILE AI RECOMMENDATION
              ================================================== */}

              {loggedInUser && loggedInUser.role !== "admin" && (
                <NavLink
                  to="/ai-recommendation"
                  className={mobileLinkClass}
                  onClick={closeMobileMenu}
                >
                  🤖
                  <span className="ml-3">AI Recommendation</span>
                </NavLink>
              )}

              {/* ==================================================
                  MOBILE FAVORITES
              ================================================== */}

              {loggedInUser && loggedInUser.role !== "admin" && (
                <NavLink
                  to="/favorites"
                  className={mobileLinkClass}
                  onClick={closeMobileMenu}
                >
                  ❤️
                  <span className="ml-3">Favorites</span>
                </NavLink>
              )}

              {/* ==================================================
                  MOBILE CART
              ================================================== */}

              {loggedInUser && loggedInUser.role !== "admin" && (
                <NavLink
                  to="/cart"
                  className={mobileLinkClass}
                  onClick={closeMobileMenu}
                >
                  🛒
                  <span className="ml-3 flex-1">Cart</span>
                  {cartCount > 0 && (
                    <span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs font-bold text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </NavLink>
              )}

              {/* ==================================================
                  MOBILE MY ORDERS
              ================================================== */}

              {loggedInUser && loggedInUser.role !== "admin" && (
                <NavLink
                  to="/my-orders"
                  className={mobileLinkClass}
                  onClick={closeMobileMenu}
                >
                  📦
                  <span className="ml-3">My Orders</span>
                </NavLink>
              )}

              {/* ==================================================
                  MOBILE NOTIFICATIONS
              ================================================== */}

              {loggedInUser && loggedInUser.role !== "admin" && (
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationOpen((previous) => !previous);
                    fetchNotifications();
                  }}
                  className="flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-700 transition hover:bg-orange-50 hover:text-orange-600"
                  aria-expanded={isNotificationOpen}
                >
                  <span>🔔</span>

                  <span className="ml-3 flex-1">Notifications</span>

                  {unreadNotificationCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                      {unreadNotificationCount > 99
                        ? "99+"
                        : unreadNotificationCount}
                    </span>
                  )}
                </button>
              )}

              {/* ==================================================
                  MOBILE NOTIFICATION LIST
              ================================================== */}

              {loggedInUser &&
                loggedInUser.role !== "admin" &&
                isNotificationOpen && (
                  <div className="overflow-hidden rounded-xl border border-orange-100 bg-orange-50">
                    {/* Header */}

                    <div className="flex items-center justify-between border-b border-orange-100 px-4 py-3">
                      <span className="font-black text-gray-800">
                        Notifications
                      </span>

                      {unreadNotificationCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllNotificationsRead}
                          className="text-xs font-bold text-orange-600"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Loading */}

                    {notificationLoading && notifications.length === 0 && (
                      <div className="px-4 py-6 text-center text-xs text-gray-500">
                        Loading notifications...
                      </div>
                    )}

                    {/* Error */}

                    {!notificationLoading &&
                      notificationError &&
                      notifications.length === 0 && (
                        <div className="px-4 py-6 text-center">
                          <div className="text-2xl">⚠️</div>

                          <p className="mt-2 text-xs text-gray-500">
                            {notificationError}
                          </p>

                          <button
                            type="button"
                            onClick={fetchNotifications}
                            className="mt-3 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                    {/* Empty */}

                    {!notificationLoading &&
                      !notificationError &&
                      notifications.length === 0 && (
                        <div className="px-4 py-6 text-center">
                          <div className="text-3xl">🔔</div>

                          <p className="mt-2 text-xs text-gray-500">
                            No notifications yet.
                          </p>
                        </div>
                      )}

                    {/* Notification list */}

                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`border-b border-orange-100 px-4 py-3 ${
                          !notification.isRead ? "bg-white" : "bg-orange-50"
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}

                          <div className="text-xl">
                            {getNotificationIcon(notification.type)}
                          </div>

                          {/* Content */}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-gray-800">
                                {notification.title}
                              </h4>

                              {!notification.isRead && (
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-600"></span>
                              )}
                            </div>

                            <p className="mt-1 text-xs leading-5 text-gray-500">
                              {notification.message}
                            </p>

                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[10px] text-gray-400">
                                {formatNotificationDate(notification.createdAt)}
                              </span>

                              <button
                                type="button"
                                onClick={(event) =>
                                  handleDeleteNotification(event, notification)
                                }
                                className="text-[10px] font-bold text-red-400"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {/* ==================================================
                  MOBILE PROFILE
              ================================================== */}

              {loggedInUser && (
                <NavLink
                  to="/profile"
                  className={mobileLinkClass}
                  onClick={closeMobileMenu}
                >
                  👤
                  <span className="ml-3">Profile</span>
                </NavLink>
              )}

              {/* ==================================================
                  MOBILE ADMIN OPTIONS
              ================================================== */}

              {loggedInUser?.role === "admin" && (
                <>
                  <NavLink
                    to="/admin"
                    className={mobileLinkClass}
                    onClick={closeMobileMenu}
                  >
                    👑
                    <span className="ml-3">Admin Panel</span>
                  </NavLink>

                  <NavLink
                    to="/admin/reservations"
                    className={mobileLinkClass}
                    onClick={closeMobileMenu}
                  >
                    📋
                    <span className="ml-3">Reservations</span>
                  </NavLink>
                </>
              )}

              {/* ==================================================
                  LOGIN / REGISTER
              ================================================== */}

              {!loggedInUser ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="rounded-xl border border-gray-200 py-3 text-center text-sm font-bold text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
                  >
                    🔐 Login
                  </Link>

                  <Link
                    to="/register"
                    onClick={closeMobileMenu}
                    className="rounded-xl bg-orange-600 py-3 text-center text-sm font-bold text-white transition hover:bg-orange-700"
                  >
                    📝 Register
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="mt-2 w-full rounded-xl border border-red-200 py-3 text-left font-bold text-red-500 transition hover:bg-red-50"
                >
                  🚪
                  <span className="ml-3">Logout</span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ======================================================
          LOGOUT CONFIRMATION MODAL
      ====================================================== */}

      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          {/* Modal */}

          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-7 shadow-2xl">
            {/* Top orange line */}

            <div className="absolute left-0 right-0 top-0 h-1.5 bg-orange-600"></div>

            {/* Close button */}

            <button
              type="button"
              onClick={handleCloseLogoutModal}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
              aria-label="Close logout dialog"
            >
              ✕
            </button>

            {/* Logout icon */}

            <div className="mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-4xl">
              👋
            </div>

            {/* Title */}

            <h2 className="mt-5 text-center text-2xl font-black text-gray-900">
              Ready to leave?
            </h2>

            {/* Message */}

            <p className="mt-3 text-center leading-6 text-gray-500">
              Are you sure you want to logout from
              <span className="font-semibold text-gray-700">
                {" "}
                RK Restaurant
              </span>
              ?
            </p>

            {/* Buttons */}

            <div className="mt-7 grid grid-cols-2 gap-3">
              {/* Stay */}

              <button
                type="button"
                onClick={handleCloseLogoutModal}
                className="rounded-xl border border-gray-200 py-3 font-bold text-gray-700 transition hover:bg-gray-100"
              >
                Stay
              </button>

              {/* Logout */}

              <button
                type="button"
                onClick={handleConfirmLogout}
                className="rounded-xl bg-red-500 py-3 font-bold text-white shadow-md transition hover:bg-red-600"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ======================================================
// EXPORT COMPONENT
// ======================================================

export default Navbar;
