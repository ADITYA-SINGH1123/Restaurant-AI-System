import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:5000";

const STATUS_STEPS = ["Pending", "Confirmed", "Completed"];

const MyReservations = () => {
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // React Compiler safe:
  // Date.now() is called inside an effect, not during render.
  const [currentTime, setCurrentTime] = useState(null);

  // ======================================================
  // CURRENT TOKEN
  // ======================================================

  const getToken = () => {
    return localStorage.getItem("token");
  };

  // ======================================================
  // CURRENT TIME UPDATE
  // ======================================================

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setCurrentTime(Date.now());
    }, 0);

    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, []);

  // ======================================================
  // STATUS ICON
  // ======================================================

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

  // ======================================================
  // STATUS INDEX
  // ======================================================

  const getStatusIndex = (status) => {
    const index = STATUS_STEPS.indexOf(status);

    return index === -1 ? 0 : index;
  };

  // ======================================================
  // FORMAT DATE
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

  // ======================================================
  // FORMAT TIME
  // ======================================================

  const formatTime = (time) => {
    if (!time) {
      return "-";
    }

    const timeParts = time.split(":");

    if (timeParts.length < 2) {
      return time;
    }

    const hourNumber = Number(timeParts[0]);
    const minutes = timeParts[1];

    if (Number.isNaN(hourNumber)) {
      return time;
    }

    const suffix = hourNumber >= 12 ? "PM" : "AM";
    const displayHour = hourNumber % 12 || 12;

    return `${displayHour}:${minutes} ${suffix}`;
  };

  // ======================================================
  // FORMAT DATE + TIME
  // ======================================================

  const formatDateTime = (date, time) => {
    if (!date || !time) {
      return "-";
    }

    return `${formatDate(date)} • ${formatTime(time)}`;
  };

  // ======================================================
  // GET RESERVATION DATE TIME
  // ======================================================

  const getReservationDateTime = (reservation) => {
    if (!reservation?.date || !reservation?.time) {
      return null;
    }

    const reservationDateTime = new Date(
      `${reservation.date}T${reservation.time}:00`,
    );

    if (Number.isNaN(reservationDateTime.getTime())) {
      return null;
    }

    return reservationDateTime;
  };

  // ======================================================
  // CHECK PAST RESERVATION
  // ======================================================

  const isPastReservation = (reservation) => {
    const reservationDateTime = getReservationDateTime(reservation);

    if (!reservationDateTime || currentTime === null) {
      return false;
    }

    return reservationDateTime.getTime() < currentTime;
  };

  // ======================================================
  // FETCH RESERVATIONS
  // ======================================================

  const fetchReservations = useCallback(
    async (showLoader = true) => {
      const currentToken = getToken();

      if (!currentToken) {
        setLoading(false);
        navigate("/login");
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const response = await fetch(
          `${API_BASE_URL}/api/reservations/my-reservations`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("loggedInUser");

            alert("Your session has expired. Please login again.");
            navigate("/login");
            return;
          }

          alert(data.message || "Failed to fetch reservations.");
          return;
        }

        setReservations(data.reservations || []);
      } catch (error) {
        console.error("Fetch reservations error:", error);
        alert("❌ Cannot connect to server.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate],
  );

  // ======================================================
  // LOGIN CHECK
  // ======================================================

  useEffect(() => {
    const currentToken = getToken();

    if (!currentToken) {
      const loginTimer = setTimeout(() => {
        alert("Please login first.");
        navigate("/login");
      }, 0);

      return () => {
        clearTimeout(loginTimer);
      };
    }

    return undefined;
  }, [navigate]);

  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {
    const currentToken = getToken();

    if (!currentToken) {
      return undefined;
    }

    // Delayed callback prevents React Compiler cascading
    // setState warning from the effect body.
    const loadTimer = setTimeout(() => {
      fetchReservations();
    }, 0);

    return () => {
      clearTimeout(loadTimer);
    };
  }, [fetchReservations]);

  // ======================================================
  // REFRESH
  // ======================================================

  const handleRefresh = async () => {
    const currentToken = getToken();

    if (!currentToken || refreshing) {
      return;
    }

    await fetchReservations(false);
  };

  // ======================================================
  // COPY RESERVATION ID
  // ======================================================

  const handleCopyReservationId = async (reservationId) => {
    if (!reservationId) {
      return;
    }

    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(reservationId);
      } else {
        const textArea = document.createElement("textarea");

        textArea.value = reservationId;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";

        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        document.execCommand("copy");

        document.body.removeChild(textArea);
      }

      setCopiedId(reservationId);

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      console.error("Copy reservation ID error:", error);
      alert("❌ Unable to copy Reservation ID.");
    }
  };

  // ======================================================
  // CANCEL RESERVATION
  // ======================================================

  const handleCancelReservation = async (reservation) => {
    if (!reservation) {
      return;
    }

    const currentToken = getToken();

    if (!currentToken) {
      alert("Please login first.");
      navigate("/login");
      return;
    }

    // Already cancelled
    if (reservation.status === "Cancelled") {
      alert("This reservation is already cancelled.");
      return;
    }

    // Completed protection
    if (reservation.status === "Completed") {
      alert("Completed reservation cannot be cancelled.");
      return;
    }

    // Past reservation protection
    if (isPastReservation(reservation)) {
      alert("Past reservation cannot be cancelled.");
      return;
    }

    // Duplicate cancellation protection
    if (cancellingId === reservation._id) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel reservation ${reservation.reservationId}?`,
    );

    if (!confirmed) {
      return;
    }

    setCancellingId(reservation._id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reservations/${reservation._id}/cancel`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("loggedInUser");

          alert("Your session has expired. Please login again.");
          navigate("/login");
          return;
        }

        alert(data.message || "Failed to cancel reservation.");
        return;
      }

      setReservations((currentReservations) =>
        currentReservations.map((item) =>
          item._id === reservation._id ? data.reservation : item,
        ),
      );

      setSelectedReservation((currentReservation) =>
        currentReservation?._id === reservation._id
          ? data.reservation
          : currentReservation,
      );

      alert("✅ Reservation cancelled successfully.");
    } catch (error) {
      console.error("Cancel reservation error:", error);
      alert("❌ Cannot connect to server.");
    } finally {
      setCancellingId(null);
    }
  };

  // ======================================================
  // OPEN DETAILS
  // ======================================================

  const handleViewDetails = (reservation) => {
    setSelectedReservation(reservation);
  };

  // ======================================================
  // CLOSE DETAILS
  // ======================================================

  const handleCloseDetails = () => {
    setSelectedReservation(null);
  };

  // ======================================================
  // UPCOMING RESERVATION
  // ======================================================

  const upcomingReservation = useMemo(() => {
    const upcoming = reservations
      .filter((reservation) => {
        if (
          reservation.status === "Cancelled" ||
          reservation.status === "Completed"
        ) {
          return false;
        }

        const reservationDateTime = getReservationDateTime(reservation);

        if (!reservationDateTime) {
          return false;
        }

        if (currentTime === null) {
          return true;
        }

        return reservationDateTime.getTime() >= currentTime;
      })
      .sort((a, b) => {
        const dateA = getReservationDateTime(a);
        const dateB = getReservationDateTime(b);

        if (!dateA || !dateB) {
          return 0;
        }

        return dateA.getTime() - dateB.getTime();
      });

    return upcoming[0] || null;
  }, [reservations, currentTime]);

  // ======================================================
  // COUNTS
  // ======================================================

  const totalReservations = reservations.length;

  const pendingReservations = reservations.filter(
    (reservation) => reservation.status === "Pending",
  ).length;

  const confirmedReservations = reservations.filter(
    (reservation) => reservation.status === "Confirmed",
  ).length;

  const completedReservations = reservations.filter(
    (reservation) => reservation.status === "Completed",
  ).length;

  const cancelledReservations = reservations.filter(
    (reservation) => reservation.status === "Cancelled",
  ).length;

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-orange-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600"></div>

          <p className="font-semibold text-gray-600">
            Loading your reservations...
          </p>
        </div>
      </div>
    );
  }

  // ======================================================
  // PAGE
  // ======================================================

  return (
    <div className="min-h-screen bg-orange-50 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="text-4xl">📅</span>

              <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">
                My Reservations
              </h1>
            </div>

            <p className="text-sm text-gray-600 sm:text-base">
              View and manage your restaurant table reservations.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/reservation")}
              className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-orange-700"
            >
              🍽️ Book Table
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "🔄 Refresh"}
            </button>
          </div>
        </div>

        {/* ==================================================
            NEXT RESERVATION
        ================================================== */}

        {upcomingReservation && (
          <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 to-orange-500 p-5 text-white shadow-lg sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-orange-100">
                  Your Next Reservation
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  🪑 Table {upcomingReservation.tableNumber || "Any Available"}
                </h2>

                <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-orange-50">
                  <span>📅 {formatDate(upcomingReservation.date)}</span>

                  <span>🕐 {formatTime(upcomingReservation.time)}</span>

                  <span>👥 {upcomingReservation.guests} Guests</span>
                </div>
              </div>

              <button
                onClick={() => handleViewDetails(upcomingReservation)}
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-orange-700 shadow-md transition hover:bg-orange-50"
              >
                🔍 View Reservation
              </button>
            </div>
          </div>
        )}

        {/* ==================================================
            SUMMARY
        ================================================== */}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total</p>

            <p className="mt-2 text-3xl font-black text-gray-900">
              {totalReservations}
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Pending</p>

            <p className="mt-2 text-3xl font-black text-yellow-600">
              {pendingReservations}
            </p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Confirmed</p>

            <p className="mt-2 text-3xl font-black text-green-600">
              {confirmedReservations}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Completed</p>

            <p className="mt-2 text-3xl font-black text-blue-600">
              {completedReservations}
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Cancelled</p>

            <p className="mt-2 text-3xl font-black text-red-600">
              {cancelledReservations}
            </p>
          </div>
        </div>

        {/* ==================================================
            EMPTY STATE
        ================================================== */}

        {reservations.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-4xl">
              🍽️
            </div>

            <h2 className="mt-5 text-2xl font-black text-gray-900">
              No Reservations Yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-gray-500">
              You haven't booked a table yet. Reserve a table and enjoy your
              dining experience with us.
            </p>

            <button
              onClick={() => navigate("/reservation")}
              className="mt-6 rounded-xl bg-orange-600 px-6 py-3 font-bold text-white shadow-md transition hover:bg-orange-700"
            >
              🍽️ Reserve a Table
            </button>
          </div>
        ) : (
          /* ==================================================
             RESERVATION LIST
          ================================================== */

          <div className="space-y-6">
            {reservations.map((reservation) => {
              const currentStatusIndex = getStatusIndex(reservation.status);

              const canCancel =
                reservation.status !== "Cancelled" &&
                reservation.status !== "Completed" &&
                !isPastReservation(reservation);

              return (
                <div
                  key={reservation._id}
                  className={`overflow-hidden rounded-3xl bg-white shadow-sm transition hover:shadow-md ${
                    upcomingReservation?._id === reservation._id
                      ? "ring-2 ring-orange-300"
                      : ""
                  }`}
                >
                  {/* ==================================================
                      HEADER
                  ================================================== */}

                  <div className="border-b border-gray-100 p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        {upcomingReservation?._id === reservation._id && (
                          <span className="mb-2 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                            ⭐ Next Upcoming Reservation
                          </span>
                        )}

                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Reservation ID
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <h2 className="break-all text-lg font-black text-gray-900">
                            {reservation.reservationId}
                          </h2>

                          <button
                            onClick={() =>
                              handleCopyReservationId(reservation.reservationId)
                            }
                            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-orange-50 hover:text-orange-700"
                            title="Copy Reservation ID"
                          >
                            {copiedId === reservation.reservationId
                              ? "✅ Copied"
                              : "📋 Copy"}
                          </button>
                        </div>
                      </div>

                      <div
                        className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${getStatusStyle(
                          reservation.status,
                        )}`}
                      >
                        <span>{getStatusIcon(reservation.status)}</span>

                        {reservation.status}
                      </div>
                    </div>
                  </div>

                  {/* ==================================================
                      QUICK DETAILS
                  ================================================== */}

                  <div className="grid gap-4 p-5 sm:grid-cols-2 md:grid-cols-4 md:p-6">
                    <div className="rounded-2xl bg-orange-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Date
                      </p>

                      <p className="mt-2 font-bold text-gray-900">
                        📅 {formatDate(reservation.date)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-orange-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Time
                      </p>

                      <p className="mt-2 font-bold text-gray-900">
                        🕐 {formatTime(reservation.time)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-orange-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Guests
                      </p>

                      <p className="mt-2 font-bold text-gray-900">
                        👥 {reservation.guests}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-orange-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Table
                      </p>

                      <p className="mt-2 font-bold text-gray-900">
                        🪑{" "}
                        {reservation.tableNumber
                          ? `Table ${reservation.tableNumber}`
                          : "Any Available"}
                      </p>
                    </div>
                  </div>

                  {/* ==================================================
                      STATUS TIMELINE
                  ================================================== */}

                  {reservation.status !== "Cancelled" ? (
                    <div className="border-t border-gray-100 px-5 py-6 md:px-6">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-gray-800">
                            Reservation Status
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            Track your reservation progress
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyle(
                            reservation.status,
                          )}`}
                        >
                          {reservation.status}
                        </span>
                      </div>

                      {/* DESKTOP TIMELINE */}

                      <div className="hidden md:block">
                        <div className="relative">
                          <div className="absolute left-[10%] right-[10%] top-5 h-1 rounded-full bg-gray-200"></div>

                          <div
                            className="absolute left-[10%] top-5 h-1 rounded-full bg-orange-500 transition-all"
                            style={{
                              width:
                                currentStatusIndex <= 0
                                  ? "0%"
                                  : currentStatusIndex === 1
                                    ? "40%"
                                    : "80%",
                            }}
                          ></div>

                          <div className="relative grid grid-cols-3">
                            {STATUS_STEPS.map((step, index) => {
                              const completed = index <= currentStatusIndex;

                              return (
                                <div
                                  key={step}
                                  className="flex flex-col items-center"
                                >
                                  <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-white text-sm font-bold shadow ${
                                      completed
                                        ? "bg-orange-500 text-white"
                                        : "bg-gray-200 text-gray-500"
                                    }`}
                                  >
                                    {completed
                                      ? index === 2
                                        ? "🎉"
                                        : "✓"
                                      : index + 1}
                                  </div>

                                  <p
                                    className={`mt-2 text-xs font-bold ${
                                      completed
                                        ? "text-orange-700"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {step}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* MOBILE TIMELINE */}

                      <div className="space-y-3 md:hidden">
                        {STATUS_STEPS.map((step, index) => {
                          const completed = index <= currentStatusIndex;

                          return (
                            <div
                              key={step}
                              className={`flex items-center gap-3 rounded-xl border p-3 ${
                                completed
                                  ? "border-orange-200 bg-orange-50"
                                  : "border-gray-100 bg-gray-50"
                              }`}
                            >
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                  completed
                                    ? "bg-orange-500 text-white"
                                    : "bg-gray-200 text-gray-500"
                                }`}
                              >
                                {completed
                                  ? index === 2
                                    ? "🎉"
                                    : "✓"
                                  : index + 1}
                              </div>

                              <div>
                                <p
                                  className={`text-sm font-bold ${
                                    completed
                                      ? "text-orange-700"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {step}
                                </p>

                                <p className="text-xs text-gray-400">
                                  {completed ? "Completed" : "Waiting"}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-red-100 bg-red-50 px-5 py-5 md:px-6">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl">
                          ❌
                        </div>

                        <div>
                          <p className="font-black text-red-700">
                            Reservation Cancelled
                          </p>

                          <p className="mt-1 text-sm text-red-600">
                            This reservation is no longer active.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ==================================================
                      CUSTOMER + SPECIAL REQUEST
                  ================================================== */}

                  <div className="grid gap-4 px-5 pb-5 md:grid-cols-2 md:px-6 md:pb-6">
                    <div className="rounded-2xl border border-gray-100 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Customer
                      </p>

                      <p className="mt-2 font-semibold text-gray-900">
                        👤 {reservation.customerName}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        📱 {reservation.phone}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-100 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Special Request
                      </p>

                      <p className="mt-2 text-sm text-gray-700">
                        {reservation.specialRequest ||
                          "No special request added."}
                      </p>
                    </div>
                  </div>

                  {/* ==================================================
                      RESERVATION HISTORY
                  ================================================== */}

                  {reservation.statusHistory?.length > 0 && (
                    <div className="border-t border-gray-100 px-5 py-5 md:px-6">
                      <p className="mb-4 text-sm font-black text-gray-800">
                        📜 Reservation History
                      </p>

                      <div className="space-y-4">
                        {reservation.statusHistory.map((history, index) => (
                          <div
                            key={`${reservation._id}-${index}`}
                            className="flex items-start gap-3"
                          >
                            <div className="relative">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50">
                                {getStatusIcon(history.status)}
                              </span>

                              {index < reservation.statusHistory.length - 1 && (
                                <span className="absolute left-1/2 top-9 h-5 w-px -translate-x-1/2 bg-gray-200"></span>
                              )}
                            </div>

                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">
                                {history.status}
                              </p>

                              <p className="text-xs text-gray-400">
                                {history.changedAt
                                  ? new Date(history.changedAt).toLocaleString(
                                      "en-IN",
                                    )
                                  : "-"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ==================================================
                      ACTIONS
                  ================================================== */}

                  <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
                    <button
                      onClick={() => handleViewDetails(reservation)}
                      className="rounded-xl border border-orange-200 bg-white px-5 py-3 text-sm font-bold text-orange-600 transition hover:bg-orange-50"
                    >
                      🔍 View Full Details
                    </button>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      {reservation.status === "Pending" && (
                        <div className="rounded-xl bg-yellow-50 px-5 py-3 text-center text-sm font-bold text-yellow-700">
                          ⏳ Waiting for admin confirmation
                        </div>
                      )}

                      {reservation.status === "Confirmed" && (
                        <div className="rounded-xl bg-green-50 px-5 py-3 text-center text-sm font-bold text-green-700">
                          ✅ Your table is confirmed!
                        </div>
                      )}

                      {reservation.status === "Completed" && (
                        <div className="rounded-xl bg-blue-50 px-5 py-3 text-center text-sm font-bold text-blue-700">
                          🎉 Reservation completed
                        </div>
                      )}

                      {reservation.status === "Cancelled" && (
                        <div className="rounded-xl bg-red-50 px-5 py-3 text-center text-sm font-bold text-red-600">
                          ❌ This reservation has been cancelled
                        </div>
                      )}

                      {canCancel && (
                        <button
                          onClick={() => handleCancelReservation(reservation)}
                          disabled={cancellingId === reservation._id}
                          className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {cancellingId === reservation._id
                            ? "Cancelling..."
                            : "❌ Cancel Reservation"}
                        </button>
                      )}

                      {!canCancel &&
                        reservation.status !== "Cancelled" &&
                        reservation.status !== "Completed" && (
                          <div className="rounded-xl bg-gray-100 px-5 py-3 text-center text-xs font-bold text-gray-500">
                            🔒 Past reservation cannot be cancelled
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ==================================================
            DETAILS MODAL
        ================================================== */}

        {selectedReservation && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={handleCloseDetails}
          >
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              {/* MODAL HEADER */}

              <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white p-5 sm:p-6">
                <div className="min-w-0 pr-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Full Reservation Details
                  </p>

                  <h2 className="mt-1 break-all text-xl font-black text-gray-900 sm:text-2xl">
                    {selectedReservation.reservationId}
                  </h2>

                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                        selectedReservation.status,
                      )}`}
                    >
                      {getStatusIcon(selectedReservation.status)}{" "}
                      {selectedReservation.status}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCloseDetails}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-600 transition hover:bg-gray-200"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* MODAL BODY */}

              <div className="space-y-5 p-5 sm:p-6">
                {/* RESERVATION ID */}

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Reservation ID
                      </p>

                      <p className="mt-1 break-all font-black text-gray-900">
                        {selectedReservation.reservationId}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        handleCopyReservationId(
                          selectedReservation.reservationId,
                        )
                      }
                      className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-orange-700 shadow-sm transition hover:bg-orange-100"
                    >
                      {copiedId === selectedReservation.reservationId
                        ? "✅ Copied"
                        : "📋 Copy ID"}
                    </button>
                  </div>
                </div>

                {/* DATE / TIME / TABLE / GUEST */}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Date
                    </p>

                    <p className="mt-2 font-bold text-gray-900">
                      📅 {formatDate(selectedReservation.date)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Time
                    </p>

                    <p className="mt-2 font-bold text-gray-900">
                      🕐 {formatTime(selectedReservation.time)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Guests
                    </p>

                    <p className="mt-2 font-bold text-gray-900">
                      👥 {selectedReservation.guests}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Assigned Table
                    </p>

                    <p className="mt-2 font-bold text-gray-900">
                      🪑{" "}
                      {selectedReservation.tableNumber
                        ? `Table ${selectedReservation.tableNumber}`
                        : "Any Available"}
                    </p>
                  </div>
                </div>

                {/* DATE + TIME SUMMARY */}

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Reservation Schedule
                  </p>

                  <p className="mt-2 text-lg font-black text-gray-900">
                    📅{" "}
                    {formatDateTime(
                      selectedReservation.date,
                      selectedReservation.time,
                    )}
                  </p>
                </div>

                {/* CUSTOMER */}

                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Customer Information
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-400">Name</p>

                      <p className="mt-1 font-bold text-gray-900">
                        👤 {selectedReservation.customerName}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Phone</p>

                      <p className="mt-1 font-bold text-gray-900">
                        📱 {selectedReservation.phone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SPECIAL REQUEST */}

                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Special Request
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {selectedReservation.specialRequest ||
                      "No special request added."}
                  </p>
                </div>

                {/* STATUS TIMELINE */}

                {selectedReservation.status !== "Cancelled" ? (
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="mb-5 text-sm font-black text-gray-800">
                      📜 Status Timeline
                    </p>

                    <div className="space-y-4">
                      {STATUS_STEPS.map((step, index) => {
                        const currentIndex = getStatusIndex(
                          selectedReservation.status,
                        );

                        const completed = index <= currentIndex;

                        const historyItem =
                          selectedReservation.statusHistory?.find(
                            (history) => history.status === step,
                          );

                        return (
                          <div key={step} className="flex items-start gap-3">
                            <div className="relative">
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                                  completed
                                    ? "bg-orange-500 text-white"
                                    : "bg-gray-100 text-gray-400"
                                }`}
                              >
                                {completed
                                  ? index === 2
                                    ? "🎉"
                                    : "✓"
                                  : index + 1}
                              </div>

                              {index < STATUS_STEPS.length - 1 && (
                                <div className="absolute left-1/2 top-10 h-5 w-px -translate-x-1/2 bg-gray-200"></div>
                              )}
                            </div>

                            <div className="flex-1">
                              <p
                                className={`font-bold ${
                                  completed ? "text-gray-900" : "text-gray-400"
                                }`}
                              >
                                {step}
                              </p>

                              <p className="text-xs text-gray-400">
                                {historyItem?.changedAt
                                  ? new Date(
                                      historyItem.changedAt,
                                    ).toLocaleString("en-IN")
                                  : completed
                                    ? "Completed"
                                    : "Waiting"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                    <p className="font-black text-red-700">
                      ❌ Reservation Cancelled
                    </p>

                    <p className="mt-1 text-sm text-red-600">
                      This reservation is no longer active.
                    </p>
                  </div>
                )}

                {/* COMPLETE HISTORY */}

                {selectedReservation.statusHistory?.length > 0 && (
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="mb-4 text-sm font-black text-gray-800">
                      🕐 Complete Status History
                    </p>

                    <div className="space-y-3">
                      {selectedReservation.statusHistory.map(
                        (history, index) => (
                          <div
                            key={`${selectedReservation._id}-history-${index}`}
                            className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">
                                {getStatusIcon(history.status)}
                              </span>

                              <span className="text-sm font-bold text-gray-800">
                                {history.status}
                              </span>
                            </div>

                            <span className="text-right text-xs text-gray-400">
                              {history.changedAt
                                ? new Date(history.changedAt).toLocaleString(
                                    "en-IN",
                                  )
                                : "-"}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* CREATED / UPDATED */}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Created
                    </p>

                    <p className="mt-2 text-sm font-semibold text-gray-700">
                      {selectedReservation.createdAt
                        ? new Date(
                            selectedReservation.createdAt,
                          ).toLocaleString("en-IN")
                        : "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Last Updated
                    </p>

                    <p className="mt-2 text-sm font-semibold text-gray-700">
                      {selectedReservation.updatedAt
                        ? new Date(
                            selectedReservation.updatedAt,
                          ).toLocaleString("en-IN")
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}

              <div className="sticky bottom-0 flex flex-col gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:justify-end sm:p-6">
                {selectedReservation.status !== "Cancelled" &&
                  selectedReservation.status !== "Completed" &&
                  !isPastReservation(selectedReservation) && (
                    <button
                      onClick={() =>
                        handleCancelReservation(selectedReservation)
                      }
                      disabled={cancellingId === selectedReservation._id}
                      className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancellingId === selectedReservation._id
                        ? "Cancelling..."
                        : "❌ Cancel Reservation"}
                    </button>
                  )}

                <button
                  onClick={handleCloseDetails}
                  className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReservations;
