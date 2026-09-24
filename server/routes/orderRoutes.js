// ======================================================
// ORDER ROUTES
// ======================================================
// Ye file customer aur admin ke order related APIs handle karti hai.
// Isme order create, fetch, analytics, status update,
// cancellation, loyalty points aur scheduled orders included hain.
// Inventory stock bhi successful order ke according update hota hai.
// Cancelled order par normal food items ka stock restore hota hai.
// Stock adjustment ki automatic history bhi maintain hoti hai.
// Notifications bhi order events ke according create hoti hain.

const express = require('express')
const Razorpay = require('razorpay')
const crypto = require('crypto')
const mongoose = require('mongoose')

const Order = require('../models/Order')
const Food = require('../models/Food')
const Payment = require('../models/Payment')
const User = require('../models/User')

// Combo offer ke trusted database data ke liye.
const ComboOffer = require('../models/ComboOffer')

// Stock adjustment history model.
const StockHistory = require('../models/StockHistory')

// Notification model.
const Notification = require('../models/Notification')

const { protect, adminOnly } = require('../middleware/authMiddleware')

const router = express.Router()

// ======================================================
// RAZORPAY INSTANCE
// ======================================================

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})

// ======================================================
// NOTIFICATION HELPER
// ======================================================

// Notification create karne ke liye common helper.
// Notification fail hone par main order operation fail
// nahi hoga.

const createNotification = async ({
  userId,
  type = 'system',
  title,
  message,
  orderId = null,
  actionUrl = '',
  io = null
}) => {
  try {
    if (!userId || !title || !message) {
      console.error('Notification skipped: required data missing.')
      return null
    }

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      orderId,
      isRead: false,
      actionUrl
    })

    // ==================================================
    // REAL-TIME NOTIFICATION
    // ==================================================

    // Sirf jis customer ka notification hai,
    // usi user ke personal Socket.io room me event jayega.

    if (io && userId) {
      io.to(`user-${userId}`).emit('new-notification', {
        notification: notification.toObject()
      })
    }

    return notification
  } catch (error) {
    // Notification failure se main order operation fail nahi hoga.
    console.error('Create notification error:', error.message)
    return null
  }
}

// ======================================================
// CREATE NEW ORDER
// CUSTOMER MUST BE LOGGED IN
// ======================================================

router.post('/create', protect, async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      items,
      paymentId,
      razorpayOrderId,
      razorpaySignature,
      loyaltyPointsUsed = 0,

      // Scheduled order fields.
      orderType = 'Immediate',
      scheduledFor = null
    } = req.body

    // ==================================================
    // BASIC ORDER VALIDATION
    // ==================================================

    if (
      !name ||
      !phone ||
      !address ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: 'Please provide all order details.'
      })
    }

    // ==================================================
    // ORDER TYPE VALIDATION
    // ==================================================

    const cleanOrderType = String(orderType || 'Immediate').trim()

    if (!['Immediate', 'Scheduled'].includes(cleanOrderType)) {
      return res.status(400).json({
        message: 'Invalid order type.'
      })
    }

    // ==================================================
    // SCHEDULED DATE/TIME VALIDATION
    // ==================================================

    let cleanScheduledFor = null

    if (cleanOrderType === 'Scheduled') {
      if (!scheduledFor) {
        return res.status(400).json({
          message: 'Please select a valid scheduled date and time.'
        })
      }

      const parsedScheduledDate = new Date(scheduledFor)

      if (Number.isNaN(parsedScheduledDate.getTime())) {
        return res.status(400).json({
          message: 'Invalid scheduled date and time.'
        })
      }

      if (parsedScheduledDate.getTime() <= Date.now()) {
        return res.status(400).json({
          message: 'Scheduled order time must be in the future.'
        })
      }

      cleanScheduledFor = parsedScheduledDate
    }

    // ==================================================
    // IMMEDIATE ORDER CLEANUP
    // ==================================================

    if (cleanOrderType === 'Immediate') {
      cleanScheduledFor = null
    }

    // ==================================================
    // PAYMENT DETAILS VALIDATION
    // ==================================================

    if (!paymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({
        message: 'Payment details are missing.'
      })
    }

    // ==================================================
    // USER ID FROM SECURE JWT
    // ==================================================

    const userId = req.user.id

    // ==================================================
    // GET CURRENT USER FROM DATABASE
    // ==================================================

    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({
        message: 'User account not found.'
      })
    }

    // ==================================================
    // USE LATEST PROFILE DATA
    // ==================================================

    const cleanName = String(user.name || '').trim()
    const cleanPhone = String(user.phone || '').trim()
    const cleanAddress = String(address || '').trim()

    // ==================================================
    // CUSTOMER DATA VALIDATION
    // ==================================================

    if (cleanName.length < 2) {
      return res.status(400).json({
        message: 'Please update your profile with a valid name.'
      })
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        message:
          'Please update your profile with a valid 10-digit phone number.'
      })
    }

    if (cleanAddress.length < 5) {
      return res.status(400).json({
        message: 'Please enter a valid delivery address.'
      })
    }

    // ==================================================
    // FIND PAYMENT RECORD
    // ==================================================

    const paymentRecord = await Payment.findOne({
      razorpayOrderId
    })

    if (!paymentRecord) {
      return res.status(404).json({
        message: 'Payment record not found.'
      })
    }

    // ==================================================
    // PAYMENT OWNER CHECK
    // ==================================================

    if (paymentRecord.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'This payment does not belong to the logged-in user.'
      })
    }

    // ==================================================
    // PAYMENT STATUS CHECK
    // ==================================================

    if (paymentRecord.status !== 'Paid') {
      return res.status(400).json({
        message: 'Payment has not been verified.'
      })
    }

    // ==================================================
    // PAYMENT ID CHECK
    // ==================================================

    if (paymentRecord.paymentId !== paymentId) {
      return res.status(400).json({
        message: 'Payment ID does not match the verified payment.'
      })
    }

    // ======================================================
    // DUPLICATE PAYMENT CHECK
    // ======================================================

    const existingOrder = await Order.findOne({
      paymentId
    })

    if (existingOrder) {
      return res.status(409).json({
        message: 'This payment has already been used for an order.'
      })
    }

    // ======================================================
    // PAYMENT ↔ ORDER CART BINDING
    // ======================================================

    if (
      !Array.isArray(paymentRecord.purchaseItems) ||
      paymentRecord.purchaseItems.length === 0
    ) {
      return res.status(400).json({
        message: 'Payment purchase information is missing.'
      })
    }

    // ==================================================
    // NORMALIZE INCOMING ORDER ITEMS
    // ==================================================

    const incomingPurchaseItems = []

    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return res.status(400).json({
          message: 'Invalid order item.'
        })
      }

      // --------------------------------------------------
      // STRICT ITEM TYPE
      // --------------------------------------------------

      if (item.itemType !== 'food' && item.itemType !== 'combo') {
        return res.status(400).json({
          message: 'Invalid order item type.'
        })
      }

      // --------------------------------------------------
      // GET CANONICAL ITEM ID
      // --------------------------------------------------

      const rawItemId = item.itemType === 'combo' ? item.comboId : item._id

      if (!rawItemId) {
        return res.status(400).json({
          message:
            item.itemType === 'combo'
              ? 'Combo offer ID is missing.'
              : 'Food item ID is missing.'
        })
      }

      // --------------------------------------------------
      // QUANTITY
      // --------------------------------------------------

      const quantity = Number(item.quantity)

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return res.status(400).json({
          message: 'Invalid item quantity.'
        })
      }

      incomingPurchaseItems.push({
        itemType: item.itemType,
        itemId: String(rawItemId).trim().toLowerCase(),
        quantity
      })
    }

    // ======================================================
    // NORMALIZE STORED PAYMENT PURCHASE ITEMS
    // ======================================================

    const storedPurchaseItems = paymentRecord.purchaseItems.map(item => ({
      itemType: String(item.itemType).trim().toLowerCase(),
      itemId: String(item.itemId).trim().toLowerCase(),
      quantity: Number(item.quantity)
    }))

    // ======================================================
    // SORT BOTH ARRAYS
    // ======================================================

    const sortNormalizedPurchaseItems = (a, b) => {
      const first = `${a.itemType}-${a.itemId}`
      const second = `${b.itemType}-${b.itemId}`

      return first.localeCompare(second)
    }

    incomingPurchaseItems.sort(sortNormalizedPurchaseItems)
    storedPurchaseItems.sort(sortNormalizedPurchaseItems)

    // ======================================================
    // ITEM COUNT CHECK
    // ======================================================

    if (incomingPurchaseItems.length !== storedPurchaseItems.length) {
      return res.status(409).json({
        message:
          'The cart has changed after payment was created. Please create a new payment.'
      })
    }

    // ======================================================
    // EXACT ITEM-BY-ITEM COMPARISON
    // ======================================================

    for (let index = 0; index < incomingPurchaseItems.length; index++) {
      const incomingItem = incomingPurchaseItems[index]
      const storedItem = storedPurchaseItems[index]

      if (
        incomingItem.itemType !== storedItem.itemType ||
        incomingItem.itemId !== storedItem.itemId ||
        incomingItem.quantity !== storedItem.quantity
      ) {
        return res.status(409).json({
          message:
            'The cart does not match the items used to create this payment. Please create a new payment.'
        })
      }
    }

    // ======================================================
    // LOYALTY POINTS BINDING
    // ======================================================

    const paymentLoyaltyPoints = Number(paymentRecord.loyaltyPointsUsed || 0)
    const incomingLoyaltyPoints = Number(loyaltyPointsUsed || 0)

    if (!Number.isInteger(paymentLoyaltyPoints) || paymentLoyaltyPoints < 0) {
      return res.status(400).json({
        message: 'Invalid loyalty information in payment record.'
      })
    }

    if (!Number.isInteger(incomingLoyaltyPoints) || incomingLoyaltyPoints < 0) {
      return res.status(400).json({
        message: 'Invalid loyalty points value.'
      })
    }

    if (paymentLoyaltyPoints !== incomingLoyaltyPoints) {
      return res.status(409).json({
        message:
          'Loyalty points used for this order do not match the payment. Please create a new payment.'
      })
    }

    // ======================================================
    // RAZORPAY SIGNATURE VERIFICATION
    // ======================================================

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${paymentId}`)
      .digest('hex')

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({
        message: 'Payment signature verification failed.'
      })
    }

    // ======================================================
    // FETCH RAZORPAY ORDER
    // ======================================================

    const razorpayOrder = await razorpay.orders.fetch(razorpayOrderId)

    if (!razorpayOrder) {
      return res.status(400).json({
        message: 'Razorpay order not found.'
      })
    }

    // ======================================================
    // CURRENCY CHECK
    // ======================================================

    if (razorpayOrder.currency !== 'INR') {
      return res.status(400).json({
        message: 'Invalid payment currency.'
      })
    }

    // ======================================================
    // FETCH RAZORPAY PAYMENT
    // ======================================================

    const razorpayPayment = await razorpay.payments.fetch(paymentId)

    if (!razorpayPayment) {
      return res.status(400).json({
        message: 'Razorpay payment not found.'
      })
    }

    // ======================================================
    // PAYMENT ORDER MATCH CHECK
    // ======================================================

    if (razorpayPayment.order_id !== razorpayOrderId) {
      return res.status(400).json({
        message: 'Payment does not belong to this Razorpay order.'
      })
    }

    // ======================================================
    // PAYMENT CURRENCY MATCH
    // ======================================================

    if (razorpayPayment.currency !== razorpayOrder.currency) {
      return res.status(400).json({
        message: 'Payment currency does not match.'
      })
    }

    // ======================================================
    // PAYMENT CAPTURE CHECK
    // ======================================================

    if (razorpayPayment.status !== 'captured') {
      return res.status(400).json({
        message: 'Payment has not been captured.'
      })
    }

    // ======================================================
    // CALCULATE REAL TOTAL FROM MONGODB
    // ======================================================

    let calculatedTotal = 0

    const cleanItems = []

    // ======================================================
    // INVENTORY REQUIREMENTS
    // ======================================================

    const stockRequirements = new Map()

    // ======================================================
    // PROCESS ORDER ITEMS
    // ======================================================

    for (const item of items) {
      // ==================================================
      // BASIC ITEM VALIDATION
      // ==================================================

      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          message: 'Invalid order item.'
        })
      }

      const quantity = Number(item.quantity)

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          message: 'Invalid item quantity.'
        })
      }

      // ==================================================
      // COMBO ITEM
      // ==================================================

      const isCombo =
        item.itemType === 'combo' ||
        Boolean(item.comboId) ||
        String(item._id || '').startsWith('combo-')

      if (isCombo) {
        // --------------------------------------------------
        // GET COMBO ID
        // --------------------------------------------------

        let comboId = item.comboId || item._id

        comboId = String(comboId || '').trim()

        // Frontend agar "combo-<ObjectId>" format bhejta hai,
        // to actual MongoDB ObjectId extract karo.

        if (comboId.startsWith('combo-')) {
          comboId = comboId.substring('combo-'.length)
        }

        // --------------------------------------------------
        // VALIDATE COMBO ID
        // --------------------------------------------------

        if (!/^[a-fA-F0-9]{24}$/.test(comboId)) {
          return res.status(400).json({
            message: 'Invalid combo offer ID.'
          })
        }

        // --------------------------------------------------
        // FIND COMBO FROM DATABASE
        // --------------------------------------------------

        const combo = await ComboOffer.findById(comboId)

        if (!combo) {
          return res.status(404).json({
            message: 'Combo offer not found.'
          })
        }

        // --------------------------------------------------
        // CHECK COMBO AVAILABILITY
        // --------------------------------------------------

        if (!combo.available) {
          return res.status(400).json({
            message: `${combo.name} is currently unavailable.`
          })
        }

        // --------------------------------------------------
        // CHECK COMBO VALID FROM
        // --------------------------------------------------

        const now = new Date()

        if (combo.validFrom && now < new Date(combo.validFrom)) {
          return res.status(400).json({
            message: `${combo.name} offer is not active yet.`
          })
        }

        // --------------------------------------------------
        // CHECK COMBO VALID UNTIL
        // --------------------------------------------------

        if (combo.validUntil && now > new Date(combo.validUntil)) {
          return res.status(400).json({
            message: `${combo.name} offer has expired.`
          })
        }

        // --------------------------------------------------
        // TRUSTED COMBO PRICE
        // --------------------------------------------------

        const comboPrice = Number(combo.comboPrice)

        if (!Number.isFinite(comboPrice) || comboPrice < 0) {
          return res.status(400).json({
            message: `Invalid price for combo: ${combo.name}.`
          })
        }

        // --------------------------------------------------
        // CALCULATE COMBO SUBTOTAL
        // --------------------------------------------------

        const comboSubtotal = Number((comboPrice * quantity).toFixed(2))

        if (!Number.isFinite(comboSubtotal)) {
          return res.status(400).json({
            message: `Invalid subtotal for combo: ${combo.name}.`
          })
        }

        // --------------------------------------------------
        // ADD TRUSTED COMBO PRICE
        // --------------------------------------------------

        calculatedTotal += comboSubtotal

        // --------------------------------------------------
        // SAVE CLEAN COMBO ITEM
        // --------------------------------------------------

        cleanItems.push({
          ...item,
          _id: combo._id,
          comboId: combo._id,
          name: combo.name,
          price: Number(comboPrice.toFixed(2)),
          quantity,
          itemType: 'combo',
          image: combo.image || '',
          description: combo.description || ''
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

      const food = await Food.findById(item._id)

      if (!food) {
        return res.status(404).json({
          message: 'Food item not found.'
        })
      }

      // ==================================================
      // FOOD AVAILABILITY CHECK
      // ==================================================

      if (!food.available) {
        return res.status(400).json({
          message: `${food.name} is currently unavailable.`
        })
      }

      // ==================================================
      // FOOD STOCK VALIDATION
      // ==================================================

      const currentStock = Number(food.stock || 0)

      if (!Number.isInteger(currentStock) || currentStock < 0) {
        return res.status(400).json({
          message: `Invalid stock for ${food.name}.`
        })
      }

      if (currentStock < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${food.name}. Only ${currentStock} item(s) available.`
        })
      }

      // ==================================================
      // ADD INVENTORY REQUIREMENT
      // ==================================================

      const existingRequirement = stockRequirements.get(food._id.toString())

      stockRequirements.set(
        food._id.toString(),
        (existingRequirement || 0) + quantity
      )

      // ==================================================
      // CALCULATE REAL PRICE FROM DATABASE
      // ==================================================

      const foodPrice = Number(food.price)

      if (!Number.isFinite(foodPrice) || foodPrice < 0) {
        return res.status(400).json({
          message: `Invalid price for ${food.name}.`
        })
      }

      calculatedTotal += foodPrice * quantity

      // ==================================================
      // SAVE CLEAN FOOD ITEM
      // ==================================================

      cleanItems.push({
        ...item,
        _id: food._id,
        name: food.name,
        price: foodPrice,
        quantity,
        category: food.category,
        image: food.image,
        icon: food.icon,
        itemType: 'food'
      })
    }

    // ======================================================
    // FINAL STOCK REQUIREMENT CHECK
    // ======================================================

    for (const [foodId, requiredQuantity] of stockRequirements.entries()) {
      const food = await Food.findById(foodId)

      if (!food) {
        return res.status(404).json({
          message: 'One of the selected food items no longer exists.'
        })
      }

      const latestStock = Number(food.stock || 0)

      if (latestStock < requiredQuantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${food.name}. Only ${latestStock} item(s) available.`
        })
      }

      if (!food.available) {
        return res.status(400).json({
          message: `${food.name} is currently unavailable.`
        })
      }
    }

    // ======================================================
    // LOYALTY POINTS VALIDATION
    // ======================================================

    const requestedLoyaltyPoints = Number(loyaltyPointsUsed || 0)

    if (
      !Number.isInteger(requestedLoyaltyPoints) ||
      requestedLoyaltyPoints < 0
    ) {
      return res.status(400).json({
        message: 'Invalid loyalty points value.'
      })
    }

    const availableLoyaltyPoints = Number(user.loyaltyPoints || 0)

    if (requestedLoyaltyPoints > availableLoyaltyPoints) {
      return res.status(400).json({
        message: 'Insufficient loyalty points.'
      })
    }

    // ======================================================
    // LOYALTY DISCOUNT
    // ======================================================

    // 1 loyalty point = ₹1 discount.

    const loyaltyDiscount = requestedLoyaltyPoints

    if (loyaltyDiscount > calculatedTotal) {
      return res.status(400).json({
        message: 'Loyalty points cannot exceed the order amount.'
      })
    }

    const finalAmount = Math.max(0, calculatedTotal - loyaltyDiscount)

    // ======================================================
    // RAZORPAY AMOUNT CHECK
    // ======================================================

    const razorpayAmount = Number(razorpayOrder.amount)

    if (!Number.isFinite(razorpayAmount)) {
      return res.status(400).json({
        message: 'Invalid Razorpay order amount.'
      })
    }

    const expectedRazorpayAmount = Math.round(finalAmount * 100)

    if (razorpayAmount !== expectedRazorpayAmount) {
      return res.status(400).json({
        message: 'Payment amount does not match the order amount.'
      })
    }

    // ======================================================
    // RAZORPAY PAYMENT AMOUNT CHECK
    // ======================================================

    const capturedPaymentAmount = Number(razorpayPayment.amount)

    if (capturedPaymentAmount !== expectedRazorpayAmount) {
      return res.status(400).json({
        message: 'Captured payment amount does not match the order amount.'
      })
    }

    // ======================================================
    // INTERNAL ORDER ID
    // ======================================================

    const internalOrderId = `ORD-${Date.now()}-${Math.floor(
      Math.random() * 10000
    )}`

    // ======================================================
    // ATOMIC ORDER TRANSACTION
    // ======================================================
    // Order creation, food stock update, stock history and loyalty points
    // deduction are handled inside one MongoDB transaction.
    // If any operation fails, all transaction changes are rolled back.

    const session = await mongoose.startSession()

    let committedOrder = null

    try {
      await session.withTransaction(async () => {
        // Re-check the user inside the transaction so loyalty points are
        // always read from the latest database state.

        const transactionUser = await User.findById(userId).session(session)

        if (!transactionUser) {
          throw new Error('USER_NOT_FOUND')
        }

        const latestLoyaltyPoints = Number(transactionUser.loyaltyPoints || 0)

        // Final loyalty-point safety check.

        if (requestedLoyaltyPoints > latestLoyaltyPoints) {
          throw new Error('INSUFFICIENT_LOYALTY_POINTS')
        }

        // -------------------- CREATE ORDER --------------------

        const newOrder = new Order({
          orderId: internalOrderId,
          userId,
          name: cleanName,
          phone: cleanPhone,
          address: cleanAddress,
          items: cleanItems,
          totalAmount: finalAmount,
          paymentId,
          razorpayOrderId,
          razorpaySignature,
          loyaltyPointsUsed: requestedLoyaltyPoints,
          loyaltyDiscount,
          orderType: cleanOrderType,
          scheduledFor: cleanScheduledFor,
          status: 'Order Placed',
          statusHistory: [
            {
              status: 'Order Placed',
              changedAt: new Date()
            }
          ]
        })

        await newOrder.save({ session })

        // -------------------- UPDATE FOOD STOCK --------------------

        const updatedFoods = []

        for (const [foodId, requiredQuantity] of stockRequirements.entries()) {
          const updatedFood = await Food.findOneAndUpdate(
            {
              _id: foodId,
              stock: {
                $gte: requiredQuantity
              }
            },
            {
              $inc: {
                stock: -requiredQuantity
              }
            },
            {
              // Mongoose 9 compatible option.
              returnDocument: 'after',
              session
            }
          )

          // If stock update fails, the transaction will automatically
          // rollback the order and all previous stock changes.

          if (!updatedFood) {
            throw new Error('STOCK_UPDATE_FAILED')
          }

          updatedFoods.push({
            _id: updatedFood._id,
            quantity: requiredQuantity,
            foodName: updatedFood.name,

            // Restore se pehle wala stock.
            previousStock: Number(updatedFood.stock || 0) + requiredQuantity,

            // Restore ke baad nahi, order ke baad current stock.
            newStock: Number(updatedFood.stock || 0)
          })
        }

        // -------------------- CREATE STOCK HISTORY --------------------

        if (updatedFoods.length > 0) {
          const stockHistoryDocuments = updatedFoods.map(updatedFood => ({
            foodId: updatedFood._id,
            foodName: updatedFood.foodName,
            previousStock: updatedFood.previousStock,
            newStock: updatedFood.newStock,
            change: -updatedFood.quantity,

            // Customer order se automatic stock adjustment.
            adminId: String(req.user?.id || ''),
            adminName: 'Customer Order',
            reason: `Order placed - ${newOrder.orderId}`
          }))

          await StockHistory.create(stockHistoryDocuments, {
            session
          })
        }

        // -------------------- DEDUCT LOYALTY POINTS --------------------

        if (requestedLoyaltyPoints > 0) {
          const loyaltyUpdateResult = await User.findOneAndUpdate(
            {
              _id: userId,
              loyaltyPoints: {
                $gte: requestedLoyaltyPoints
              }
            },
            {
              $inc: {
                loyaltyPoints: -requestedLoyaltyPoints
              }
            },
            {
              returnDocument: 'after',
              session,
              runValidators: true
            }
          )

          // Atomic loyalty check.
          // Agar another request already used the points,
          // transaction rollback ho jayega.

          if (!loyaltyUpdateResult) {
            throw new Error('INSUFFICIENT_LOYALTY_POINTS')
          }
        }

        // Successfully created order ko transaction ke baad
        // notification aur response ke liye save kar rahe hain.

        committedOrder = newOrder
      })
    } catch (error) {
      console.error('❌ Atomic order transaction failed:', error)

      // User account disappeared.

      if (error.message === 'USER_NOT_FOUND') {
        return res.status(401).json({
          message: 'User account no longer exists.'
        })
      }

      // Loyalty points became insufficient during transaction.

      if (error.message === 'INSUFFICIENT_LOYALTY_POINTS') {
        return res.status(409).json({
          message:
            'Loyalty points were already used or are no longer sufficient. Please create a new payment.'
        })
      }

      // Duplicate payment/order protection.

      if (error?.code === 11000) {
        return res.status(409).json({
          message: 'This payment has already been used for an order.'
        })
      }

      // Stock failure.

      if (error.message === 'STOCK_UPDATE_FAILED') {
        return res.status(409).json({
          message:
            'Order could not be completed because food stock is no longer sufficient.'
        })
      }

      // Any other transaction/database failure.

      return res.status(500).json({
        message:
          'Order could not be completed. No order, stock, stock history, or loyalty changes were saved.'
      })
    } finally {
      // MongoDB session safely close karo.
      await session.endSession()
    }

    // ======================================================
    // ORDER CREATED CHECK
    // ======================================================

    // Safety protection.
    // Agar transaction successfully complete hua hai,
    // committedOrder available hona chahiye.

    if (!committedOrder) {
      return res.status(500).json({
        message: 'Order could not be created.'
      })
    }

    // ======================================================
    // ORDER PLACED NOTIFICATION
    // ======================================================

    // IMPORTANT:
    // Ye notification sirf EK BAAR create hogi.
    // Iske baad sirf EK success response jayega.

    await createNotification({
      userId: committedOrder.userId,
      type: 'order',
      title: 'Order placed successfully 🎉',
      message: `Your order ${committedOrder.orderId} has been placed successfully.`,
      orderId: committedOrder._id,
      actionUrl: `/orders/${committedOrder.orderId}`,
      io: req.app.get('io')
    })

    // ======================================================
    // SUCCESS RESPONSE
    // ======================================================

    return res.status(201).json({
      message: 'Order placed successfully.',
      order: committedOrder
    })
  } catch (error) {
    console.error('Create order error:', error)

    // Agar response already send ho chuka hai,
    // dobara response send mat karo.
    if (res.headersSent) {
      return
    }

    return res.status(500).json({
      message: 'Server error while creating order.'
    })
  }
})

// ======================================================
// GET ALL ORDERS
// ADMIN ONLY
// ======================================================

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({
        createdAt: -1
      })
      .lean()

    return res.status(200).json({
      orders
    })
  } catch (error) {
    console.error('Fetch all orders error:', error)

    return res.status(500).json({
      message: 'Server error while fetching orders.'
    })
  }
})

// ======================================================
// SALES ANALYTICS
// ADMIN ONLY
// ======================================================

// Admin.jsx ke expected response fields:
// totalRevenue
// totalOrders
// dailyRevenue
// topSellingItems
// statusDistribution

router.get('/analytics', protect, adminOnly, async (req, res) => {
  try {
    // ==================================================
    // FETCH ALL ORDERS
    // ==================================================

    const orders = await Order.find().lean()

    // ==================================================
    // ANALYTICS VARIABLES
    // ==================================================

    let totalRevenue = 0

    const dailyRevenueMap = {}

    const statusDistributionMap = {
      'Order Placed': 0,
      Preparing: 0,
      'Out for Delivery': 0,
      Delivered: 0,
      Cancelled: 0
    }

    const itemSalesMap = {}

    // ==================================================
    // PROCESS ALL ORDERS
    // ==================================================

    for (const order of orders) {
      const status = String(order.status || '').trim()

      // =================================================
      // STATUS DISTRIBUTION
      // =================================================

      if (statusDistributionMap[status] !== undefined) {
        statusDistributionMap[status]++
      }

      // =================================================
      // CANCELLED ORDERS
      // =================================================

      // Cancelled orders ko revenue aur top-selling
      // calculation mein include nahi karna.

      if (status === 'Cancelled') {
        continue
      }

      // =================================================
      // ORDER REVENUE
      // =================================================

      const amount = Number(order.totalAmount || 0)

      if (Number.isFinite(amount) && amount >= 0) {
        totalRevenue += amount
      }

      // =================================================
      // DAILY REVENUE + DAILY ORDERS
      // =================================================

      if (order.createdAt) {
        const date = new Date(order.createdAt)

        if (!Number.isNaN(date.getTime())) {
          const dateKey = date.toISOString().split('T')[0]

          if (!dailyRevenueMap[dateKey]) {
            dailyRevenueMap[dateKey] = {
              date: dateKey,
              revenue: 0,
              orders: 0
            }
          }

          dailyRevenueMap[dateKey].revenue += amount
          dailyRevenueMap[dateKey].orders += 1
        }
      }

      // =================================================
      // TOP SELLING ITEMS
      // =================================================

      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          if (!item || typeof item !== 'object') {
            continue
          }

          const quantity = Number(item.quantity || 0)

          if (!Number.isInteger(quantity) || quantity <= 0) {
            continue
          }

          // =================================================
          // ITEM ID
          // =================================================

          const itemId =
            item.itemType === 'combo' || item.comboId
              ? String(item.comboId || item._id || item.name || 'combo')
              : String(item._id || item.name || '')

          if (!itemId) {
            continue
          }

          // =================================================
          // ITEM NAME
          // =================================================

          const itemName = String(item.name || 'Unknown Item').trim()

          // =================================================
          // ITEM PRICE
          // =================================================

          const itemPrice = Number(item.price || 0)

          // =================================================
          // CREATE ITEM ENTRY
          // =================================================

          if (!itemSalesMap[itemId]) {
            itemSalesMap[itemId] = {
              _id: itemId,
              name: itemName,
              quantity: 0,
              revenue: 0
            }
          }

          // =================================================
          // ADD QUANTITY
          // =================================================

          itemSalesMap[itemId].quantity += quantity

          // =================================================
          // ADD ITEM REVENUE
          // =================================================

          if (Number.isFinite(itemPrice) && itemPrice >= 0) {
            itemSalesMap[itemId].revenue += itemPrice * quantity
          }
        }
      }
    }

    // ==================================================
    // DAILY REVENUE ARRAY
    // ==================================================

    const dailyRevenue = Object.values(dailyRevenueMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        date: item.date,
        revenue: Number(item.revenue.toFixed(2)),
        orders: item.orders
      }))

    // ==================================================
    // TOP SELLING ITEMS ARRAY
    // ==================================================

    const topSellingItems = Object.values(itemSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map(item => ({
        _id: item._id,
        name: item.name,
        quantity: item.quantity,
        revenue: Number(item.revenue.toFixed(2))
      }))

    // ==================================================
    // STATUS DISTRIBUTION ARRAY
    // ==================================================

    const statusDistribution = Object.entries(statusDistributionMap)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value
      }))

    // ==================================================
    // FINAL RESPONSE
    // ==================================================

    return res.status(200).json({
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders: orders.length,
      dailyRevenue,
      topSellingItems,
      statusDistribution
    })
  } catch (error) {
    console.error('Analytics error:', error)

    return res.status(500).json({
      message: 'Server error while calculating analytics.'
    })
  }
})

// ======================================================
// UPDATE ORDER STATUS
// ADMIN ONLY
// ======================================================

router.put('/:orderId/status', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body

    // ==================================================
    // STATUS NORMALIZATION
    // ==================================================

    const cleanStatus = String(status || '').trim()

    // ==================================================
    // ALLOWED STATUS VALIDATION
    // ==================================================

    const allowedStatuses = [
      'Order Placed',
      'Preparing',
      'Out for Delivery',
      'Delivered'
    ]

    if (!cleanStatus || !allowedStatuses.includes(cleanStatus)) {
      return res.status(400).json({
        message: 'Invalid order status.'
      })
    }

    // ==================================================
    // FIND ORDER
    // ==================================================

    const order = await Order.findOne({
      orderId: req.params.orderId
    })

    if (!order) {
      return res.status(404).json({
        message: 'Order not found.'
      })
    }

    // ==================================================
    // CANCELLED ORDER LOCK
    // ==================================================

    if (order.status === 'Cancelled') {
      return res.status(400).json({
        message: 'Cancelled orders cannot be updated.'
      })
    }

    // ==================================================
    // DELIVERED ORDER LOCK
    // ==================================================

    if (order.status === 'Delivered') {
      return res.status(400).json({
        message: 'Delivered orders cannot be updated.'
      })
    }
    // ==================================================
    // SCHEDULED ORDER STATUS PROTECTION
    // ==================================================
    // Scheduled order ko uske scheduled time se pehle
    // Preparing / Out for Delivery / Delivered nahi kiya
    // ja sakta.
    //
    // Immediate orders par iska koi effect nahi hoga.

    if (
      order.orderType === 'Scheduled' &&
      ['Preparing', 'Out for Delivery', 'Delivered'].includes(cleanStatus)
    ) {
      // Scheduled order ke liye scheduledFor required hai.
      if (!order.scheduledFor) {
        return res.status(400).json({
          message:
            'This scheduled order does not have a valid scheduled date and time.'
        })
      }

      const scheduledTime = new Date(order.scheduledFor)

      // Invalid scheduled date ko unsafe status update se protect karo.
      if (Number.isNaN(scheduledTime.getTime())) {
        return res.status(400).json({
          message:
            'This scheduled order has an invalid scheduled date and time.'
        })
      }

      // Current time.
      const currentTime = Date.now()

      // Scheduled time abhi future mein hai.
      if (currentTime < scheduledTime.getTime()) {
        return res.status(400).json({
          message: `Scheduled order cannot be moved to "${cleanStatus}" before the scheduled time. Scheduled for ${scheduledTime.toLocaleString(
            'en-IN'
          )}.`
        })
      }
    }

    // ==================================================
    // SAME STATUS CHECK
    // ==================================================
    // ==================================================

    if (order.status === cleanStatus) {
      return res.status(400).json({
        message: 'Order is already in this status.'
      })
    }
    // ==================================================
    // SEQUENTIAL STATUS TRANSITION PROTECTION
    // ==================================================
    // Order status ko directly skip karke next/final status par
    // nahi le ja sakte.
    //
    // Valid flow:
    // Order Placed -> Preparing
    // Preparing -> Out for Delivery
    // Out for Delivery -> Delivered

    const nextStatusMap = {
      'Order Placed': 'Preparing',
      Preparing: 'Out for Delivery',
      'Out for Delivery': 'Delivered'
    }

    const expectedNextStatus = nextStatusMap[order.status]

    if (!expectedNextStatus || cleanStatus !== expectedNextStatus) {
      return res.status(400).json({
        message: `Invalid status transition. Order status "${
          order.status
        }" can only be changed to "${
          expectedNextStatus || 'no further status'
        }".`
      })
    }

    // ==================================================
    // STATUS HISTORY
    // ==================================================

    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = []
    }

    order.status = cleanStatus

    order.statusHistory.push({
      status: cleanStatus,
      changedAt: new Date()
    })

    // ==================================================
    // SAVE ORDER
    // ==================================================

    await order.save()

    // ==================================================
    // REAL-TIME SOCKET.IO UPDATE
    // ==================================================

    const io = req.app.get('io')

    if (io) {
      io.to(`order-${order.orderId}`).emit('order-status-updated', {
        order: order.toObject()
      })
    }

    // ==================================================
    // LOYALTY POINTS EARNING
    // ==================================================

    // ₹10 = 1 loyalty point.
    // Points sirf Delivered hone par milenge.

    let loyaltyPointsEarned = 0

    if (cleanStatus === 'Delivered') {
      loyaltyPointsEarned = Math.floor(Number(order.totalAmount || 0) / 10)

      if (loyaltyPointsEarned > 0) {
        const user = await User.findById(order.userId)

        if (user) {
          user.loyaltyPoints =
            Number(user.loyaltyPoints || 0) + loyaltyPointsEarned

          await user.save()
        }
      }
    }

    // ======================================================
    // ORDER STATUS NOTIFICATION
    // ======================================================

    const statusNotificationMap = {
      'Order Placed': {
        title: 'Order status updated',
        message: `Your order ${order.orderId} is now placed.`,
        type: 'order'
      },

      Preparing: {
        title: 'Order is being prepared 👨‍🍳',
        message: `Your order ${order.orderId} is now being prepared.`,
        type: 'order'
      },

      'Out for Delivery': {
        title: 'Order is out for delivery 🚚',
        message: `Your order ${order.orderId} is out for delivery.`,
        type: 'delivery'
      },

      Delivered: {
        title: 'Order delivered 🎉',
        message: `Your order ${order.orderId} has been delivered successfully.`,
        type: 'delivery'
      }
    }

    const notificationData = statusNotificationMap[cleanStatus] || {
      title: 'Order status updated',
      message: `Your order ${order.orderId} status is now ${cleanStatus}.`,
      type: 'order'
    }

    await createNotification({
      userId: order.userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      orderId: order._id,
      actionUrl: `/orders/${order.orderId}`,
      io: req.app.get('io')
    })

    // ==================================================
    // SUCCESS RESPONSE
    // ==================================================

    return res.status(200).json({
      message: 'Order status updated successfully.',
      loyaltyPointsEarned,
      order
    })
  } catch (error) {
    console.error('Update status error:', error)

    if (res.headersSent) {
      return
    }

    return res.status(500).json({
      message: 'Server error while updating order status.'
    })
  }
})

// ======================================================
// CANCEL ORDER
// LOGGED-IN USER
// ======================================================

// Cancelled order ke normal Food items ka stock restore hoga.
// Combo items ka stock abhi restore nahi hoga because
// Combo inventory separate system mein abhi implemented nahi hai.
//
// Customer cancellation par automatic StockHistory save hogi.
// Customer cancellation par notification create hogi.

router.put('/:orderId/cancel', protect, async (req, res) => {
  try {
    // ==================================================
    // FIND ORDER
    // ==================================================

    const order = await Order.findOne({
      orderId: req.params.orderId
    })

    if (!order) {
      return res.status(404).json({
        message: 'Order not found.'
      })
    }

    // ==================================================
    // OWN ORDER CHECK
    // ==================================================

    if (
      req.user.role !== 'admin' &&
      order.userId.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        message: 'You can only cancel your own order.'
      })
    }

    // ==================================================
    // DELIVERED ORDER CHECK
    // ==================================================

    if (order.status === 'Delivered') {
      return res.status(400).json({
        message: 'Delivered orders cannot be cancelled.'
      })
    }

    // ==================================================
    // ALREADY CANCELLED CHECK
    // ==================================================

    if (order.status === 'Cancelled') {
      return res.status(400).json({
        message: 'Order is already cancelled.'
      })
    }

    // ==================================================
    // RESTORE STOCK
    // ==================================================

    const restoredFoods = []

    try {
      for (const item of order.items || []) {
        // ==================================================
        // CHECK COMBO
        // ==================================================

        const isCombo =
          item.itemType === 'combo' ||
          Boolean(item.comboId) ||
          String(item._id || '').startsWith('combo-')

        // Combo inventory abhi restore nahi karna.
        if (isCombo) {
          continue
        }

        // ==================================================
        // VALIDATE FOOD ID
        // ==================================================

        if (!item._id) {
          throw new Error('FOOD_ID_MISSING')
        }

        const quantity = Number(item.quantity || 0)

        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new Error('INVALID_FOOD_QUANTITY')
        }

        // ==================================================
        // RESTORE FOOD STOCK
        // ==================================================

        const updatedFood = await Food.findByIdAndUpdate(
          item._id,
          {
            $inc: {
              stock: quantity
            }
          },
          {
            // Mongoose 9 compatible option.
            returnDocument: 'after'
          }
        )

        if (!updatedFood) {
          throw new Error('FOOD_NOT_FOUND')
        }

        // ==================================================
        // SAVE RESTORED FOOD DETAILS
        // ==================================================

        restoredFoods.push({
          _id: updatedFood._id,
          quantity,
          foodName: updatedFood.name,

          // Restore ke baad wala stock.
          newStock: Number(updatedFood.stock || 0),

          // Restore se pehle wala stock.
          previousStock: Number(updatedFood.stock || 0) - quantity
        })
      }
    } catch (stockRestoreError) {
      // ==================================================
      // STOCK RESTORE ROLLBACK
      // ==================================================

      for (const restoredFood of restoredFoods) {
        try {
          await Food.findByIdAndUpdate(restoredFood._id, {
            $inc: {
              stock: -restoredFood.quantity
            }
          })
        } catch (rollbackError) {
          console.error('Cancel stock rollback error:', rollbackError)
        }
      }

      console.error('Stock restore error:', stockRestoreError)

      return res.status(500).json({
        message:
          'Order cancellation failed because food stock could not be restored.'
      })
    }

    // ==================================================
    // STATUS HISTORY
    // ==================================================

    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = []
    }

    order.status = 'Cancelled'

    order.statusHistory.push({
      status: 'Cancelled',
      changedAt: new Date()
    })

    // ==================================================
    // SAVE CANCELLED ORDER
    // ==================================================

    try {
      await order.save()
    } catch (orderSaveError) {
      // ==================================================
      // RESTORE STOCK ROLLBACK
      // ==================================================

      for (const restoredFood of restoredFoods) {
        try {
          await Food.findByIdAndUpdate(restoredFood._id, {
            $inc: {
              stock: -restoredFood.quantity
            }
          })
        } catch (rollbackError) {
          console.error('Order save rollback error:', rollbackError)
        }
      }

      throw orderSaveError
    }

    // ==================================================
    // SAVE AUTOMATIC CANCELLATION STOCK HISTORY
    // ==================================================

    for (const restoredFood of restoredFoods) {
      try {
        await StockHistory.create({
          foodId: restoredFood._id,
          foodName: restoredFood.foodName,
          previousStock: restoredFood.previousStock,
          newStock: restoredFood.newStock,
          change: restoredFood.quantity,

          // Customer cancellation se automatic adjustment.
          adminId: String(req.user?.id || ''),
          adminName: 'Customer Cancellation',

          reason: `Order cancelled - ${order.orderId}`
        })
      } catch (historyError) {
        // History fail hone par cancellation fail nahi hoga.
        console.error('Cancellation stock history save error:', historyError)
      }
    }

    // ==================================================
    // REAL-TIME SOCKET.IO UPDATE
    // ==================================================

    const io = req.app.get('io')

    if (io) {
      io.to(`order-${order.orderId}`).emit('order-status-updated', {
        order: order.toObject()
      })
    }

    // ======================================================
    // CANCELLATION NOTIFICATION
    // ======================================================

    await createNotification({
      userId: order.userId,
      type: 'order',
      title: 'Order cancelled ❌',
      message: `Your order ${order.orderId} has been cancelled successfully.`,
      orderId: order._id,
      actionUrl: `/orders/${order.orderId}`,
      io: req.app.get('io')
    })

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      message: 'Order cancelled successfully.',
      order
    })
  } catch (error) {
    console.error('Cancel order error:', error)

    if (res.headersSent) {
      return
    }

    return res.status(500).json({
      message: 'Server error while cancelling order.'
    })
  }
})

// ======================================================
// GET MY ORDERS
// LOGGED-IN USER ONLY
// ======================================================

router.get('/my-orders', protect, async (req, res) => {
  try {
    const userId = req.user.id

    const orders = await Order.find({
      userId
    }).sort({
      createdAt: -1
    })

    return res.status(200).json({
      orders
    })
  } catch (error) {
    console.error('Fetch my orders error:', error)

    return res.status(500).json({
      message: 'Server error while fetching your orders.'
    })
  }
})

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router
