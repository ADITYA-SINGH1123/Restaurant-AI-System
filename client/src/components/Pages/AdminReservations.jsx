import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AdminReservations = () => {
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedReservation, setSelectedReservation] = useState(null);

  const token = localStorage.getItem("token");

  // ======================================================
  // DATE HELPERS
  // ======================================================

  const getLocalDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const isToday = (reservation) => {
    return reservation.date === getLocalDateKey();
  };

  const isUpcoming = (reservation) => {
    if (
      reservation.status === "Cancelled" ||
      reservation.status === "Completed"
    ) {
      return false;
    }

    const today = getLocalDateKey();

    if (reservation.date > today) {
      return true;
    }

    if (reservation.date < today) {
      return false;
    }

    if (!reservation.time) {
      return true;
    }

    const now = new Date();

    const currentTime =
      `${String(now.getHours()).padStart(2, "0")}:` +
      `${String(now.getMinutes()).padStart(2, "0")}`;

    return reservation.time >= currentTime;
  };

  // ======================================================
  // ADMIN LOGIN CHECK
  // ======================================================

  useEffect(() => {
    const loggedInUser =
      JSON.parse(localStorage.getItem("loggedInUser")) || null;

    if (!token || !loggedInUser) {
      navigate("/login");
      return;
    }

    if (loggedInUser.role !== "admin") {
      navigate("/");
    }
  }, [token, navigate]);

  // ======================================================
  // FETCH RESERVATIONS
  // ======================================================

  const fetchReservations = async () => {
    const response = await fetch(
      "http://localhost:5000/api/reservations/admin/all",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        alert(data.message || "Admin access required.");
        navigate("/");
        return [];
      }

      throw new Error(data.message || "Failed to fetch reservations.");
    }

    return data.reservations || [];
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    const loadReservations = async () => {
      try {
        const data = await fetchReservations();

        if (cancelled) {
          return;
        }

        setReservations(data);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Admin reservations error:", error);
        alert(error.message || "❌ Cannot connect to server.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadReservations();

    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  // ======================================================
  // REFRESH
  // ======================================================

  const handleRefresh = async () => {
    if (!token || refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      const data = await fetchReservations();

      setReservations(data);

      if (selectedReservation) {
        const updatedSelected = data.find(
          (item) => item._id === selectedReservation._id,
        );

        if (updatedSelected) {
          setSelectedReservation(updatedSelected);
        }
      }
    } catch (error) {
      console.error("Refresh reservations error:", error);
      alert(error.message || "❌ Cannot connect to server.");
    } finally {
      setRefreshing(false);
    }
  };

  // ======================================================
  // STATUS UPDATE
  // ======================================================

  const handleStatusChange = async (reservation, newStatus) => {
    if (!newStatus || newStatus === reservation.status) {
      return;
    }

    if (reservation.status === "Cancelled") {
      alert("Cancelled reservations cannot be changed.");
      return;
    }

    if (reservation.status === "Completed") {
      alert("Completed reservations cannot be changed.");
      return;
    }

    const confirmed = window.confirm(
      `Change reservation ${reservation.reservationId} from ${reservation.status} to ${newStatus}?`,
    );

    if (!confirmed) {
      return;
    }

    setUpdatingId(reservation._id);

    try {
      const response = await fetch(
        `http://localhost:5000/api/reservations/admin/${reservation._id}/status`,
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
        alert(data.message || "Failed to update reservation status.");
        return;
      }

      setReservations((currentReservations) =>
        currentReservations.map((item) =>
          item._id === reservation._id ? data.reservation : item,
        ),
      );

      if (selectedReservation?._id === reservation._id) {
        setSelectedReservation(data.reservation);
      }

      alert(`✅ Reservation status changed to ${newStatus}.`);
    } catch (error) {
      console.error("Status update error:", error);
      alert("❌ Cannot connect to server.");
    } finally {
      setUpdatingId(null);
    }
  };

  // ======================================================
  // QUICK ACTIONS
  // ======================================================

  const handleQuickAction = (reservation, newStatus) => {
    if (updatingId === reservation._id) {
      return;
    }

    if (
      reservation.status === "Cancelled" ||
      reservation.status === "Completed"
    ) {
      return;
    }

    handleStatusChange(reservation, newStatus);
  };

  const getQuickActions = (reservation) => {
    if (reservation.status === "Pending") {
      return [
        {
          status: "Confirmed",
          label: "Confirm",
          icon: "✅",
          className:
            "bg-green-600 text-white hover:bg-green-700 disabled:opacity-50",
        },
        {
          status: "Cancelled",
          label: "Cancel",
          icon: "❌",
          className:
            "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50",
        },
      ];
    }

    if (reservation.status === "Confirmed") {
      return [
        {
          status: "Completed",
          label: "Complete",
          icon: "🎉",
          className:
            "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50",
        },
        {
          status: "Cancelled",
          label: "Cancel",
          icon: "❌",
          className:
            "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50",
        },
      ];
    }

    return [];
  };

  // ======================================================
  // STATUS STYLE
  // ======================================================

  const getStatusStyle = (status) => {
    switch (status) {
      case "Confirmed":
        return "bg-green-100 text-green-700 border-green-200";

      case "Completed":
        return "bg-blue-100 text-blue-700 border-blue-200";

      case "Cancelled":
        return "bg-red-100 text-red-700 border-red-200";

      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Confirmed":
        return "✅";

      case "Completed":
        return "🎉";

      case "Cancelled":
        return "❌";

      default:
        return "⏳";
    }
  };

  // ======================================================
  // STATUS HISTORY STYLE
  // ======================================================

  const getHistoryStyle = (status) => {
    switch (status) {
      case "Confirmed":
        return "bg-green-500";

      case "Completed":
        return "bg-blue-500";

      case "Cancelled":
        return "bg-red-500";

      default:
        return "bg-yellow-500";
    }
  };

  // ======================================================
  // DATE / TIME FORMAT
  // ======================================================

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) {
      return "-";
    }

    const [hours, minutes] = time.split(":");
    const hourNumber = Number(hours);

    if (Number.isNaN(hourNumber)) {
      return time;
    }

    const suffix = hourNumber >= 12 ? "PM" : "AM";
    const displayHour = hourNumber % 12 || 12;

    return `${displayHour}:${minutes} ${suffix}`;
  };

  const formatHistoryDate = (date) => {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ======================================================
  // COUNTS
  // ======================================================

  const totalCount = reservations.length;

  const pendingCount = reservations.filter(
    (reservation) => reservation.status === "Pending",
  ).length;

  const confirmedCount = reservations.filter(
    (reservation) => reservation.status === "Confirmed",
  ).length;

  const completedCount = reservations.filter(
    (reservation) => reservation.status === "Completed",
  ).length;

  const cancelledCount = reservations.filter(
    (reservation) => reservation.status === "Cancelled",
  ).length;

  const todayReservations = reservations.filter(
    (reservation) => isToday(reservation) && reservation.status !== "Cancelled",
  );

  const todayCount = todayReservations.length;

  const upcomingReservations = reservations.filter(isUpcoming);

  const upcomingCount = upcomingReservations.length;

  const totalGuests = reservations
    .filter((reservation) => reservation.status !== "Cancelled")
    .reduce((total, reservation) => total + Number(reservation.guests || 0), 0);

  const todayGuests = todayReservations.reduce(
    (total, reservation) => total + Number(reservation.guests || 0),
    0,
  );

  const upcomingGuests = upcomingReservations.reduce(
    (total, reservation) => total + Number(reservation.guests || 0),
    0,
  );

  const activeTodayCount = todayReservations.filter(
    (reservation) =>
      reservation.status === "Pending" || reservation.status === "Confirmed",
  ).length;

  const todayTables = new Set(
    todayReservations
      .map((reservation) => reservation.tableNumber)
      .filter(Boolean),
  ).size;

  // ======================================================
  // ADVANCED ANALYTICS
  // ======================================================

  const statusAnalytics = [
    {
      status: "Pending",
      count: pendingCount,
      percentage:
        totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0,
      icon: "⏳",
      barClass: "bg-yellow-500",
      textClass: "text-yellow-700",
      bgClass: "bg-yellow-50",
    },
    {
      status: "Confirmed",
      count: confirmedCount,
      percentage:
        totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0,
      icon: "✅",
      barClass: "bg-green-500",
      textClass: "text-green-700",
      bgClass: "bg-green-50",
    },
    {
      status: "Completed",
      count: completedCount,
      percentage:
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      icon: "🎉",
      barClass: "bg-blue-500",
      textClass: "text-blue-700",
      bgClass: "bg-blue-50",
    },
    {
      status: "Cancelled",
      count: cancelledCount,
      percentage:
        totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0,
      icon: "❌",
      barClass: "bg-red-500",
      textClass: "text-red-700",
      bgClass: "bg-red-50",
    },
  ];

  const nonCancelledCount = reservations.filter(
    (reservation) => reservation.status !== "Cancelled",
  ).length;

  const todayActiveReservations = reservations.filter(
    (reservation) =>
      isToday(reservation) &&
      reservation.status !== "Cancelled" &&
      reservation.status !== "Completed",
  );

  const upcomingActiveReservations = reservations.filter((reservation) =>
    isUpcoming(reservation),
  );

  const todayActiveCount = todayActiveReservations.length;
  const upcomingActiveCount = upcomingActiveReservations.length;

  const averageGuestsPerReservation =
    nonCancelledCount > 0
      ? (totalGuests / nonCancelledCount).toFixed(1)
      : "0.0";

  const todayAverageGuests =
    todayCount > 0 ? (todayGuests / todayCount).toFixed(1) : "0.0";

  const upcomingAverageGuests =
    upcomingCount > 0 ? (upcomingGuests / upcomingCount).toFixed(1) : "0.0";

  const restaurantTables = [
    { tableNumber: 1, seats: 2 },
    { tableNumber: 2, seats: 2 },
    { tableNumber: 3, seats: 4 },
    { tableNumber: 4, seats: 4 },
    { tableNumber: 5, seats: 6 },
    { tableNumber: 6, seats: 8 },
  ];

  const activeReservationForTables = reservations.filter(
    (reservation) =>
      reservation.tableNumber &&
      reservation.status !== "Cancelled" &&
      reservation.status !== "Completed" &&
      (isToday(reservation) || isUpcoming(reservation)),
  );

  const tableUtilization = restaurantTables.map((table) => {
    const bookings = activeReservationForTables.filter(
      (reservation) => Number(reservation.tableNumber) === table.tableNumber,
    );

    const guestCount = bookings.reduce(
      (total, reservation) => total + Number(reservation.guests || 0),
      0,
    );

    return {
      ...table,
      bookings: bookings.length,
      guests: guestCount,
    };
  });

  const occupiedTables = tableUtilization.filter(
    (table) => table.bookings > 0,
  ).length;

  const tableUtilizationPercentage = Math.round(
    (occupiedTables / restaurantTables.length) * 100,
  );

  const activityDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    const dateKey = getLocalDateKey(date);

    const count = reservations.filter((reservation) => {
      if (!reservation.createdAt) {
        return false;
      }

      const createdDate = new Date(reservation.createdAt);

      if (Number.isNaN(createdDate.getTime())) {
        return false;
      }

      return getLocalDateKey(createdDate) === dateKey;
    }).length;

    return {
      dateKey,
      label: date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      count,
    };
  });

  const maxActivityCount = Math.max(...activityDays.map((day) => day.count), 1);

  const todayVsUpcomingTotal = todayActiveCount + upcomingActiveCount;

  const todayVsUpcomingTodayPercentage =
    todayVsUpcomingTotal > 0
      ? Math.round((todayActiveCount / todayVsUpcomingTotal) * 100)
      : 0;

  const todayVsUpcomingUpcomingPercentage =
    todayVsUpcomingTotal > 0
      ? Math.round((upcomingActiveCount / todayVsUpcomingTotal) * 100)
      : 0;

  // ======================================================
  // FILTER
  // ======================================================

  const filteredReservations = reservations.filter((reservation) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      !searchText ||
      reservation.reservationId?.toLowerCase().includes(searchText) ||
      reservation.customerName?.toLowerCase().includes(searchText) ||
      reservation.phone?.includes(searchText) ||
      reservation.date?.toLowerCase().includes(searchText) ||
      String(reservation.tableNumber || "").includes(searchText);

    const matchesStatus =
      statusFilter === "All" || reservation.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-orange-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600"></div>

          <p className="font-semibold text-gray-600">Loading reservations...</p>
        </div>
      </div>
    );
  }

  // ======================================================
  // PAGE
  // ======================================================

  return (
    <div className="min-h-screen bg-orange-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">📅</span>

            <div>
              <h1 className="text-3xl font-black text-gray-900">
                Reservation Management
              </h1>

              <p className="mt-1 text-gray-500">
                Manage customer table reservations from one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              ← Admin Dashboard
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "🔄 Refresh"}
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total</p>

            <p className="mt-2 text-3xl font-black text-gray-900">
              {totalCount}
            </p>

            <p className="mt-1 text-xs text-gray-400">All reservations</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Today</p>

            <p className="mt-2 text-3xl font-black text-orange-600">
              {todayCount}
            </p>

            <p className="mt-1 text-xs text-gray-400">Non-cancelled</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Upcoming</p>

            <p className="mt-2 text-3xl font-black text-purple-600">
              {upcomingCount}
            </p>

            <p className="mt-1 text-xs text-gray-400">Active bookings</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Pending</p>

            <p className="mt-2 text-3xl font-black text-yellow-600">
              {pendingCount}
            </p>

            <p className="mt-1 text-xs text-gray-400">Need attention</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Confirmed</p>

            <p className="mt-2 text-3xl font-black text-green-600">
              {confirmedCount}
            </p>

            <p className="mt-1 text-xs text-gray-400">Active bookings</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Completed</p>

            <p className="mt-2 text-3xl font-black text-blue-600">
              {completedCount}
            </p>

            <p className="mt-1 text-xs text-gray-400">Finished</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Cancelled</p>

            <p className="mt-2 text-3xl font-black text-red-600">
              {cancelledCount}
            </p>

            <p className="mt-1 text-xs text-gray-400">Cancelled bookings</p>
          </div>
        </div>

        {/* GUEST ANALYTICS */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500">Total Guests</p>

                <p className="mt-2 text-3xl font-black text-gray-900">
                  {totalGuests}
                </p>
              </div>

              <span className="text-3xl">👥</span>
            </div>

            <p className="mt-2 text-xs text-gray-400">
              Across non-cancelled reservations
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500">
                  Today's Guests
                </p>

                <p className="mt-2 text-3xl font-black text-orange-600">
                  {todayGuests}
                </p>
              </div>

              <span className="text-3xl">📅</span>
            </div>

            <p className="mt-2 text-xs text-gray-400">Guests expected today</p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500">
                  Upcoming Guests
                </p>

                <p className="mt-2 text-3xl font-black text-purple-600">
                  {upcomingGuests}
                </p>
              </div>

              <span className="text-3xl">🔜</span>
            </div>

            <p className="mt-2 text-xs text-gray-400">Pending + confirmed</p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500">Active Today</p>

                <p className="mt-2 text-3xl font-black text-green-600">
                  {activeTodayCount}
                </p>
              </div>

              <span className="text-3xl">🪑</span>
            </div>

            <p className="mt-2 text-xs text-gray-400">
              {todayTables} table
              {todayTables === 1 ? "" : "s"} booked today
            </p>
          </div>
        </div>

        {/* ==================================================
            ADVANCED ANALYTICS
        ================================================== */}

        <div className="mb-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                📊 Reservation Analytics
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Quick overview of reservation activity and table utilization.
              </p>
            </div>

            <span className="w-fit rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-500 shadow-sm">
              Live data from reservations
            </span>
          </div>

          {/* STATUS DISTRIBUTION + TODAY VS UPCOMING */}
          <div className="grid gap-5 xl:grid-cols-2">
            {/* STATUS DISTRIBUTION */}
            <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    Status Distribution
                  </h3>

                  <p className="mt-1 text-xs text-gray-400">
                    All reservation statuses
                  </p>
                </div>

                <span className="text-2xl">📈</span>
              </div>

              <div className="mt-6 space-y-5">
                {statusAnalytics.map((item) => (
                  <div key={item.status}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bgClass}`}
                        >
                          {item.icon}
                        </span>

                        <span className="text-sm font-bold text-gray-700">
                          {item.status}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-sm font-black ${item.textClass}`}
                        >
                          {item.count}
                        </span>

                        <span className="ml-2 text-xs font-semibold text-gray-400">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.barClass}`}
                        style={{
                          width: `${item.percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TODAY VS UPCOMING */}
            <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    Today vs Upcoming
                  </h3>

                  <p className="mt-1 text-xs text-gray-400">
                    Active reservation demand
                  </p>
                </div>

                <span className="text-2xl">📅</span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-orange-50 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-orange-700">Today</p>

                    <span>🔥</span>
                  </div>

                  <p className="mt-3 text-4xl font-black text-orange-600">
                    {todayActiveCount}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    Active reservations
                  </p>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-orange-100">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{
                        width: `${todayVsUpcomingTodayPercentage}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs font-bold text-orange-700">
                    {todayVsUpcomingTodayPercentage}% of active demand
                  </p>
                </div>

                <div className="rounded-2xl bg-purple-50 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-purple-700">
                      Upcoming
                    </p>

                    <span>🔜</span>
                  </div>

                  <p className="mt-3 text-4xl font-black text-purple-600">
                    {upcomingActiveCount}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    Active reservations
                  </p>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-purple-100">
                    <div
                      className="h-full rounded-full bg-purple-500"
                      style={{
                        width: `${todayVsUpcomingUpcomingPercentage}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs font-bold text-purple-700">
                    {todayVsUpcomingUpcomingPercentage}% of active demand
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-bold text-gray-400">
                    Total Active
                  </p>

                  <p className="mt-1 text-xl font-black text-gray-900">
                    {todayVsUpcomingTotal}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-bold text-gray-400">
                    Today's Avg Guests
                  </p>

                  <p className="mt-1 text-xl font-black text-orange-600">
                    {todayAverageGuests}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-bold text-gray-400">
                    Upcoming Avg Guests
                  </p>

                  <p className="mt-1 text-xl font-black text-purple-600">
                    {upcomingAverageGuests}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* GUEST OVERVIEW + TABLE UTILIZATION */}
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {/* GUEST OVERVIEW */}
            <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    👥 Guest Overview
                  </h3>

                  <p className="mt-1 text-xs text-gray-400">
                    Guest volume across reservation periods
                  </p>
                </div>

                <span className="text-2xl">👨‍👩‍👧‍👦</span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Total
                  </p>

                  <p className="mt-2 text-3xl font-black text-gray-900">
                    {totalGuests}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">Guests</p>
                </div>

                <div className="rounded-2xl bg-orange-50 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-500">
                    Today
                  </p>

                  <p className="mt-2 text-3xl font-black text-orange-600">
                    {todayGuests}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">Guests</p>
                </div>

                <div className="rounded-2xl bg-purple-50 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wide text-purple-500">
                    Upcoming
                  </p>

                  <p className="mt-2 text-3xl font-black text-purple-600">
                    {upcomingGuests}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">Guests</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-700">
                      Average Guests / Reservation
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Non-cancelled reservations
                    </p>
                  </div>

                  <p className="text-3xl font-black text-gray-900">
                    {averageGuestsPerReservation}
                  </p>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{
                      width: `${Math.min(
                        Number(averageGuestsPerReservation) * 10,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* TABLE UTILIZATION */}
            <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    🪑 Table Utilization
                  </h3>

                  <p className="mt-1 text-xs text-gray-400">
                    Active today + upcoming table usage
                  </p>
                </div>

                <div className="rounded-xl bg-orange-50 px-4 py-3 text-center">
                  <p className="text-xs font-bold text-orange-600">
                    Utilization
                  </p>

                  <p className="text-2xl font-black text-orange-700">
                    {tableUtilizationPercentage}%
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {tableUtilization.map((table) => {
                  const isOccupied = table.bookings > 0;

                  return (
                    <div
                      key={table.tableNumber}
                      className={`rounded-2xl border p-4 ${
                        isOccupied
                          ? "border-orange-200 bg-orange-50"
                          : "border-gray-100 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg">🪑</span>

                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            isOccupied ? "bg-orange-500" : "bg-gray-300"
                          }`}
                        />
                      </div>

                      <p className="mt-3 font-black text-gray-900">
                        Table {table.tableNumber}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {table.seats} seats
                      </p>

                      <div className="mt-3">
                        <p
                          className={`text-sm font-black ${
                            isOccupied ? "text-orange-700" : "text-gray-400"
                          }`}
                        >
                          {table.bookings} booking
                          {table.bookings === 1 ? "" : "s"}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {table.guests} guest
                          {table.guests === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RESERVATION ACTIVITY */}
          <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  📊 Reservation Activity
                </h3>

                <p className="mt-1 text-xs text-gray-400">
                  Reservations created during the last 7 days
                </p>
              </div>

              <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500">
                Last 7 Days
              </span>
            </div>

            <div className="mt-7 grid grid-cols-7 items-end gap-2 sm:gap-4">
              {activityDays.map((day) => {
                const height =
                  day.count === 0
                    ? 8
                    : Math.max((day.count / maxActivityCount) * 100, 12);

                return (
                  <div
                    key={day.dateKey}
                    className="flex min-w-0 flex-col items-center"
                  >
                    <span className="mb-2 text-xs font-black text-gray-700">
                      {day.count}
                    </span>

                    <div className="flex h-32 w-full items-end justify-center rounded-xl bg-gray-50 px-1">
                      <div
                        className="w-full max-w-10 rounded-t-lg bg-orange-500 transition-all duration-500"
                        style={{
                          height: `${height}%`,
                        }}
                        title={`${day.label}: ${day.count} reservations`}
                      />
                    </div>

                    <span className="mt-2 text-[10px] font-bold text-gray-400 sm:text-xs">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SEARCH + FILTER */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Search Reservations
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ID, customer, phone, date, table..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-orange-500"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                }}
                className="w-full rounded-xl border border-gray-200 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 md:w-auto"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-orange-50 px-3 py-1.5 font-semibold text-orange-700">
              Showing {filteredReservations.length}
            </span>

            <span className="rounded-full bg-gray-100 px-3 py-1.5 font-semibold text-gray-600">
              Total {reservations.length}
            </span>
          </div>
        </div>

        {/* RESERVATIONS */}
        {filteredReservations.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-sm">
            <div className="text-5xl">📅</div>

            <h2 className="mt-4 text-2xl font-black text-gray-900">
              No Reservations Found
            </h2>

            <p className="mt-2 text-gray-500">
              Try changing your search or status filter.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1400px]">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Reservation
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Customer
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Date & Time
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Guests
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Table
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Quick Actions
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Manage
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredReservations.map((reservation) => {
                      const locked =
                        reservation.status === "Cancelled" ||
                        reservation.status === "Completed";

                      const quickActions = getQuickActions(reservation);

                      return (
                        <tr
                          key={reservation._id}
                          className="transition hover:bg-orange-50/40"
                        >
                          <td className="px-5 py-5">
                            <p className="font-black text-gray-900">
                              {reservation.reservationId}
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              {reservation.createdAt
                                ? new Date(
                                    reservation.createdAt,
                                  ).toLocaleDateString("en-IN")
                                : "-"}
                            </p>
                          </td>

                          <td className="px-5 py-5">
                            <p className="font-bold text-gray-900">
                              {reservation.customerName}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {reservation.phone}
                            </p>
                          </td>

                          <td className="px-5 py-5">
                            <p className="font-bold text-gray-900">
                              {formatDate(reservation.date)}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {formatTime(reservation.time)}
                            </p>

                            {isToday(reservation) &&
                              reservation.status !== "Cancelled" && (
                                <span className="mt-2 inline-flex rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase text-orange-700">
                                  Today
                                </span>
                              )}
                          </td>

                          <td className="px-5 py-5">
                            <span className="font-bold text-gray-900">
                              👥 {reservation.guests}
                            </span>
                          </td>

                          <td className="px-5 py-5">
                            <span className="font-bold text-gray-900">
                              🪑{" "}
                              {reservation.tableNumber
                                ? `Table ${reservation.tableNumber}`
                                : "Any Available"}
                            </span>
                          </td>

                          <td className="px-5 py-5">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${getStatusStyle(
                                reservation.status,
                              )}`}
                            >
                              {getStatusIcon(reservation.status)}
                              {reservation.status}
                            </span>
                          </td>

                          <td className="px-5 py-5">
                            {quickActions.length > 0 ? (
                              <div className="flex min-w-[190px] flex-col gap-2">
                                {quickActions.map((action) => (
                                  <button
                                    key={action.status}
                                    onClick={() =>
                                      handleQuickAction(
                                        reservation,
                                        action.status,
                                      )
                                    }
                                    disabled={updatingId === reservation._id}
                                    className={`rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed ${action.className}`}
                                  >
                                    {updatingId === reservation._id
                                      ? "Updating..."
                                      : `${action.icon} ${action.label}`}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-gray-400">
                                🔒 Locked
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-5">
                            <div className="flex min-w-[170px] flex-col gap-2">
                              <button
                                onClick={() =>
                                  setSelectedReservation(reservation)
                                }
                                className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
                              >
                                👁️ Details
                              </button>

                              <select
                                value={reservation.status}
                                disabled={
                                  locked || updatingId === reservation._id
                                }
                                onChange={(event) =>
                                  handleStatusChange(
                                    reservation,
                                    event.target.value,
                                  )
                                }
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-orange-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE CARDS */}
            <div className="space-y-4 lg:hidden">
              {filteredReservations.map((reservation) => {
                const locked =
                  reservation.status === "Cancelled" ||
                  reservation.status === "Completed";

                const quickActions = getQuickActions(reservation);

                return (
                  <div
                    key={reservation._id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                          Reservation ID
                        </p>

                        <h2 className="mt-1 font-black text-gray-900">
                          {reservation.reservationId}
                        </h2>
                      </div>

                      <span
                        className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${getStatusStyle(
                          reservation.status,
                        )}`}
                      >
                        {getStatusIcon(reservation.status)}
                        {reservation.status}
                      </span>
                    </div>

                    {isToday(reservation) &&
                      reservation.status !== "Cancelled" && (
                        <div className="mt-3 inline-flex rounded-full bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-700">
                          📅 TODAY
                        </div>
                      )}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-orange-50 p-3">
                        <p className="text-xs font-bold text-gray-400">
                          Customer
                        </p>

                        <p className="mt-1 font-bold text-gray-900">
                          {reservation.customerName}
                        </p>

                        <p className="text-sm text-gray-500">
                          {reservation.phone}
                        </p>
                      </div>

                      <div className="rounded-xl bg-orange-50 p-3">
                        <p className="text-xs font-bold text-gray-400">
                          Date & Time
                        </p>

                        <p className="mt-1 font-bold text-gray-900">
                          {formatDate(reservation.date)}
                        </p>

                        <p className="text-sm text-gray-500">
                          {formatTime(reservation.time)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-orange-50 p-3">
                        <p className="text-xs font-bold text-gray-400">
                          Guests
                        </p>

                        <p className="mt-1 font-bold text-gray-900">
                          👥 {reservation.guests}
                        </p>
                      </div>

                      <div className="rounded-xl bg-orange-50 p-3">
                        <p className="text-xs font-bold text-gray-400">Table</p>

                        <p className="mt-1 font-bold text-gray-900">
                          🪑{" "}
                          {reservation.tableNumber
                            ? `Table ${reservation.tableNumber}`
                            : "Any Available"}
                        </p>
                      </div>
                    </div>

                    {reservation.specialRequest && (
                      <div className="mt-4 rounded-xl border border-gray-100 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                          Special Request
                        </p>

                        <p className="mt-2 text-sm text-gray-700">
                          {reservation.specialRequest}
                        </p>
                      </div>
                    )}

                    {/* MOBILE QUICK ACTIONS */}
                    {quickActions.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-400">
                          Quick Actions
                        </p>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {quickActions.map((action) => (
                            <button
                              key={action.status}
                              onClick={() =>
                                handleQuickAction(reservation, action.status)
                              }
                              disabled={updatingId === reservation._id}
                              className={`rounded-xl px-4 py-3 font-bold transition disabled:cursor-not-allowed ${action.className}`}
                            >
                              {updatingId === reservation._id
                                ? "Updating..."
                                : `${action.icon} ${action.label}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        onClick={() => setSelectedReservation(reservation)}
                        className="rounded-xl bg-gray-900 px-4 py-3 font-bold text-white transition hover:bg-gray-800"
                      >
                        👁️ View Details
                      </button>

                      <select
                        value={reservation.status}
                        disabled={locked || updatingId === reservation._id}
                        onChange={(event) =>
                          handleStatusChange(reservation, event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold outline-none focus:border-orange-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    {locked && (
                      <p className="mt-3 text-xs font-semibold text-gray-400">
                        {reservation.status === "Cancelled"
                          ? "🔒 Cancelled reservation is locked."
                          : "🔒 Completed reservation is locked."}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ==================================================
          DETAILS MODAL
      ================================================== */}

      {selectedReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedReservation(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Reservation Details
                </p>

                <h2 className="mt-1 text-2xl font-black text-gray-900">
                  {selectedReservation.reservationId}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Complete reservation information
                </p>
              </div>

              <button
                onClick={() => setSelectedReservation(null)}
                className="rounded-full bg-gray-100 px-3 py-2 text-lg font-bold text-gray-600 transition hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              {/* STATUS */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Current Status
                    </p>

                    <span
                      className={`mt-2 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${getStatusStyle(
                        selectedReservation.status,
                      )}`}
                    >
                      {getStatusIcon(selectedReservation.status)}
                      {selectedReservation.status}
                    </span>
                  </div>

                  <div className="w-full sm:w-56">
                    <label className="mb-2 block text-xs font-bold text-gray-500">
                      Update Status
                    </label>

                    <select
                      value={selectedReservation.status}
                      disabled={
                        selectedReservation.status === "Cancelled" ||
                        selectedReservation.status === "Completed" ||
                        updatingId === selectedReservation._id
                      }
                      onChange={(event) =>
                        handleStatusChange(
                          selectedReservation,
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold outline-none focus:border-orange-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* MODAL QUICK ACTIONS */}
                {getQuickActions(selectedReservation).length > 0 && (
                  <div className="mt-5 border-t border-gray-200 pt-5">
                    <p className="mb-3 text-xs font-black uppercase tracking-wide text-gray-400">
                      Quick Actions
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {getQuickActions(selectedReservation).map((action) => (
                        <button
                          key={action.status}
                          onClick={() =>
                            handleQuickAction(
                              selectedReservation,
                              action.status,
                            )
                          }
                          disabled={updatingId === selectedReservation._id}
                          className={`rounded-xl px-4 py-3 font-bold transition disabled:cursor-not-allowed ${action.className}`}
                        >
                          {updatingId === selectedReservation._id
                            ? "Updating..."
                            : `${action.icon} ${action.label}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RESERVATION INFORMATION */}
              <div>
                <h3 className="mb-3 text-lg font-black text-gray-900">
                  📅 Reservation Information
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-orange-50 p-4">
                    <p className="text-xs font-bold text-gray-400">Date</p>

                    <p className="mt-1 font-bold text-gray-900">
                      {formatDate(selectedReservation.date)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-50 p-4">
                    <p className="text-xs font-bold text-gray-400">Time</p>

                    <p className="mt-1 font-bold text-gray-900">
                      {formatTime(selectedReservation.time)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-50 p-4">
                    <p className="text-xs font-bold text-gray-400">Guests</p>

                    <p className="mt-1 font-bold text-gray-900">
                      👥 {selectedReservation.guests}
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-50 p-4">
                    <p className="text-xs font-bold text-gray-400">
                      Assigned Table
                    </p>

                    <p className="mt-1 font-bold text-gray-900">
                      🪑{" "}
                      {selectedReservation.tableNumber
                        ? `Table ${selectedReservation.tableNumber}`
                        : "Any Available"}
                    </p>
                  </div>
                </div>
              </div>

              {/* CUSTOMER INFORMATION */}
              <div>
                <h3 className="mb-3 text-lg font-black text-gray-900">
                  👤 Customer Information
                </h3>

                <div className="rounded-2xl border border-gray-100 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Name
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {selectedReservation.customerName || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Phone
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {selectedReservation.phone || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SPECIAL REQUEST */}
              <div>
                <h3 className="mb-3 text-lg font-black text-gray-900">
                  📝 Special Request
                </h3>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  {selectedReservation.specialRequest ? (
                    <p className="text-sm leading-6 text-gray-700">
                      {selectedReservation.specialRequest}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No special request added.
                    </p>
                  )}
                </div>
              </div>

              {/* STATUS HISTORY */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-black text-gray-900">
                    🔄 Status History
                  </h3>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
                    {selectedReservation.statusHistory?.length || 0} updates
                  </span>
                </div>

                {!selectedReservation.statusHistory ||
                selectedReservation.statusHistory.length === 0 ? (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-center">
                    <p className="text-sm text-gray-400">
                      No status history available.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-100 p-5">
                    <div className="space-y-5">
                      {selectedReservation.statusHistory
                        .slice()
                        .reverse()
                        .map((history, index) => (
                          <div
                            key={`${history.status}-${history.changedAt}-${index}`}
                            className="relative flex gap-4"
                          >
                            {index !==
                              selectedReservation.statusHistory.length - 1 && (
                              <div className="absolute left-[9px] top-6 h-full w-0.5 bg-gray-200" />
                            )}

                            <div
                              className={`relative z-10 mt-1 h-5 w-5 flex-shrink-0 rounded-full ${getHistoryStyle(
                                history.status,
                              )}`}
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="font-bold text-gray-900">
                                  {getStatusIcon(history.status)}{" "}
                                  {history.status}
                                </p>

                                <p className="text-xs text-gray-400">
                                  {formatHistoryDate(history.changedAt)}
                                </p>
                              </div>

                              <p className="mt-1 text-sm text-gray-500">
                                Reservation status changed to{" "}
                                <span className="font-semibold text-gray-700">
                                  {history.status}
                                </span>
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CREATED INFORMATION */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Created
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      {formatHistoryDate(selectedReservation.createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Last Updated
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      {formatHistoryDate(selectedReservation.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* LOCK MESSAGE */}
              {(selectedReservation.status === "Cancelled" ||
                selectedReservation.status === "Completed") && (
                <div
                  className={`rounded-2xl border p-4 ${
                    selectedReservation.status === "Cancelled"
                      ? "border-red-100 bg-red-50"
                      : "border-blue-100 bg-blue-50"
                  }`}
                >
                  <p className="text-sm font-bold text-gray-700">
                    {selectedReservation.status === "Cancelled"
                      ? "🔒 This cancelled reservation is locked."
                      : "🔒 This completed reservation is locked."}
                  </p>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="sticky bottom-0 border-t border-gray-100 bg-white px-5 py-4 sm:px-7">
              <button
                onClick={() => setSelectedReservation(null)}
                className="w-full rounded-xl bg-gray-900 px-5 py-3 font-bold text-white transition hover:bg-gray-800"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReservations;
