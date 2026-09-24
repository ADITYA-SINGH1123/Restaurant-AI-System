import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Reservation = () => {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const loggedInUser = JSON.parse(
    localStorage.getItem("loggedInUser") || "null",
  );

  const [formData, setFormData] = useState({
    customerName: loggedInUser?.name || "",
    phone: loggedInUser?.phone || "",
    date: "",
    time: "",
    guests: 2,
    tableNumber: "",
    specialRequest: "",
  });

  const [loading, setLoading] = useState(false);
  const [checkingTables, setCheckingTables] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [bookedTables, setBookedTables] = useState([]);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);

  // ===============================
  // Login Protection
  // ===============================
  useEffect(() => {
    if (!token) {
      alert("Please login first to book a table.");
      navigate("/login");
    }
  }, [token, navigate]);

  // ===============================
  // Load Latest Profile Data
  // ===============================
  useEffect(() => {
    const loadProfileData = async () => {
      if (!token) {
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:5000/api/auth/loyalty-points",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          console.error(
            "Profile data fetch failed:",
            data.message || "Unknown error",
          );
          return;
        }

        // Backend se latest profile information lo
        if (data.user) {
          setFormData((current) => ({
            ...current,
            customerName: data.user.name || current.customerName || "",
            phone: data.user.phone || current.phone || "",
          }));

          // LocalStorage ko bhi latest profile data se sync karo
          const updatedUser = {
            ...(loggedInUser || {}),
            id: data.user.id,
            name: data.user.name || "",
            email: data.user.email || loggedInUser?.email || "",
            phone: data.user.phone || "",
            role: data.user.role || loggedInUser?.role || "customer",
            loyaltyPoints: Number(
              data.loyaltyPoints ?? loggedInUser?.loyaltyPoints ?? 0,
            ),
          };

          localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.error("Profile data loading error:", error);
      }
    };

    loadProfileData();
  }, [token]);

  // ===============================
  // Check Table Availability
  // ===============================
  useEffect(() => {
    const checkAvailability = async () => {
      if (!formData.date || !formData.time || !formData.guests || !token) {
        setAvailableTables([]);
        setBookedTables([]);
        setAvailabilityChecked(false);
        return;
      }

      setCheckingTables(true);
      setAvailabilityChecked(false);

      try {
        const params = new URLSearchParams({
          date: formData.date,
          time: formData.time,
          guests: String(formData.guests),
        });

        const response = await fetch(
          `http://localhost:5000/api/reservations/available-tables?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          alert(data.message || "Failed to check table availability.");
          setAvailableTables([]);
          setBookedTables([]);
          return;
        }

        setAvailableTables(data.availableTables || []);
        setBookedTables(data.bookedTables || []);
        setAvailabilityChecked(true);

        // If selected table is no longer available,
        // automatically reset it.
        if (
          formData.tableNumber &&
          !data.availableTables.some(
            (table) => table.tableNumber === Number(formData.tableNumber),
          )
        ) {
          setFormData((current) => ({
            ...current,
            tableNumber: "",
          }));
        }
      } catch (error) {
        console.error("Table availability error:", error);

        setAvailableTables([]);
        setBookedTables([]);
        setAvailabilityChecked(false);
      } finally {
        setCheckingTables(false);
      }
    };

    checkAvailability();
  }, [formData.date, formData.time, formData.guests, token]);

  // ===============================
  // Handle Form Change
  // ===============================
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // ===============================
  // Submit Reservation
  // ===============================
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      alert("Please login first.");
      navigate("/login");
      return;
    }

    if (
      !formData.customerName.trim() ||
      !formData.phone.trim() ||
      !formData.date ||
      !formData.time ||
      !formData.guests
    ) {
      alert("Please fill all required fields.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      alert("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    if (Number(formData.guests) < 1) {
      alert("Number of guests must be at least 1.");
      return;
    }

    // Require table availability check
    if (!availabilityChecked) {
      alert("Please wait while table availability is checked.");
      return;
    }

    // No table available
    if (availableTables.length === 0) {
      alert(
        "❌ No table is available for the selected date, time and number of guests.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName: formData.customerName.trim(),
          phone: formData.phone.trim(),
          date: formData.date,
          time: formData.time,
          guests: Number(formData.guests),
          tableNumber: formData.tableNumber
            ? Number(formData.tableNumber)
            : null,
          specialRequest: formData.specialRequest.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to book table.");
        return;
      }

      alert(
        `✅ Table reservation request submitted successfully!\n\nReservation ID: ${data.reservation.reservationId}\nStatus: ${data.reservation.status}\nTable: ${
          data.reservation.tableNumber
            ? `Table ${data.reservation.tableNumber}`
            : "Any Available Table"
        }`,
      );

      // Profile ka latest name/phone preserve rakho
      setFormData({
        customerName: formData.customerName,
        phone: formData.phone,
        date: "",
        time: "",
        guests: 2,
        tableNumber: "",
        specialRequest: "",
      });

      setAvailableTables([]);
      setBookedTables([]);
      setAvailabilityChecked(false);

      navigate("/my-reservations");
    } catch (error) {
      console.error("Reservation error:", error);
      alert("❌ Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // Today Date
  // ===============================
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-orange-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-5xl">🍽️</div>

          <h1 className="text-3xl font-bold text-gray-800">
            Reserve Your Table
          </h1>

          <p className="mt-2 text-gray-600">
            Book your table and enjoy a comfortable dining experience.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Name */}
            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                Full Name *
              </label>

              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                Phone Number *
              </label>

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                maxLength="10"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-semibold text-gray-700">
                  Reservation Date *
                </label>

                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  min={today}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold text-gray-700">
                  Reservation Time *
                </label>

                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            {/* Guests */}
            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                Number of Guests *
              </label>

              <input
                type="number"
                name="guests"
                value={formData.guests}
                min="1"
                max="20"
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                required
              />
            </div>

            {/* Availability Status */}
            {formData.date && formData.time && formData.guests && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                {checkingTables ? (
                  <div className="flex items-center gap-3 text-orange-700">
                    <span className="animate-spin text-xl">⏳</span>

                    <span className="font-semibold">
                      Checking available tables...
                    </span>
                  </div>
                ) : availabilityChecked ? (
                  <>
                    {availableTables.length > 0 ? (
                      <div>
                        <p className="font-semibold text-green-700">
                          🟢 {availableTables.length} table
                          {availableTables.length > 1 ? "s" : ""} available
                        </p>

                        <p className="mt-1 text-sm text-gray-600">
                          Select your preferred table below.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-red-600">
                          🔴 No table available
                        </p>

                        <p className="mt-1 text-sm text-gray-600">
                          Please try another time or reduce the number of
                          guests.
                        </p>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}

            {/* Table Selection */}
            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                Select Table
              </label>

              <select
                name="tableNumber"
                value={formData.tableNumber}
                onChange={handleChange}
                disabled={
                  checkingTables ||
                  !availabilityChecked ||
                  availableTables.length === 0
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-orange-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">Any Available Table</option>

                {availableTables.map((table) => (
                  <option key={table.tableNumber} value={table.tableNumber}>
                    Table {table.tableNumber} — {table.seats} Seats
                  </option>
                ))}
              </select>

              {/* Booked Tables */}
              {availabilityChecked && bookedTables.length > 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  🔴 Already booked:{" "}
                  {bookedTables
                    .map((tableNumber) => `Table ${tableNumber}`)
                    .join(", ")}
                </p>
              )}
            </div>

            {/* Available Table Cards */}
            {availabilityChecked && availableTables.length > 0 && (
              <div>
                <p className="mb-3 font-semibold text-gray-700">
                  Available Tables
                </p>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {availableTables.map((table) => (
                    <button
                      key={table.tableNumber}
                      type="button"
                      onClick={() =>
                        setFormData((current) => ({
                          ...current,
                          tableNumber: String(table.tableNumber),
                        }))
                      }
                      className={`rounded-xl border p-4 text-left transition ${
                        formData.tableNumber === String(table.tableNumber)
                          ? "border-orange-500 bg-orange-100 ring-2 ring-orange-300"
                          : "border-gray-200 bg-gray-50 hover:border-orange-400 hover:bg-orange-50"
                      }`}
                    >
                      <div className="text-2xl">🪑</div>

                      <p className="mt-2 font-bold text-gray-800">
                        Table {table.tableNumber}
                      </p>

                      <p className="text-sm text-gray-600">
                        {table.seats} Seats
                      </p>

                      {formData.tableNumber === String(table.tableNumber) && (
                        <p className="mt-2 text-xs font-semibold text-orange-600">
                          ✓ Selected
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Special Request */}
            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                Special Request
              </label>

              <textarea
                name="specialRequest"
                value={formData.specialRequest}
                onChange={handleChange}
                placeholder="Any special request? (Optional)"
                rows="4"
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>

            {/* Information */}
            <div className="rounded-lg bg-orange-50 p-4 text-sm text-gray-700">
              <p className="font-semibold">📌 Reservation Information</p>

              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Table availability is checked automatically.</li>

                <li>Already reserved tables cannot be selected.</li>

                <li>Your reservation will initially be marked as Pending.</li>

                <li>Admin will confirm your reservation.</li>

                <li>
                  You can view and cancel your reservation from My Reservations.
                </li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="submit"
                disabled={
                  loading ||
                  checkingTables ||
                  !availabilityChecked ||
                  availableTables.length === 0
                }
                className="flex-1 rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Booking..."
                  : checkingTables
                    ? "Checking Tables..."
                    : "🍽️ Book Table"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/")}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Reservation;
