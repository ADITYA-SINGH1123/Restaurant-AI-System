// ======================================================
// PAYMENT MODEL
// ======================================================
// Ye model Razorpay payment ko logged-in user aur
// exact purchase intent ke saath securely link karega.
//
// IMPORTANT:
// Payment record mein purchase details store karne ka
// purpose ye hai ki baad mein Order create karte waqt
// client kisi doosre cart ko same payment ke saath
// use na kar sake.
//
// Existing features preserved:
// - Razorpay order/payment
// - Food + Combo purchase items
// - Loyalty points
// - Loyalty discount
// - Original/final amount
// ======================================================

const mongoose = require("mongoose");

// ======================================================
// PAYMENT SCHEMA
// ======================================================

const paymentSchema = new mongoose.Schema(
  {
    // ==================================================
    // RAZORPAY ORDER ID
    // ==================================================

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // ==================================================
    // USER WHO MADE THE PAYMENT
    // ==================================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==================================================
    // CHECKOUT IDEMPOTENCY KEY
    // ==================================================
    // Same checkout retry hone par duplicate payment
    // record banne se bachane ke liye.

    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      minlength: 16,
      maxlength: 100,
    },

    // ==================================================
    // VERIFIED RAZORPAY AMOUNT
    // ==================================================
    // Amount paise mein store hoga.

    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Payment amount must be an integer in paise.",
      },
    },

    // ==================================================
    // CURRENCY
    // ==================================================

    currency: {
      type: String,
      default: "INR",
      enum: ["INR"],
    },

    // ==================================================
    // PAYMENT STATUS
    // ==================================================

    status: {
      type: String,
      enum: ["Created", "Paid", "Failed"],
      default: "Created",
    },

    // ==================================================
    // RAZORPAY PAYMENT ID
    // ==================================================

    paymentId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // ==================================================
    // FINAL ORDER LINK
    // ==================================================
    // Successful order create hone ke baad Payment ko
    // exact Order ke saath link kiya jayega.

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    // ==================================================
    // CHECKOUT SNAPSHOT
    // ==================================================
    // Payment create karte waqt checkout information ka
    // trusted snapshot.
    //
    // Order create karte waqt backend is information ko
    // compare kar sakta hai.

    checkout: {
      name: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      phone: {
        type: String,
        trim: true,
        maxlength: 20,
      },

      address: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      orderType: {
        type: String,
        trim: true,
        enum: ["Delivery", "Pickup"],
      },

      scheduledFor: {
        type: Date,
        default: null,
      },
    },

    // ==================================================
    // PURCHASE INTENT
    // ==================================================
    // Payment create karte waqt backend jo exact cart
    // verify karta hai, uski normalized information yahan
    // save hogi.
    //
    // Order create karte waqt isi information ko compare
    // karke ensure kiya jayega ki payment kisi doosre
    // cart/order ke liye reuse na ho.

    purchaseItems: [
      {
        itemType: {
          type: String,
          enum: ["food", "combo"],
          required: true,
        },

        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
          validate: {
            validator: Number.isInteger,
            message: "Quantity must be an integer.",
          },
        },

        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },

        subtotal: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    // ==================================================
    // ORIGINAL CART TOTAL
    // ==================================================

    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==================================================
    // LOYALTY POINTS USED
    // ==================================================

    loyaltyPointsUsed: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Loyalty points must be an integer.",
      },
    },

    // ==================================================
    // LOYALTY DISCOUNT
    // ==================================================

    loyaltyDiscount: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==================================================
    // FINAL ORDER AMOUNT
    // ==================================================
    // Rupees mein final amount after loyalty discount.

    finalOrderAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },

  // ====================================================
  // AUTOMATIC CREATED / UPDATED TIMESTAMPS
  // ====================================================

  {
    timestamps: true,
  },
);

// ======================================================
// INDEXES
// ======================================================

// Ek user ke same checkout attempt ka duplicate
// Payment record prevent karega.
paymentSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

// Order/payment reconciliation ke liye useful.
paymentSchema.index({ orderId: 1 });

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = mongoose.model("Payment", paymentSchema);
