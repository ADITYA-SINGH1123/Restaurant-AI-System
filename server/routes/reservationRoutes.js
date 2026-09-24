const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Reservation = require("../models/Reservation");

const router = express.Router();

// ======================================================
// RESTAURANT TABLES
// ======================================================

const RESTAURANT_TABLES = [
  { tableNumber: 1, seats: 2 },
  { tableNumber: 2, seats: 2 },
  { tableNumber: 3, seats: 4 },
  { tableNumber: 4, seats: 4 },
  { tableNumber: 5, seats: 6 },
  { tableNumber: 6, seats: 8 },
];

// ======================================================
// AUTH MIDDLEWARE
// ======================================================

const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    console.error("Reservation auth error:", error);

    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

// ======================================================
// ADMIN MIDDLEWARE
// ======================================================

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required.",
    });
  }

  next();
};

// ======================================================
// RESERVATION ID GENERATOR
// ======================================================

const generateReservationId = () => {
  const randomNumber = Math.floor(100000 + Math.random() * 900000);

  return `RES-${randomNumber}`;
};

// ======================================================
// GET AVAILABLE TABLES
// GET /api/reservations/available-tables
// ======================================================

router.get("/available-tables", requireAuth, async (req, res) => {
  try {
    const { date, time, guests } = req.query;

    if (!date || !time || !guests) {
      return res.status(400).json({
        message: "Date, time and guests are required.",
      });
    }

    const guestCount = Number(guests);

    if (!Number.isInteger(guestCount) || guestCount < 1) {
      return res.status(400).json({
        message: "Guests must be a valid number.",
      });
    }

    // Find already booked tables for same date/time
    const existingReservations = await Reservation.find({
      date,
      time,
      status: {
        $in: ["Pending", "Confirmed"],
      },
      tableNumber: {
        $ne: null,
      },
    }).select("tableNumber");

    const bookedTables = existingReservations
      .map((reservation) => reservation.tableNumber)
      .filter((tableNumber) => tableNumber !== null);

    // Available tables
    const availableTables = RESTAURANT_TABLES.filter(
      (table) =>
        table.seats >= guestCount && !bookedTables.includes(table.tableNumber),
    );

    return res.status(200).json({
      availableTables,
      bookedTables,
      totalAvailable: availableTables.length,
    });
  } catch (error) {
    console.error("Available tables error:", error);

    return res.status(500).json({
      message: "Failed to check table availability.",
    });
  }
});

// ======================================================
// CREATE RESERVATION
// POST /api/reservations
// ======================================================

router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      customerName,
      phone,
      date,
      time,
      guests,
      tableNumber,
      specialRequest,
    } = req.body;

    // --------------------------------------------------
    // Basic validation
    // --------------------------------------------------

    if (!customerName || !phone || !date || !time || !guests) {
      return res.status(400).json({
        message: "Please fill all required reservation fields.",
      });
    }

    const guestCount = Number(guests);

    if (!Number.isInteger(guestCount) || guestCount < 1) {
      return res.status(400).json({
        message: "Guests must be at least 1.",
      });
    }

    // --------------------------------------------------
    // Validate phone
    // --------------------------------------------------

    if (!/^[6-9]\d{9}$/.test(String(phone))) {
      return res.status(400).json({
        message: "Please enter a valid Indian phone number.",
      });
    }

    // --------------------------------------------------
    // Determine selected table
    //
    // null / empty = Any Available Table
    // --------------------------------------------------

    let requestedTableNumber = null;

    if (
      tableNumber !== null &&
      tableNumber !== undefined &&
      tableNumber !== ""
    ) {
      requestedTableNumber = Number(tableNumber);

      if (!Number.isInteger(requestedTableNumber)) {
        return res.status(400).json({
          message: "Invalid table number.",
        });
      }
    }

    // --------------------------------------------------
    // Validate requested table
    // --------------------------------------------------

    if (requestedTableNumber !== null) {
      const requestedTable = RESTAURANT_TABLES.find(
        (table) => table.tableNumber === requestedTableNumber,
      );

      if (!requestedTable) {
        return res.status(400).json({
          message: "Selected table does not exist.",
        });
      }

      if (guestCount > requestedTable.seats) {
        return res.status(400).json({
          message: `Selected table can accommodate only ${requestedTable.seats} guests.`,
        });
      }
    }

    // --------------------------------------------------
    // Find booked tables for same date/time
    // --------------------------------------------------

    const existingReservations = await Reservation.find({
      date,
      time,
      status: {
        $in: ["Pending", "Confirmed"],
      },
      tableNumber: {
        $ne: null,
      },
    }).select("tableNumber");

    const bookedTableNumbers = existingReservations
      .map((reservation) => Number(reservation.tableNumber))
      .filter((number) => Number.isInteger(number));

    // --------------------------------------------------
    // AUTOMATIC TABLE ASSIGNMENT
    //
    // If customer selected "Any Available Table",
    // choose the smallest suitable available table.
    // --------------------------------------------------

    let assignedTableNumber = requestedTableNumber;

    if (requestedTableNumber === null) {
      const suitableAvailableTables = RESTAURANT_TABLES.filter(
        (table) =>
          table.seats >= guestCount &&
          !bookedTableNumbers.includes(table.tableNumber),
      ).sort((a, b) => {
        // Smallest suitable table first
        if (a.seats !== b.seats) {
          return a.seats - b.seats;
        }

        return a.tableNumber - b.tableNumber;
      });

      if (suitableAvailableTables.length === 0) {
        return res.status(409).json({
          message:
            "Sorry, no suitable table is available for the selected date, time and number of guests.",
        });
      }

      assignedTableNumber = suitableAvailableTables[0].tableNumber;
    }

    // --------------------------------------------------
    // Double-booking protection
    // --------------------------------------------------

    const duplicateReservation = await Reservation.findOne({
      date,
      time,
      tableNumber: assignedTableNumber,
      status: {
        $in: ["Pending", "Confirmed"],
      },
    });

    if (duplicateReservation) {
      return res.status(409).json({
        message:
          "Sorry, this table was just booked. Please choose another table or try again.",
      });
    }

    // --------------------------------------------------
    // Generate unique reservation ID
    // --------------------------------------------------

    let reservationId;
    let reservationIdExists = true;

    while (reservationIdExists) {
      reservationId = generateReservationId();

      const existingId = await Reservation.findOne({
        reservationId,
      });

      reservationIdExists = Boolean(existingId);
    }

    // --------------------------------------------------
    // Create reservation
    // --------------------------------------------------

    const reservation = await Reservation.create({
      reservationId,
      customer: req.user.id || req.user._id,
      customerName: String(customerName).trim(),
      phone: String(phone).trim(),
      date,
      time,
      guests: guestCount,
      tableNumber: assignedTableNumber,
      specialRequest: specialRequest ? String(specialRequest).trim() : "",
      status: "Pending",
      statusHistory: [
        {
          status: "Pending",
          changedAt: new Date(),
        },
      ],
    });

    return res.status(201).json({
      message: "Reservation created successfully.",
      reservation,
    });
  } catch (error) {
    console.error("Create reservation error:", error);

    return res.status(500).json({
      message: "Failed to create reservation.",
    });
  }
});

// ======================================================
// GET MY RESERVATIONS
// GET /api/reservations/my-reservations
// ======================================================

router.get("/my-reservations", requireAuth, async (req, res) => {
  try {
    const reservations = await Reservation.find({
      customer: req.user.id || req.user._id,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      reservations,
    });
  } catch (error) {
    console.error("My reservations error:", error);

    return res.status(500).json({
      message: "Failed to load reservations.",
    });
  }
});

// ======================================================
// CANCEL MY RESERVATION
// PUT /api/reservations/:id/cancel
// ======================================================

router.put("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid reservation ID.",
      });
    }

    const reservation = await Reservation.findOne({
      _id: id,
      customer: req.user.id || req.user._id,
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found.",
      });
    }

    if (reservation.status === "Cancelled") {
      return res.status(400).json({
        message: "Reservation is already cancelled.",
      });
    }

    if (reservation.status === "Completed") {
      return res.status(400).json({
        message: "Completed reservations cannot be cancelled.",
      });
    }

    reservation.status = "Cancelled";

    reservation.statusHistory.push({
      status: "Cancelled",
      changedAt: new Date(),
    });

    await reservation.save();

    return res.status(200).json({
      message: "Reservation cancelled successfully.",
      reservation,
    });
  } catch (error) {
    console.error("Cancel reservation error:", error);

    return res.status(500).json({
      message: "Failed to cancel reservation.",
    });
  }
});

// ======================================================
// ADMIN - GET ALL RESERVATIONS
// GET /api/reservations/admin/all
// ======================================================

router.get("/admin/all", requireAuth, requireAdmin, async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate("customer", "name email phone")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      reservations,
    });
  } catch (error) {
    console.error("Admin reservations error:", error);

    return res.status(500).json({
      message: "Failed to load reservations.",
    });
  }
});

// ======================================================
// ADMIN - UPDATE RESERVATION STATUS
// PUT /api/reservations/admin/:id/status
// ======================================================

router.put("/admin/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid reservation ID.",
      });
    }

    const allowedStatuses = ["Pending", "Confirmed", "Completed", "Cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid reservation status.",
      });
    }

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found.",
      });
    }

    // Cancelled reservations are locked
    if (reservation.status === "Cancelled") {
      return res.status(400).json({
        message: "Cancelled reservations cannot be changed.",
      });
    }

    // Completed reservations are locked
    if (reservation.status === "Completed") {
      return res.status(400).json({
        message: "Completed reservations cannot be changed.",
      });
    }

    // ------------------------------------------------
    // If changing to Confirmed, make sure table is
    // not already occupied by another reservation.
    // ------------------------------------------------

    if (status === "Confirmed") {
      const conflictingReservation = await Reservation.findOne({
        _id: {
          $ne: reservation._id,
        },
        date: reservation.date,
        time: reservation.time,
        tableNumber: reservation.tableNumber,
        status: {
          $in: ["Pending", "Confirmed"],
        },
      });

      if (conflictingReservation) {
        return res.status(409).json({
          message: "This table is already reserved for the same date and time.",
        });
      }
    }

    reservation.status = status;

    reservation.statusHistory.push({
      status,
      changedAt: new Date(),
    });

    await reservation.save();

    return res.status(200).json({
      message: "Reservation status updated successfully.",
      reservation,
    });
  } catch (error) {
    console.error("Admin status update error:", error);

    return res.status(500).json({
      message: "Failed to update reservation status.",
    });
  }
});

// ======================================================
// ADMIN - GET SINGLE RESERVATION
// GET /api/reservations/admin/:id
// ======================================================

router.get("/admin/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid reservation ID.",
      });
    }

    const reservation = await Reservation.findById(id).populate(
      "customer",
      "name email phone",
    );

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found.",
      });
    }

    return res.status(200).json({
      reservation,
    });
  } catch (error) {
    console.error("Admin reservation details error:", error);

    return res.status(500).json({
      message: "Failed to load reservation details.",
    });
  }
});

// ======================================================
// CUSTOMER - GET SINGLE RESERVATION
// GET /api/reservations/:id
// ======================================================

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid reservation ID.",
      });
    }

    const reservation = await Reservation.findOne({
      _id: id,
      customer: req.user.id || req.user._id,
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found.",
      });
    }

    return res.status(200).json({
      reservation,
    });
  } catch (error) {
    console.error("Reservation details error:", error);

    return res.status(500).json({
      message: "Failed to load reservation details.",
    });
  }
});

module.exports = router;
