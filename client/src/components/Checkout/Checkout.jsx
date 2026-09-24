import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ======================================================
// CHECKOUT COMPONENT
// ======================================================
// Features:
// 1. Customer details
// 2. Cart validation
// 3. Loyalty points display
// 4. Loyalty points redemption
// 5. Order Now / Scheduled Order
// 6. Scheduled date & time validation
// 7. Razorpay test payment
// 8. Backend payment verification
// 9. Database order creation
// 10. Payment idempotency protection
// 11. Premium checkout UI
//
// Loyalty Rule:
// 1 Loyalty Point = ₹1 discount
// ======================================================

function Checkout () {
  const navigate = useNavigate()

  // ======================================================
  // FORM STATES
  // ======================================================

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  // ======================================================
  // SCHEDULED ORDER STATES
  // ======================================================

  // Immediate = Order Now
  // Scheduled = Future order
  const [orderType, setOrderType] = useState('Immediate')

  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  // ======================================================
  // PAYMENT STATE
  // ======================================================

  const [loading, setLoading] = useState(false)

  // ======================================================
  // PAYMENT IDEMPOTENCY
  // ======================================================
  // Same checkout attempt ke retry par same key reuse hogi.
  //
  // Example:
  // - Razorpay popup close -> same key
  // - Payment retry -> same key
  // - Same cart + same loyalty + same schedule -> same key
  //
  // Lekin:
  // - Cart change
  // - Quantity change
  // - Loyalty points change
  // - Schedule change
  //
  // par new checkout intent aur new key generate hogi.
  // ======================================================

  const paymentIdempotencyKeyRef = useRef(null)

  // ======================================================
  // LOYALTY STATES
  // ======================================================

  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [loyaltyPointsUsed, setLoyaltyPointsUsed] = useState(0)
  const [loadingPoints, setLoadingPoints] = useState(true)

  // ======================================================
  // GET CART ITEMS
  // ======================================================

  const getCartItems = () => {
    try {
      return JSON.parse(localStorage.getItem('cart')) || []
    } catch (error) {
      console.error('Cart parsing error:', error)
      return []
    }
  }

  // ======================================================
  // NORMALIZE CART ITEMS FOR BACKEND
  // ======================================================
  // Backend ab itemType ko strictly validate karta hai.
  //
  // Food:
  // itemType = "food"
  //
  // Combo:
  // itemType = "combo"
  // comboId = actual ComboOffer MongoDB ObjectId
  //
  // Isse old cart items bhi safely backend-compatible
  // format mein convert ho jayenge.
  // ======================================================

  const normalizeCartItemsForBackend = items => {
    return items.map(item => {
      // Invalid item ko backend validation handle karne denge.
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return item
      }

      const rawId = String(item._id || '')

      // Combo identify karne ke possible existing formats.
      const isCombo =
        item.itemType === 'combo' ||
        Boolean(item.comboId) ||
        rawId.startsWith('combo-')

      // ==================================================
      // COMBO ITEM
      // ==================================================

      if (isCombo) {
        // Agar comboId already available hai to wahi use hoga.
        //
        // Agar old cart mein _id = "combo-OBJECT_ID" format hai,
        // to "combo-" remove karke actual ObjectId nikala jayega.
        const derivedComboId =
          item.comboId || (rawId.startsWith('combo-') ? rawId.slice(6) : '')

        return {
          ...item,

          // Backend ke liye strict item type.
          itemType: 'combo',

          // Actual ComboOffer ID.
          ...(derivedComboId
            ? {
                comboId: derivedComboId
              }
            : {})
        }
      }

      // ==================================================
      // NORMAL FOOD ITEM
      // ==================================================

      return {
        ...item,

        // Backend ke liye strict item type.
        itemType: 'food'
      }
    })
  }

  // ======================================================
  // PAYMENT IDEMPOTENCY FINGERPRINT
  // ======================================================
  // Fingerprint checkout intent ko identify karta hai.
  //
  // Same:
  // cart + quantity + loyalty + order type + schedule
  //
  // = same checkout intent
  //
  // Change:
  // cart / quantity / loyalty / schedule
  //
  // = new checkout intent
  // ======================================================

  const getCheckoutIntentFingerprint = () => {
    try {
      const checkoutCart = normalizeCartItemsForBackend(getCartItems())

      return JSON.stringify({
        items: checkoutCart.map(item => ({
          itemType: item?.itemType || null,
          _id: item?._id || null,
          comboId: item?.comboId || null,
          quantity: Number(item?.quantity || 0)
        })),

        loyaltyPointsUsed: Number(loyaltyPointsUsed || 0),

        orderType,

        scheduledDate: orderType === 'Scheduled' ? scheduledDate : '',

        scheduledTime: orderType === 'Scheduled' ? scheduledTime : ''
      })
    } catch (error) {
      console.error('Checkout intent fingerprint error:', error)

      return ''
    }
  }

  // ======================================================
  // INVALIDATE PAYMENT IDEMPOTENCY KEY
  // ======================================================
  // Jab payment verification fail ho jaye to old key ko
  // next checkout attempt ke liye reuse nahi karna.
  // ======================================================

  const invalidatePaymentIdempotencyKey = () => {
    paymentIdempotencyKeyRef.current = null

    try {
      sessionStorage.removeItem('paymentIdempotencyKeyData')
    } catch (error) {
      console.error('Payment idempotency key cleanup error:', error)
    }
  }

  // ======================================================
  // GET PAYMENT IDEMPOTENCY KEY
  // ======================================================

  const getPaymentIdempotencyKey = () => {
    const storageKey = 'paymentIdempotencyKeyData'

    const currentFingerprint = getCheckoutIntentFingerprint()

    try {
      const savedData = JSON.parse(sessionStorage.getItem(storageKey) || 'null')

      // ==================================================
      // SAME CHECKOUT INTENT
      // ==================================================
      // Existing key reuse karo.
      // ==================================================

      if (
        savedData &&
        savedData.fingerprint === currentFingerprint &&
        typeof savedData.key === 'string' &&
        savedData.key.length >= 16
      ) {
        paymentIdempotencyKeyRef.current = savedData.key

        return savedData.key
      }

      // ==================================================
      // NEW CHECKOUT INTENT
      // ==================================================

      const newKey = crypto.randomUUID()

      paymentIdempotencyKeyRef.current = newKey

      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          key: newKey,
          fingerprint: currentFingerprint
        })
      )

      return newKey
    } catch (error) {
      console.error('Payment idempotency storage error:', error)

      // sessionStorage unavailable hone par
      // current component ke liye fallback key.
      if (!paymentIdempotencyKeyRef.current) {
        paymentIdempotencyKeyRef.current = crypto.randomUUID()
      }

      return paymentIdempotencyKeyRef.current
    }
  }

  // ======================================================
  // GET CURRENT DATE FOR DATE INPUT
  // ======================================================

  const getTodayDate = () => {
    const today = new Date()

    const year = today.getFullYear()

    const month = String(today.getMonth() + 1).padStart(2, '0')

    const day = String(today.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  // ======================================================
  // GET MINIMUM SCHEDULE DATE
  // ======================================================

  const minScheduleDate = getTodayDate()

  // ======================================================
  // CART DATA
  // ======================================================

  const cartItems = getCartItems()

  // ======================================================
  // CART SUBTOTAL
  // ======================================================

  const cartSubtotal = Number(
    cartItems
      .reduce((total, item) => {
        const price = Number(item.price) || 0
        const quantity = Number(item.quantity || 1)

        return total + price * quantity
      }, 0)
      .toFixed(2)
  )

  // ======================================================
  // MAXIMUM REDEEMABLE POINTS
  // ======================================================
  // At least ₹1 Razorpay payment maintain karenge.

  const maxByAmount = Math.max(0, Math.floor(cartSubtotal - 1))

  const maxRedeemablePoints = Math.min(Number(loyaltyPoints) || 0, maxByAmount)

  // ======================================================
  // LOYALTY DISCOUNT
  // ======================================================

  const loyaltyDiscount = Number(loyaltyPointsUsed || 0)

  // ======================================================
  // FINAL AMOUNT
  // ======================================================

  const finalAmount = Math.max(
    0,
    Number((cartSubtotal - loyaltyDiscount).toFixed(2))
  )

  // ======================================================
  // LOAD LOYALTY POINTS
  // ======================================================

  useEffect(() => {
    const fetchLoyaltyPoints = async () => {
      try {
        const token = localStorage.getItem('token')

        if (!token) {
          setLoyaltyPoints(0)
          setLoadingPoints(false)

          return
        }

        const response = await fetch(
          'http://localhost:5000/api/auth/loyalty-points',
          {
            method: 'GET',

            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const data = await response.json()

        if (!response.ok) {
          console.error(
            'Failed to fetch loyalty points:',
            data.message || 'Unknown error'
          )

          setLoyaltyPoints(0)
          setLoadingPoints(false)

          return
        }

        setLoyaltyPoints(Number(data.loyaltyPoints || 0))
      } catch (error) {
        console.error('Loyalty points error:', error)

        setLoyaltyPoints(0)
      } finally {
        setLoadingPoints(false)
      }
    }

    fetchLoyaltyPoints()
  }, [])

  // ======================================================
  // LOYALTY INPUT HANDLER
  // ======================================================

  const handleLoyaltyPointsChange = event => {
    const value = event.target.value

    if (value === '') {
      setLoyaltyPointsUsed(0)

      return
    }

    const numericValue = Number(value)

    if (!Number.isInteger(numericValue) || numericValue < 0) {
      return
    }

    setLoyaltyPointsUsed(Math.min(numericValue, maxRedeemablePoints))
  }

  // ======================================================
  // USE ALL POINTS
  // ======================================================

  const handleUseAllPoints = () => {
    setLoyaltyPointsUsed(maxRedeemablePoints)
  }

  // ======================================================
  // ORDER TYPE HANDLER
  // ======================================================

  const handleOrderTypeChange = type => {
    setOrderType(type)

    // Immediate order mein scheduled details ki
    // zarurat nahi hoti.
    if (type === 'Immediate') {
      setScheduledDate('')
      setScheduledTime('')
    }
  }

  // ======================================================
  // SCHEDULE VALIDATION
  // ======================================================

  const validateScheduledOrder = () => {
    // Normal order ke liye validation required nahi.
    if (orderType === 'Immediate') {
      return true
    }

    // Scheduled order mein date required hai.
    if (!scheduledDate) {
      alert('Please select a scheduled date.')

      return false
    }

    // Scheduled order mein time required hai.
    if (!scheduledTime) {
      alert('Please select a scheduled time.')

      return false
    }

    // Scheduled date/time ko Date object mein convert.
    const selectedDateTime = new Date(`${scheduledDate}T${scheduledTime}`)

    // Invalid date/time protection.
    if (Number.isNaN(selectedDateTime.getTime())) {
      alert('Please select a valid scheduled date and time.')

      return false
    }

    // Past date/time allow nahi karna.
    if (selectedDateTime <= new Date()) {
      alert('Scheduled date and time must be in the future.')

      return false
    }

    return true
  }

  // ======================================================
  // LOAD RAZORPAY SCRIPT
  // ======================================================

  const loadRazorpayScript = () => {
    return new Promise(resolve => {
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      )

      if (existingScript) {
        resolve(true)

        return
      }

      const script = document.createElement('script')

      script.src = 'https://checkout.razorpay.com/v1/checkout.js'

      script.onload = () => resolve(true)

      script.onerror = () => resolve(false)

      document.body.appendChild(script)
    })
  }

  // ======================================================
  // PLACE ORDER
  // ======================================================

  const handlePlaceOrder = async event => {
    event.preventDefault()

    // Prevent duplicate requests.
    if (loading) {
      return
    }

    // ====================================================
    // VALIDATE CUSTOMER DETAILS
    // ====================================================

    if (!name.trim() || !phone.trim() || !address.trim()) {
      alert('Please fill all delivery details.')

      return
    }

    // ====================================================
    // VALIDATE PHONE
    // ====================================================

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      alert('Please enter a valid 10-digit phone number.')

      return
    }

    // ====================================================
    // VALIDATE SCHEDULED ORDER
    // ====================================================

    if (!validateScheduledOrder()) {
      return
    }

    // ====================================================
    // GET CURRENT CART
    // ====================================================

    const currentCartItems = normalizeCartItemsForBackend(getCartItems())

    if (currentCartItems.length === 0) {
      alert('Your cart is empty.')

      navigate('/menu')

      return
    }

    // ====================================================
    // CHECK LOGIN
    // ====================================================

    const loggedInUser =
      JSON.parse(localStorage.getItem('loggedInUser')) || null

    const token = localStorage.getItem('token')

    if (!loggedInUser || !loggedInUser.id || !token) {
      alert('Please login before placing an order.')

      navigate('/login')

      return
    }

    // ====================================================
    // VALIDATE LOYALTY POINTS
    // ====================================================

    if (
      !Number.isInteger(Number(loyaltyPointsUsed)) ||
      Number(loyaltyPointsUsed) < 0
    ) {
      alert('Invalid loyalty points.')

      return
    }

    if (Number(loyaltyPointsUsed) > Number(loyaltyPoints)) {
      alert('You do not have enough loyalty points.')

      return
    }

    if (Number(loyaltyPointsUsed) > maxRedeemablePoints) {
      alert(
        `Maximum redeemable points for this order are ${maxRedeemablePoints}.`
      )

      return
    }

    // ====================================================
    // START PAYMENT
    // ====================================================

    try {
      setLoading(true)

      // ==================================================
      // LOAD RAZORPAY
      // ==================================================

      const razorpayLoaded = await loadRazorpayScript()

      if (!razorpayLoaded) {
        alert('❌ Razorpay failed to load.')

        setLoading(false)

        return
      }

      // ==================================================
      // GET IDEMPOTENCY KEY
      // ==================================================
      // IMPORTANT:
      // Is request ke retry mein same key reuse hogi.
      // ==================================================

      const paymentIdempotencyKey = getPaymentIdempotencyKey()

      // ==================================================
      // CREATE RAZORPAY ORDER
      // ==================================================

      const paymentResponse = await fetch(
        'http://localhost:5000/api/payment/create-order',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',

            Authorization: `Bearer ${token}`
          },

          body: JSON.stringify({
            items: currentCartItems,

            loyaltyPointsUsed: Number(loyaltyPointsUsed),

            idempotencyKey: paymentIdempotencyKey
          })
        }
      )

      const paymentData = await paymentResponse.json()

      if (!paymentResponse.ok) {
        alert(paymentData.message || 'Failed to create payment order.')

        setLoading(false)

        return
      }

      // ==================================================
      // RAZORPAY ORDER
      // ==================================================

      const razorpayOrder = paymentData.order

      if (!razorpayOrder || !razorpayOrder.id) {
        alert('❌ Invalid Razorpay order received.')

        setLoading(false)

        return
      }

      // ==================================================
      // BACKEND AMOUNTS
      // ==================================================

      const backendOriginalAmount = Number(
        paymentData.originalAmount ?? cartSubtotal
      )

      const backendLoyaltyDiscount = Number(
        paymentData.loyaltyDiscount ?? loyaltyDiscount
      )

      const backendFinalAmount = Number(
        paymentData.finalOrderAmount ?? razorpayOrder.amount / 100
      )

      // ==================================================
      // RAZORPAY OPTIONS
      // ==================================================

      const options = {
        // ==================================================
        // IMPORTANT
        // ==================================================
        // Yahan apni PUBLIC Razorpay Test Key lagao.
        //
        // Example:
        // key: 'rzp_test_xxxxxxxxxx'
        //
        // Secret key kabhi frontend mein mat lagana.
        // ==================================================

        key: 'rzp_test_TZP9rGcFJCkMAY',

        // Backend-created amount.
        amount: razorpayOrder.amount,

        // Backend currency.
        currency: razorpayOrder.currency,

        // Restaurant name.
        name: 'RK Restaurant',

        // Payment description.
        description:
          orderType === 'Scheduled'
            ? 'RK Restaurant Scheduled Food Order'
            : 'Restaurant Food Order',

        // Razorpay order ID.
        order_id: razorpayOrder.id,

        // Customer information.
        prefill: {
          name: name.trim(),

          contact: phone.trim()
        },

        // Razorpay theme.
        theme: {
          color: '#ea580c'
        },

        // ==================================================
        // PAYMENT SUCCESS
        // ==================================================

        handler: async function (paymentResponse) {
          try {
            console.log('Razorpay payment successful:', paymentResponse)

            // ==================================================
            // VERIFY PAYMENT
            // ==================================================

            const verifyResponse = await fetch(
              'http://localhost:5000/api/payment/verify',
              {
                method: 'POST',

                headers: {
                  'Content-Type': 'application/json',

                  Authorization: `Bearer ${token}`
                },

                body: JSON.stringify({
                  razorpay_order_id: paymentResponse.razorpay_order_id,

                  razorpay_payment_id: paymentResponse.razorpay_payment_id,

                  razorpay_signature: paymentResponse.razorpay_signature
                })
              }
            )

            const verifyData = await verifyResponse.json()

            if (!verifyResponse.ok || !verifyData.success) {
              // Verification failed.
              // Old key ko remove karo so next
              // checkout attempt fresh intent ho.
              invalidatePaymentIdempotencyKey()

              alert(verifyData.message || '❌ Payment verification failed.')

              setLoading(false)

              return
            }

            console.log('✅ Payment verified successfully.')

            // ==================================================
            // CREATE DATABASE ORDER
            // ==================================================

            const orderResponse = await fetch(
              'http://localhost:5000/api/orders/create',
              {
                method: 'POST',

                headers: {
                  'Content-Type': 'application/json',

                  Authorization: `Bearer ${token}`
                },

                body: JSON.stringify({
                  name: name.trim(),

                  phone: phone.trim(),

                  address: address.trim(),

                  items: currentCartItems,

                  totalAmount: backendFinalAmount,

                  // Loyalty points redeemed.
                  loyaltyPointsUsed: Number(loyaltyPointsUsed),

                  paymentId: paymentResponse.razorpay_payment_id,

                  razorpayOrderId: paymentResponse.razorpay_order_id,

                  razorpaySignature: paymentResponse.razorpay_signature,

                  // Scheduled order information.
                  orderType,

                  scheduledFor:
                    orderType === 'Scheduled'
                      ? new Date(
                          `${scheduledDate}T${scheduledTime}`
                        ).toISOString()
                      : null
                })
              }
            )

            const orderData = await orderResponse.json()

            // ==================================================
            // ORDER CREATION FAILED
            // ==================================================

            if (!orderResponse.ok) {
              // IMPORTANT:
              // Payment already verified ho chuka hai.
              // Is situation mein idempotency key delete
              // nahi karenge, taaki same payment ko
              // blindly dobara charge na kiya ja sake.
              //
              // Backend/order recovery ko later handle
              // kiya ja sakta hai.
              alert(
                orderData.message ||
                  'Payment verified but order creation failed.'
              )

              setLoading(false)

              return
            }

            // ==================================================
            // SAVE ORDER
            // ==================================================

            const order = orderData.order

            localStorage.setItem('lastOrder', JSON.stringify(order))

            localStorage.setItem('lastOrderId', order.orderId)

            // ==================================================
            // CLEAR CART
            // ==================================================

            localStorage.removeItem('cart')

            // ==================================================
            // PAYMENT IDEMPOTENCY CLEANUP
            // ==================================================
            // Successful complete order ke baad old
            // checkout key ki zarurat nahi hai.
            // ==================================================

            invalidatePaymentIdempotencyKey()

            // ==================================================
            // SUCCESS MESSAGE
            // ==================================================

            const scheduleMessage =
              orderType === 'Scheduled'
                ? `\nScheduled For: ${scheduledDate} ${scheduledTime}`
                : '\nOrder Type: Order Now'

            alert(
              `✅ Payment verified!

Order placed successfully!

${scheduleMessage}

Original Amount: ₹${backendOriginalAmount.toFixed(2)}

Loyalty Discount: ₹${backendLoyaltyDiscount.toFixed(2)}

Final Paid: ₹${backendFinalAmount.toFixed(2)}`
            )

            navigate('/order-success')
          } catch (error) {
            console.error('Payment verification/order error:', error)

            alert('❌ Payment was successful, but order verification failed.')

            setLoading(false)
          }
        },

        // ==================================================
        // PAYMENT POPUP CLOSED
        // ==================================================

        modal: {
          ondismiss: function () {
            // IMPORTANT:
            // Popup close par idempotency key delete
            // nahi karenge.
            //
            // Agar Razorpay order Created hai to same
            // payment intent safely reuse ho sakta hai.
            setLoading(false)

            alert('❌ Payment cancelled. You can retry the same payment.')
          }
        }
      }

      // ====================================================
      // CREATE RAZORPAY INSTANCE
      // ====================================================

      const razorpay = new window.Razorpay(options)

      // ====================================================
      // PAYMENT FAILED
      // ====================================================

      razorpay.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error)

        // Razorpay order ko same checkout intent ke
        // liye reuse kiya ja sakta hai.
        //
        // Isliye key ko yahan delete nahi kar rahe.
        // Next retry same backend payment intent
        // use karega.

        alert(
          `❌ Payment failed: ${
            response.error?.description || 'Please try again.'
          }`
        )

        setLoading(false)
      })

      // ====================================================
      // OPEN RAZORPAY
      // ====================================================

      razorpay.open()
    } catch (error) {
      console.error('Payment error:', error)

      alert(
        '❌ Cannot connect to payment server. Please make sure backend is running.'
      )

      setLoading(false)
    }
  }

  // ======================================================
  // CHECKOUT UI
  // ======================================================

  return (
    <section className='min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50 px-6 py-12 sm:py-16'>
      <div className='mx-auto max-w-5xl'>
        {/* PAGE HEADER */}

        <div className='text-center'>
          <p className='text-sm font-black uppercase tracking-[0.3em] text-orange-600'>
            RK Restaurant
          </p>

          <h1 className='mt-3 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl'>
            Checkout
          </h1>

          <p className='mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500'>
            Enter your delivery details, choose your order timing, redeem
            loyalty points and continue to secure payment.
          </p>
        </div>

        {/* CHECKOUT CARD */}

        <div className='mx-auto mt-12 max-w-3xl overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-xl'>
          {/* CARD HEADER */}

          <div className='bg-gray-900 px-6 py-6 text-white sm:px-8'>
            <div className='flex items-center gap-4'>
              <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-2xl'>
                🛍️
              </div>

              <div>
                <h2 className='text-xl font-black'>Complete Your Order</h2>

                <p className='mt-1 text-sm text-gray-300'>
                  Delivery information
                </p>
              </div>
            </div>
          </div>

          {/* FORM */}

          <form onSubmit={handlePlaceOrder} className='p-6 sm:p-8'>
            {/* FULL NAME */}

            <div>
              <label
                htmlFor='checkout-name'
                className='mb-2 block text-sm font-bold text-gray-700'
              >
                Full Name
              </label>

              <input
                id='checkout-name'
                type='text'
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder='Enter your full name'
                className='w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100'
              />
            </div>

            {/* PHONE */}

            <div className='mt-5'>
              <label
                htmlFor='checkout-phone'
                className='mb-2 block text-sm font-bold text-gray-700'
              >
                Phone Number
              </label>

              <input
                id='checkout-phone'
                type='tel'
                value={phone}
                onChange={event => setPhone(event.target.value)}
                placeholder='Enter 10-digit mobile number'
                maxLength={10}
                className='w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100'
              />

              <p className='mt-2 text-xs text-gray-400'>Example: 9876543210</p>
            </div>

            {/* ADDRESS */}

            <div className='mt-5'>
              <label
                htmlFor='checkout-address'
                className='mb-2 block text-sm font-bold text-gray-700'
              >
                Delivery Address
              </label>

              <textarea
                id='checkout-address'
                value={address}
                onChange={event => setAddress(event.target.value)}
                placeholder='Enter your complete delivery address'
                rows={5}
                className='w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100'
              />
            </div>

            {/* ORDER TYPE */}

            <div className='mt-6 rounded-2xl border border-orange-100 bg-orange-50 p-5'>
              <div>
                <p className='text-sm font-black text-gray-900'>Order Timing</p>

                <p className='mt-1 text-xs text-gray-500'>
                  Choose whether you want the order now or at a future time.
                </p>
              </div>

              {/* ORDER TYPE BUTTONS */}

              <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                {/* ORDER NOW */}

                <button
                  type='button'
                  onClick={() => handleOrderTypeChange('Immediate')}
                  disabled={loading}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    orderType === 'Immediate'
                      ? 'border-orange-500 bg-white shadow-md ring-2 ring-orange-100'
                      : 'border-gray-200 bg-white hover:border-orange-300'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className='flex items-center gap-3'>
                    <div className='text-2xl'>🛵</div>

                    <div>
                      <p className='text-sm font-black text-gray-900'>
                        Order Now
                      </p>

                      <p className='mt-1 text-xs text-gray-500'>
                        Place your order immediately.
                      </p>
                    </div>
                  </div>
                </button>

                {/* SCHEDULE ORDER */}

                <button
                  type='button'
                  onClick={() => handleOrderTypeChange('Scheduled')}
                  disabled={loading}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    orderType === 'Scheduled'
                      ? 'border-orange-500 bg-white shadow-md ring-2 ring-orange-100'
                      : 'border-gray-200 bg-white hover:border-orange-300'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className='flex items-center gap-3'>
                    <div className='text-2xl'>⏰</div>

                    <div>
                      <p className='text-sm font-black text-gray-900'>
                        Schedule Order
                      </p>

                      <p className='mt-1 text-xs text-gray-500'>
                        Choose a future date and time.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* SCHEDULE DETAILS */}

              {orderType === 'Scheduled' && (
                <div className='mt-5 rounded-2xl border border-orange-200 bg-white p-4'>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    {/* DATE */}

                    <div>
                      <label
                        htmlFor='scheduled-date'
                        className='mb-2 block text-xs font-black text-gray-700'
                      >
                        Scheduled Date
                      </label>

                      <input
                        id='scheduled-date'
                        type='date'
                        min={minScheduleDate}
                        value={scheduledDate}
                        onChange={event => setScheduledDate(event.target.value)}
                        disabled={loading}
                        className='w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60'
                      />
                    </div>

                    {/* TIME */}

                    <div>
                      <label
                        htmlFor='scheduled-time'
                        className='mb-2 block text-xs font-black text-gray-700'
                      >
                        Scheduled Time
                      </label>

                      <input
                        id='scheduled-time'
                        type='time'
                        value={scheduledTime}
                        onChange={event => setScheduledTime(event.target.value)}
                        disabled={loading}
                        className='w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60'
                      />
                    </div>
                  </div>

                  <div className='mt-4 rounded-xl bg-orange-50 px-4 py-3'>
                    <p className='text-xs leading-5 text-orange-700'>
                      ⏰ Scheduled date and time future mein hona chahiye. Past
                      date/time accept nahi kiya jayega.
                    </p>
                  </div>

                  {/* SELECTED SCHEDULE PREVIEW */}

                  {scheduledDate && scheduledTime && (
                    <div className='mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3'>
                      <p className='text-xs font-bold text-green-700'>
                        ✅ Scheduled for: {scheduledDate} at {scheduledTime}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* LOYALTY POINTS */}

            <div className='mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5'>
              <div className='flex items-start gap-4'>
                <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl'>
                  🪙
                </div>

                <div className='min-w-0 flex-1'>
                  <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <p className='text-sm font-black text-gray-900'>
                        Loyalty Points
                      </p>

                      {loadingPoints ? (
                        <p className='mt-1 text-xs text-gray-500'>
                          Loading your points...
                        </p>
                      ) : (
                        <p className='mt-1 text-xs text-gray-500'>
                          Available:{' '}
                          <span className='font-black text-orange-600'>
                            {loyaltyPoints} points
                          </span>
                        </p>
                      )}
                    </div>

                    <span className='text-xs font-bold text-gray-500'>
                      1 point = ₹1
                    </span>
                  </div>

                  {!loadingPoints && loyaltyPoints > 0 ? (
                    <div className='mt-4'>
                      <div className='flex flex-col gap-3 sm:flex-row'>
                        <input
                          id='loyalty-points'
                          type='number'
                          min='0'
                          max={maxRedeemablePoints}
                          step='1'
                          value={loyaltyPointsUsed}
                          onChange={handleLoyaltyPointsChange}
                          placeholder='Points to redeem'
                          className='w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 sm:flex-1'
                        />

                        <button
                          type='button'
                          onClick={handleUseAllPoints}
                          disabled={loading || maxRedeemablePoints === 0}
                          className='rounded-xl bg-gray-900 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300'
                        >
                          Use All
                        </button>
                      </div>

                      <p className='mt-2 text-xs text-gray-500'>
                        You can redeem up to{' '}
                        <span className='font-black text-gray-700'>
                          {maxRedeemablePoints} points
                        </span>{' '}
                        on this order.
                      </p>
                    </div>
                  ) : !loadingPoints ? (
                    <div className='mt-3 rounded-xl bg-white/70 px-4 py-3 text-xs text-gray-500'>
                      Earn loyalty points by completing delivered orders.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* ORDER SUMMARY */}

            <div className='mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5'>
              <div className='flex items-center justify-between'>
                <p className='text-sm font-bold text-gray-600'>
                  Original Amount
                </p>

                <p className='text-base font-black text-gray-900'>
                  ₹{cartSubtotal.toFixed(2)}
                </p>
              </div>

              <div className='mt-3 flex items-center justify-between'>
                <p className='text-sm font-bold text-gray-600'>
                  Loyalty Discount
                </p>

                <p className='text-base font-black text-green-600'>
                  - ₹{loyaltyDiscount.toFixed(2)}
                </p>
              </div>

              <div className='my-4 border-t border-gray-200' />

              <div className='flex items-center justify-between'>
                <p className='text-base font-black text-gray-900'>
                  Final Amount
                </p>

                <p className='text-2xl font-black text-orange-600'>
                  ₹{finalAmount.toFixed(2)}
                </p>
              </div>

              {orderType === 'Scheduled' && scheduledDate && scheduledTime && (
                <div className='mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3'>
                  <p className='text-xs font-bold text-orange-700'>
                    ⏰ Scheduled: {scheduledDate} at {scheduledTime}
                  </p>
                </div>
              )}

              {loyaltyPointsUsed > 0 && (
                <div className='mt-3 rounded-xl bg-green-50 px-4 py-3'>
                  <p className='text-xs font-bold text-green-700'>
                    🎉 {loyaltyPointsUsed} loyalty points applied successfully.
                  </p>
                </div>
              )}
            </div>

            {/* PAYMENT INFO */}

            <div className='mt-6 rounded-2xl border border-orange-100 bg-orange-50 p-4'>
              <div className='flex items-start gap-3'>
                <span className='text-xl'>🔒</span>

                <div>
                  <p className='text-sm font-black text-gray-800'>
                    Secure Payment
                  </p>

                  <p className='mt-1 text-xs leading-5 text-gray-500'>
                    Your payment is processed securely through Razorpay.
                  </p>
                </div>
              </div>
            </div>

            {/* PAYMENT BUTTON */}

            <button
              type='submit'
              disabled={loading || cartItems.length === 0}
              className='mt-7 flex w-full items-center justify-center rounded-2xl bg-orange-600 px-6 py-4 text-base font-black text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-orange-700 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:translate-y-0'
            >
              {loading
                ? '⏳ Processing Payment...'
                : orderType === 'Scheduled'
                ? `⏰ Pay ₹${finalAmount.toFixed(2)} & Schedule Order`
                : `💳 Pay ₹${finalAmount.toFixed(2)} & Place Order`}
            </button>

            {/* BACK TO CART */}

            <button
              type='button'
              onClick={() => navigate('/cart')}
              disabled={loading}
              className='mt-4 w-full rounded-2xl border border-gray-200 px-6 py-3.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              ← Back to Cart
            </button>
          </form>
        </div>

        {/* TRUST FEATURES */}

        <div className='mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3'>
          <div className='rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm'>
            <div className='text-xl'>🔒</div>

            <p className='mt-1 text-xs font-bold text-gray-600'>
              Secure Payment
            </p>
          </div>

          <div className='rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm'>
            <div className='text-xl'>⏰</div>

            <p className='mt-1 text-xs font-bold text-gray-600'>
              Flexible Ordering
            </p>
          </div>

          <div className='rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm'>
            <div className='text-xl'>🪙</div>

            <p className='mt-1 text-xs font-bold text-gray-600'>
              Loyalty Rewards
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ======================================================
// EXPORT
// ======================================================

export default Checkout
