// ======================================================
// PAYMENT ROUTES
// ======================================================
// Ye file Razorpay payment related APIs handle karti hai.
//
// Features:
// 1. Razorpay order create
// 2. MongoDB se trusted food/combo prices calculate
// 3. Loyalty points discount calculate
// 4. Exact purchase intent Payment record mein save
// 5. Payment idempotency protection
// 6. Payment signature verify
// 7. Payment amount verify
// 8. Payment record ko Paid mark karna
//
// IMPORTANT:
// Razorpay secret key sirf backend .env mein rahegi.
// Frontend mein secret key kabhi expose nahi karni.
// ======================================================

const express = require('express')
const Razorpay = require('razorpay')
const crypto = require('crypto')
const mongoose = require('mongoose')

const Food = require('../models/Food')
const ComboOffer = require('../models/ComboOffer')
const Payment = require('../models/Payment')
const User = require('../models/User')

const { protect } = require('../middleware/authMiddleware')

const router = express.Router()

// ======================================================
// RAZORPAY INSTANCE
// ======================================================

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})

// ======================================================
// PAYMENT CREATION LOCK
// ======================================================
// Same Node.js server par same user + same idempotency
// key ke concurrent requests ko ek saath Razorpay order
// create karne se prevent karta hai.
//
// NOTE:
// Ye in-process protection hai. Multiple backend instances
// ke case mein database/distributed locking ki zarurat hogi.
// ======================================================

const paymentCreationLocks = new Map()

// ======================================================
// CREATE RAZORPAY ORDER
// CUSTOMER MUST BE LOGGED IN
// ======================================================

router.post('/create-order', protect, async (req, res) => {
  const userId = req.user.id

  try {
    const { items, loyaltyPointsUsed = 0, idempotencyKey } = req.body
    // ==================================================
    // PAYMENT IDEMPOTENCY KEY VALIDATION
    // ==================================================
    // Same checkout attempt ko identify karne ke liye
    // frontend ek unique idempotency key bhejta hai.
    //
    // Backend is key ko user ke saath combine karke
    // duplicate Razorpay order creation prevent karega.

    if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
      return res.status(400).json({
        message: 'Payment idempotency key is required.'
      })
    }

    const normalizedIdempotencyKey = idempotencyKey.trim()

    if (
      normalizedIdempotencyKey.length < 16 ||
      normalizedIdempotencyKey.length > 100
    ) {
      return res.status(400).json({
        message: 'Invalid payment idempotency key.'
      })
    }

    // ==================================================
    // CHECK CART ITEMS
    // ==================================================

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Your cart is empty.'
      })
    }

    // ==================================================
    // CREATE LOCK KEY
    // ==================================================

    const lockKey = `${userId.toString()}:${normalizedIdempotencyKey}`

    // ==================================================
    // PREVENT SAME REQUEST FROM RUNNING CONCURRENTLY
    // ==================================================

    if (paymentCreationLocks.has(lockKey)) {
      try {
        await paymentCreationLocks.get(lockKey)
      } catch (lockError) {
        console.error('Payment creation lock request failed:', lockError)
      }

      // Another request has already completed the creation
      // attempt. Fetch the resulting Payment record.
      const existingPaymentAfterLock = await Payment.findOne({
        userId,
        idempotencyKey: normalizedIdempotencyKey
      })

      if (existingPaymentAfterLock) {
        if (existingPaymentAfterLock.status === 'Created') {
          return res.status(200).json({
            success: true,
            message: 'Existing Razorpay order reused.',
            order: {
              id: existingPaymentAfterLock.razorpayOrderId,
              amount: existingPaymentAfterLock.amount,
              currency: existingPaymentAfterLock.currency
            },
            originalAmount: existingPaymentAfterLock.originalAmount,
            loyaltyPointsUsed: existingPaymentAfterLock.loyaltyPointsUsed,
            loyaltyDiscount: existingPaymentAfterLock.loyaltyDiscount,
            finalOrderAmount: existingPaymentAfterLock.finalOrderAmount,
            availableLoyaltyPoints: Number(
              (await User.findById(userId))?.loyaltyPoints || 0
            )
          })
        }

        if (existingPaymentAfterLock.status === 'Paid') {
          return res.status(409).json({
            message:
              'This payment has already been completed. Please start a new checkout.'
          })
        }
      }
    }

    // ==================================================
    // PAYMENT CREATION LOCK PROMISE
    // ==================================================

    let releasePaymentLock

    const paymentLockPromise = new Promise(resolve => {
      releasePaymentLock = resolve
    })

    paymentCreationLocks.set(lockKey, paymentLockPromise)

    try {
      // ==================================================
      // CHECK EXISTING IDEMPOTENT PAYMENT
      // ==================================================

      const existingPayment = await Payment.findOne({
        userId,
        idempotencyKey: normalizedIdempotencyKey
      })

      if (existingPayment) {
        // ----------------------------------------------
        // SAME KEY + PAID
        // ----------------------------------------------

        if (existingPayment.status === 'Paid') {
          return res.status(409).json({
            message:
              'This payment has already been completed. Please start a new checkout.'
          })
        }

        // ----------------------------------------------
        // SAME KEY + CREATED
        // ----------------------------------------------
        // Existing Razorpay order reuse hoga.
        //
        // IMPORTANT:
        // Blind reuse nahi karenge.
        // Neeche verified purchase intent calculate hone
        // ke baad exact request match check ki jayegi.
        // ----------------------------------------------
      }

      // ==================================================
      // CALCULATED TRUSTED TOTAL
      // ==================================================

      let calculatedTotal = 0

      // ==================================================
      // VERIFIED PURCHASE ITEMS
      // ==================================================
      // Sirf backend/database se verified information
      // Payment record mein save hogi.

      const purchaseItems = []

      // ==================================================
      // PREVENT DUPLICATE CART ITEMS
      // ==================================================

      const processedFoodIds = new Set()
      const processedComboIds = new Set()

      // ==================================================
      // VALIDATE EACH CART ITEM
      // ==================================================

      for (const item of items) {
        // ----------------------------------------------
        // CHECK ITEM OBJECT
        // ----------------------------------------------

        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return res.status(400).json({
            message: 'Invalid cart item.'
          })
        }

        // ==================================================
        // ITEM TYPE DETECTION
        // ==================================================
        // Normal food cart items mein itemType field
        // missing ho sakti hai.
        //
        // Isliye:
        // - itemType = "food"  -> food
        // - itemType = "combo" -> combo
        // - itemType missing + comboId present -> combo
        // - itemType missing + comboId absent -> food
        //
        // Lekin koi unknown explicit itemType diya gaya
        // to request reject hogi.

        let itemType = ''

        if (
          item.itemType !== undefined &&
          item.itemType !== null &&
          item.itemType !== ''
        ) {
          itemType = String(item.itemType).trim().toLowerCase()

          // Explicit itemType sirf food/combo ho sakta hai.
          if (!['food', 'combo'].includes(itemType)) {
            return res.status(400).json({
              message: 'Invalid cart item type.'
            })
          }
        } else {
          // itemType missing hai.

          // comboId present hai to combo identify karo.
          if (item.comboId) {
            itemType = 'combo'
          } else {
            // Otherwise normal food item.
            itemType = 'food'
          }
        }

        // ==================================================
        // COMBO ITEM
        // ==================================================

        if (itemType === 'combo') {
          const comboId = item.comboId

          if (!comboId) {
            return res.status(400).json({
              message: 'Combo offer ID is missing.'
            })
          }

          // ----------------------------------------------
          // MongoDB ObjectId validation
          // ----------------------------------------------

          if (!mongoose.Types.ObjectId.isValid(comboId)) {
            return res.status(400).json({
              message: 'Invalid combo offer ID.'
            })
          }

          const comboIdString = comboId.toString()

          // ----------------------------------------------
          // PREVENT DUPLICATE COMBO ENTRIES
          // ----------------------------------------------

          if (processedComboIds.has(comboIdString)) {
            return res.status(400).json({
              message: 'Duplicate combo offer detected in cart.'
            })
          }

          processedComboIds.add(comboIdString)

          // ----------------------------------------------
          // STRICT QUANTITY VALIDATION
          // ----------------------------------------------

          if (
            item.quantity === undefined ||
            item.quantity === null ||
            item.quantity === ''
          ) {
            return res.status(400).json({
              message: `Quantity is required for ${item.name || 'combo offer'}.`
            })
          }

          const quantity = Number(item.quantity)

          if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
            return res.status(400).json({
              message: `Invalid quantity for ${item.name || 'combo offer'}.`
            })
          }

          // ----------------------------------------------
          // FIND COMBO IN MONGODB
          // ----------------------------------------------

          const combo = await ComboOffer.findById(comboId)

          if (!combo) {
            return res.status(400).json({
              message: `Combo offer not found: ${item.name || 'Unknown combo'}`
            })
          }

          // ----------------------------------------------
          // CHECK COMBO AVAILABILITY
          // ----------------------------------------------

          if (!combo.available) {
            return res.status(400).json({
              message: `${combo.name} is currently unavailable.`
            })
          }

          // ----------------------------------------------
          // CHECK COMBO VALIDITY
          // ----------------------------------------------

          const now = new Date()

          if (combo.validFrom && now < new Date(combo.validFrom)) {
            return res.status(400).json({
              message: `${combo.name} is not active yet.`
            })
          }

          if (combo.validUntil && now > new Date(combo.validUntil)) {
            return res.status(400).json({
              message: `${combo.name} offer has expired.`
            })
          }

          // ----------------------------------------------
          // TRUSTED COMBO PRICE
          // ----------------------------------------------

          const comboPrice = Number(combo.comboPrice)

          if (!Number.isFinite(comboPrice) || comboPrice < 0) {
            return res.status(400).json({
              message: `Invalid price for combo: ${combo.name}`
            })
          }

          // ----------------------------------------------
          // COMBO SUBTOTAL
          // ----------------------------------------------

          const comboSubtotal = Number((comboPrice * quantity).toFixed(2))

          if (!Number.isFinite(comboSubtotal)) {
            return res.status(400).json({
              message: `Invalid subtotal for combo: ${combo.name}`
            })
          }

          calculatedTotal += comboSubtotal

          // ----------------------------------------------
          // SAVE VERIFIED COMBO PURCHASE INTENT
          // ----------------------------------------------

          purchaseItems.push({
            itemType: 'combo',
            itemId: combo._id,
            quantity,
            unitPrice: Number(comboPrice.toFixed(2)),
            subtotal: comboSubtotal
          })

          continue
        }

        // ==================================================
        // NORMAL FOOD ITEM
        // ==================================================

        if (!item._id) {
          return res.status(400).json({
            message: 'Food item ID is missing.'
          })
        }

        // ----------------------------------------------
        // NORMAL FOOD KE LIYE VALID OBJECTID REQUIRED
        // ----------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(item._id)) {
          return res.status(400).json({
            message: `Invalid food item ID: ${item.name || 'Unknown item'}`
          })
        }

        // ----------------------------------------------
        // PREVENT DUPLICATE FOOD ITEMS
        // ----------------------------------------------

        const foodId = item._id.toString()

        if (processedFoodIds.has(foodId)) {
          return res.status(400).json({
            message: 'Duplicate food item detected in cart.'
          })
        }

        processedFoodIds.add(foodId)

        // ----------------------------------------------
        // STRICT QUANTITY VALIDATION
        // ----------------------------------------------

        if (
          item.quantity === undefined ||
          item.quantity === null ||
          item.quantity === ''
        ) {
          return res.status(400).json({
            message: `Quantity is required for ${item.name || 'food item'}.`
          })
        }

        const quantity = Number(item.quantity)

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
          return res.status(400).json({
            message: `Invalid quantity for ${item.name || 'food item'}.`
          })
        }

        // ----------------------------------------------
        // FIND FOOD IN MONGODB
        // ----------------------------------------------

        const food = await Food.findById(item._id)

        if (!food) {
          return res.status(400).json({
            message: `Food item not found: ${item.name || 'Unknown item'}`
          })
        }

        // ----------------------------------------------
        // CHECK FOOD AVAILABILITY
        // ----------------------------------------------

        if (!food.available) {
          return res.status(400).json({
            message: `${food.name} is currently unavailable.`
          })
        }

        // ----------------------------------------------
        // TRUSTED FOOD PRICE
        // ----------------------------------------------

        const foodPrice = Number(food.price)

        if (!Number.isFinite(foodPrice) || foodPrice < 0) {
          return res.status(400).json({
            message: `Invalid price for food: ${food.name}`
          })
        }

        // ----------------------------------------------
        // FOOD SUBTOTAL
        // ----------------------------------------------

        const itemSubtotal = Number((foodPrice * quantity).toFixed(2))

        if (!Number.isFinite(itemSubtotal)) {
          return res.status(400).json({
            message: `Invalid subtotal for food: ${food.name}`
          })
        }

        calculatedTotal += itemSubtotal

        // ----------------------------------------------
        // SAVE VERIFIED FOOD PURCHASE INTENT
        // ----------------------------------------------

        purchaseItems.push({
          itemType: 'food',
          itemId: food._id,
          quantity,
          unitPrice: Number(foodPrice.toFixed(2)),
          subtotal: itemSubtotal
        })
      }

      // ==================================================
      // CHECK TOTAL
      // ==================================================

      if (!Number.isFinite(calculatedTotal) || calculatedTotal <= 0) {
        return res.status(400).json({
          message: 'Invalid payment amount.'
        })
      }

      // ==================================================
      // ROUND TOTAL
      // ==================================================

      calculatedTotal = Number(calculatedTotal.toFixed(2))

      // ==================================================
      // GET USER
      // ==================================================

      const user = await User.findById(userId)

      if (!user) {
        return res.status(404).json({
          message: 'User account not found.'
        })
      }

      // ==================================================
      // VALIDATE LOYALTY POINTS
      // ==================================================
      // 1 loyalty point = ₹1 discount.

      if (
        loyaltyPointsUsed === undefined ||
        loyaltyPointsUsed === null ||
        loyaltyPointsUsed === ''
      ) {
        return res.status(400).json({
          message: 'Invalid loyalty points.'
        })
      }

      const requestedLoyaltyPoints = Number(loyaltyPointsUsed)

      if (
        !Number.isInteger(requestedLoyaltyPoints) ||
        requestedLoyaltyPoints < 0
      ) {
        return res.status(400).json({
          message: 'Invalid loyalty points.'
        })
      }

      // ==================================================
      // AVAILABLE POINTS CHECK
      // ==================================================

      const availableLoyaltyPoints = Number(user.loyaltyPoints || 0)

      if (requestedLoyaltyPoints > availableLoyaltyPoints) {
        return res.status(400).json({
          message: 'You do not have enough loyalty points.',
          availableLoyaltyPoints
        })
      }

      // ==================================================
      // ORDER AMOUNT CHECK
      // ==================================================

      if (requestedLoyaltyPoints > calculatedTotal) {
        return res.status(400).json({
          message: 'Loyalty points cannot exceed the order amount.'
        })
      }

      // ==================================================
      // LOYALTY DISCOUNT
      // ==================================================

      const loyaltyDiscount = Number(requestedLoyaltyPoints.toFixed(2))

      // ==================================================
      // FINAL PAYMENT AMOUNT
      // ==================================================

      const finalOrderAmount = Number(
        (calculatedTotal - loyaltyDiscount).toFixed(2)
      )

      if (finalOrderAmount < 0) {
        return res.status(400).json({
          message: 'Invalid final payment amount.'
        })
      }

      // ==================================================
      // CONVERT TO PAISE
      // ==================================================

      const amountInPaise = Math.round(finalOrderAmount * 100)

      // ==================================================
      // ZERO PAYMENT CHECK
      // ==================================================

      if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
        return res.status(400).json({
          message:
            'Final amount is ₹0. Please use a zero-payment checkout flow.',
          finalOrderAmount,
          loyaltyPointsUsed: requestedLoyaltyPoints,
          loyaltyDiscount
        })
      }

      // ==================================================
      // CHECK EXISTING PAYMENT INTENT
      // ==================================================
      // Same idempotency key ko different cart/amount ke
      // saath reuse karne ki permission nahi hai.
      //
      // Isse accidentally purana Razorpay order naye cart
      // ke saath attach nahi hoga.

      const existingPaymentForIntent = await Payment.findOne({
        userId,
        idempotencyKey: normalizedIdempotencyKey
      })

      if (existingPaymentForIntent) {
        // ----------------------------------------------
        // COMPARE PURCHASE ITEMS
        // ----------------------------------------------

        const existingItems = existingPaymentForIntent.purchaseItems
          .map(item => ({
            itemType: item.itemType,
            itemId: item.itemId.toString(),
            quantity: Number(item.quantity),
            unitPrice: Number(Number(item.unitPrice).toFixed(2)),
            subtotal: Number(Number(item.subtotal).toFixed(2))
          }))
          .sort((a, b) => {
            if (a.itemType !== b.itemType) {
              return a.itemType.localeCompare(b.itemType)
            }

            return a.itemId.localeCompare(b.itemId)
          })

        const requestedItems = purchaseItems
          .map(item => ({
            itemType: item.itemType,
            itemId: item.itemId.toString(),
            quantity: Number(item.quantity),
            unitPrice: Number(Number(item.unitPrice).toFixed(2)),
            subtotal: Number(Number(item.subtotal).toFixed(2))
          }))
          .sort((a, b) => {
            if (a.itemType !== b.itemType) {
              return a.itemType.localeCompare(b.itemType)
            }

            return a.itemId.localeCompare(b.itemId)
          })

        const samePurchaseIntent =
          JSON.stringify(existingItems) === JSON.stringify(requestedItems) &&
          Number(existingPaymentForIntent.originalAmount) ===
            Number(calculatedTotal) &&
          Number(existingPaymentForIntent.loyaltyPointsUsed) ===
            Number(requestedLoyaltyPoints) &&
          Number(existingPaymentForIntent.loyaltyDiscount) ===
            Number(loyaltyDiscount) &&
          Number(existingPaymentForIntent.finalOrderAmount) ===
            Number(finalOrderAmount) &&
          Number(existingPaymentForIntent.amount) === Number(amountInPaise)

        if (!samePurchaseIntent) {
          return res.status(409).json({
            message:
              'This payment idempotency key is already associated with a different checkout.'
          })
        }

        // ----------------------------------------------
        // EXISTING CREATED PAYMENT
        // ----------------------------------------------

        if (existingPaymentForIntent.status === 'Created') {
          return res.status(200).json({
            success: true,
            message: 'Existing Razorpay order reused.',
            order: {
              id: existingPaymentForIntent.razorpayOrderId,
              amount: existingPaymentForIntent.amount,
              currency: existingPaymentForIntent.currency
            },
            originalAmount: existingPaymentForIntent.originalAmount,
            loyaltyPointsUsed: existingPaymentForIntent.loyaltyPointsUsed,
            loyaltyDiscount: existingPaymentForIntent.loyaltyDiscount,
            finalOrderAmount: existingPaymentForIntent.finalOrderAmount,
            availableLoyaltyPoints
          })
        }

        // ----------------------------------------------
        // EXISTING PAID PAYMENT
        // ----------------------------------------------

        if (existingPaymentForIntent.status === 'Paid') {
          return res.status(409).json({
            message:
              'This payment has already been completed. Please start a new checkout.'
          })
        }

        // ----------------------------------------------
        // EXISTING FAILED PAYMENT
        // ----------------------------------------------
        // Failed record ko same idempotency key se reuse
        // nahi karenge.
        // Is case mein frontend ko new checkout key generate
        // karni chahiye.
        //
        // Lekin agar failed record mila to duplicate unique
        // key ke kaaran naya Payment record create nahi ho
        // sakta. Isliye clear response return kar rahe hain.

        if (existingPaymentForIntent.status === 'Failed') {
          return res.status(409).json({
            message:
              'This payment attempt has failed. Please start a new checkout.'
          })
        }
      }

      // ==================================================
      // CREATE RAZORPAY ORDER
      // ==================================================

      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${Date.now()}_${Math.floor(
          1000 + Math.random() * 9000
        )}`
      }

      const razorpayOrder = await razorpay.orders.create(options)

      // ==================================================
      // CHECK RAZORPAY RESPONSE
      // ==================================================

      if (!razorpayOrder || !razorpayOrder.id) {
        return res.status(500).json({
          message: 'Invalid Razorpay order response.'
        })
      }

      // ==================================================
      // SAVE PAYMENT RECORD
      // ==================================================
      // IMPORTANT:
      // Yahan sirf frontend cart save nahi ho raha.
      // purchaseItems mein database se verified IDs,
      // prices, quantities aur subtotals save ho rahe hain.
      //
      // Idempotency key bhi same payment attempt ke saath
      // permanently save hogi.

      const paymentRecord = new Payment({
        razorpayOrderId: razorpayOrder.id,
        userId,
        idempotencyKey: normalizedIdempotencyKey,
        amount: amountInPaise,
        currency: 'INR',
        status: 'Created',

        // Exact verified purchase intent.
        purchaseItems,

        // Original amount before loyalty discount.
        originalAmount: calculatedTotal,

        // Exact loyalty points used for this payment.
        loyaltyPointsUsed: requestedLoyaltyPoints,

        // Loyalty discount in rupees.
        loyaltyDiscount,

        // Final amount paid through Razorpay.
        finalOrderAmount
      })

      await paymentRecord.save()

      // ==================================================
      // SUCCESS RESPONSE
      // ==================================================

      return res.status(200).json({
        success: true,
        message: 'Razorpay order created successfully.',
        order: razorpayOrder,
        originalAmount: calculatedTotal,
        loyaltyPointsUsed: requestedLoyaltyPoints,
        loyaltyDiscount,
        finalOrderAmount,

        // Ye actual remaining points nahi hain.
        // Loyalty deduction order creation ke time hogi.
        availableLoyaltyPoints
      })
    } finally {
      // ==================================================
      // RELEASE PAYMENT CREATION LOCK
      // ==================================================

      if (paymentCreationLocks.get(lockKey) === paymentLockPromise) {
        paymentCreationLocks.delete(lockKey)
      }

      releasePaymentLock()
    }
  } catch (error) {
    // ==================================================
    // DUPLICATE KEY
    // ==================================================

    if (error.code === 11000) {
      // ----------------------------------------------
      // Agar same idempotency key ke liye kisi request
      // ne Payment successfully create kar diya hai,
      // to existing record return karo.
      // ----------------------------------------------

      const existingPayment = await Payment.findOne({
        userId,
        idempotencyKey:
          typeof req.body?.idempotencyKey === 'string'
            ? req.body.idempotencyKey.trim()
            : ''
      })

      if (existingPayment) {
        if (existingPayment.status === 'Created') {
          return res.status(200).json({
            success: true,
            message: 'Existing Razorpay order reused.',
            order: {
              id: existingPayment.razorpayOrderId,
              amount: existingPayment.amount,
              currency: existingPayment.currency
            },
            originalAmount: existingPayment.originalAmount,
            loyaltyPointsUsed: existingPayment.loyaltyPointsUsed,
            loyaltyDiscount: existingPayment.loyaltyDiscount,
            finalOrderAmount: existingPayment.finalOrderAmount
          })
        }

        if (existingPayment.status === 'Paid') {
          return res.status(409).json({
            message:
              'This payment has already been completed. Please start a new checkout.'
          })
        }
      }

      return res.status(409).json({
        message: 'Payment order already exists.'
      })
    }

    // ==================================================
    // RAZORPAY / SERVER ERROR
    // ==================================================

    console.error('Razorpay create order error:', error)

    return res.status(500).json({
      message: 'Failed to create Razorpay order.'
    })
  }
})

// ======================================================
// VERIFY RAZORPAY PAYMENT
// CUSTOMER MUST BE LOGGED IN
// ======================================================

router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body

    // ==================================================
    // CHECK REQUIRED DETAILS
    // ==================================================

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        message: 'Payment verification details are missing.'
      })
    }

    // ==================================================
    // GET LOGGED-IN USER
    // ==================================================

    const userId = req.user.id

    // ==================================================
    // FIND PAYMENT RECORD
    // ==================================================

    const paymentRecord = await Payment.findOne({
      razorpayOrderId: razorpay_order_id
    })

    if (!paymentRecord) {
      return res.status(404).json({
        message: 'Payment record not found.'
      })
    }

    // ==================================================
    // CHECK PAYMENT OWNERSHIP
    // ==================================================

    if (paymentRecord.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'This payment does not belong to you.'
      })
    }

    // ==================================================
    // PREVENT REUSING PAID PAYMENT
    // ==================================================

    if (paymentRecord.status === 'Paid') {
      return res.status(409).json({
        message: 'This payment has already been verified.'
      })
    }

    // ==================================================
    // VERIFY RAZORPAY SIGNATURE
    // ==================================================

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (generatedSignature !== razorpay_signature) {
      paymentRecord.status = 'Failed'
      await paymentRecord.save()

      return res.status(400).json({
        message: 'Payment verification failed.'
      })
    }

    // ==================================================
    // FETCH RAZORPAY ORDER
    // ==================================================

    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id)

    if (!razorpayOrder) {
      return res.status(400).json({
        message: 'Razorpay order not found.'
      })
    }

    // ==================================================
    // CHECK ORDER CURRENCY
    // ==================================================

    if (razorpayOrder.currency !== 'INR') {
      return res.status(400).json({
        message: 'Invalid payment currency.'
      })
    }

    // ==================================================
    // CHECK ORDER AMOUNT
    // ==================================================

    if (Number(razorpayOrder.amount) !== Number(paymentRecord.amount)) {
      return res.status(400).json({
        message: 'Payment amount does not match the payment order.'
      })
    }

    // ==================================================
    // FETCH RAZORPAY PAYMENT
    // ==================================================

    const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id)

    if (!razorpayPayment) {
      return res.status(400).json({
        message: 'Razorpay payment not found.'
      })
    }

    // ==================================================
    // CHECK PAYMENT BELONGS TO ORDER
    // ==================================================

    if (razorpayPayment.order_id !== razorpay_order_id) {
      return res.status(400).json({
        message: 'Payment does not belong to this Razorpay order.'
      })
    }

    // ==================================================
    // CHECK PAYMENT CURRENCY
    // ==================================================

    if (razorpayPayment.currency !== 'INR') {
      return res.status(400).json({
        message: 'Invalid payment currency.'
      })
    }

    // ==================================================
    // CHECK PAYMENT AMOUNT
    // ==================================================

    if (Number(razorpayPayment.amount) !== Number(paymentRecord.amount)) {
      return res.status(400).json({
        message: 'Payment amount does not match.'
      })
    }

    // ==================================================
    // CHECK PAYMENT STATUS
    // ==================================================

    if (razorpayPayment.status !== 'captured') {
      return res.status(400).json({
        message: 'Payment has not been captured.'
      })
    }

    // ==================================================
    // SAVE VERIFIED PAYMENT
    // ==================================================

    paymentRecord.paymentId = razorpay_payment_id
    paymentRecord.status = 'Paid'

    await paymentRecord.save()

    // ==================================================
    // SUCCESS RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.'
    })
  } catch (error) {
    // ==================================================
    // DUPLICATE KEY
    // ==================================================

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'This payment ID has already been used.'
      })
    }

    // ==================================================
    // SERVER ERROR
    // ==================================================

    console.error('Payment verification error:', error)

    return res.status(500).json({
      message: 'Server error during payment verification.'
    })
  }
})

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router
