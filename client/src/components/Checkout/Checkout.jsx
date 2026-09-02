import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Checkout() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  // ===============================
  // LOAD RAZORPAY SCRIPT
  // ===============================
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
      );

      if (existingScript) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");

      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);

      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  // ===============================
  // PLACE ORDER + PAYMENT
  // ===============================
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (loading) return;

    // ===============================
    // CHECK FORM
    // ===============================
    if (!name.trim() || !phone.trim() || !address.trim()) {
      alert("Please fill all details.");
      return;
    }

    // ===============================
    // GET CART
    // ===============================
    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];

    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      navigate("/menu");
      return;
    }

    // ===============================
    // GET USER
    // ===============================
    const loggedInUser =
      JSON.parse(localStorage.getItem("loggedInUser")) || null;

    const token = localStorage.getItem("token");

    if (!loggedInUser || !loggedInUser.id || !token) {
      alert("Please login before placing an order.");
      navigate("/login");
      return;
    }

    // ===============================
    // CALCULATE TOTAL
    // ===============================
    const totalAmount = cartItems.reduce(
      (total, item) => total + Number(item.price),
      0,
    );

    try {
      setLoading(true);

      // ===============================
      // LOAD RAZORPAY
      // ===============================
      const razorpayLoaded = await loadRazorpayScript();

      if (!razorpayLoaded) {
        alert("❌ Razorpay failed to load.");
        setLoading(false);
        return;
      }

      // ===============================
      // CREATE RAZORPAY ORDER
      // ===============================
      const paymentResponse = await fetch(
        "http://localhost:5000/api/payment/create-order",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            amount: totalAmount,
          }),
        },
      );

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        alert(paymentData.message || "Failed to create payment order.");

        setLoading(false);
        return;
      }

      const razorpayOrder = paymentData.order;

      // ===============================
      // RAZORPAY CHECKOUT OPTIONS
      // ===============================
      const options = {
        // IMPORTANT:
        // Yahan sirf Razorpay TEST KEY ID
        // Secret Key yahan mat lagana.
        key: "rzp_test_TWjtXC1GAQHqTQ",

        amount: razorpayOrder.amount,

        currency: razorpayOrder.currency,

        name: "AI Restaurant",

        description: "Restaurant Food Order",

        order_id: razorpayOrder.id,

        prefill: {
          name: name.trim(),
          contact: phone.trim(),
        },

        theme: {
          color: "#ea580c",
        },

        // ===============================
        // PAYMENT SUCCESS
        // ===============================
        handler: async function (paymentResponse) {
          try {
            console.log("Payment successful:", paymentResponse);

            // ===============================
            // STEP 1: VERIFY PAYMENT
            // ===============================
            const verifyResponse = await fetch(
              "http://localhost:5000/api/payment/verify",
              {
                method: "POST",

                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },

                body: JSON.stringify({
                  razorpay_order_id: paymentResponse.razorpay_order_id,

                  razorpay_payment_id: paymentResponse.razorpay_payment_id,

                  razorpay_signature: paymentResponse.razorpay_signature,
                }),
              },
            );

            const verifyData = await verifyResponse.json();

            // ===============================
            // VERIFICATION FAILED
            // ===============================
            if (!verifyResponse.ok || !verifyData.success) {
              alert(verifyData.message || "❌ Payment verification failed.");

              setLoading(false);
              return;
            }

            console.log("✅ Payment verified successfully.");

            // ===============================
            // STEP 2: CREATE DATABASE ORDER
            // ===============================
            const orderResponse = await fetch(
              "http://localhost:5000/api/orders/create",
              {
                method: "POST",

                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },

                body: JSON.stringify({
                  name: name.trim(),

                  phone: phone.trim(),

                  address: address.trim(),

                  items: cartItems,

                  totalAmount: totalAmount,

                  paymentId: paymentResponse.razorpay_payment_id,

                  razorpayOrderId: paymentResponse.razorpay_order_id,

                  razorpaySignature: paymentResponse.razorpay_signature,
                }),
              },
            );

            const orderData = await orderResponse.json();

            // ===============================
            // ORDER CREATION FAILED
            // ===============================
            if (!orderResponse.ok) {
              alert(
                orderData.message ||
                  "Payment verified but order creation failed.",
              );

              setLoading(false);
              return;
            }

            // ===============================
            // SAVE ORDER
            // ===============================
            const order = orderData.order;

            localStorage.setItem("lastOrder", JSON.stringify(order));

            localStorage.setItem("lastOrderId", order.orderId);

            // ===============================
            // CLEAR CART
            // ===============================
            localStorage.removeItem("cart");

            // ===============================
            // SUCCESS
            // ===============================
            alert("✅ Payment verified! Order placed successfully!");

            navigate("/order-success");
          } catch (error) {
            console.error("Payment verification/order error:", error);

            alert("❌ Payment was successful, but order verification failed.");

            setLoading(false);
          }
        },

        // ===============================
        // PAYMENT POPUP CLOSED
        // ===============================
        modal: {
          ondismiss: function () {
            setLoading(false);

            alert("❌ Payment cancelled.");
          },
        },
      };

      // ===============================
      // OPEN RAZORPAY
      // ===============================
      const razorpay = new window.Razorpay(options);

      // ===============================
      // PAYMENT FAILED
      // ===============================
      razorpay.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);

        alert(
          `❌ Payment failed: ${
            response.error?.description || "Please try again."
          }`,
        );

        setLoading(false);
      });

      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);

      alert(
        "❌ Cannot connect to payment server. Please make sure backend is running.",
      );

      setLoading(false);
    }
  };

  // ===============================
  // PAGE
  // ===============================
  return (
    <section className="min-h-screen bg-orange-50 px-6 py-12">
      <h2 className="text-3xl font-bold text-gray-900 text-center">
        🛍️ Checkout
      </h2>

      <form
        onSubmit={handlePlaceOrder}
        className="max-w-2xl mx-auto mt-10 bg-white rounded-xl shadow-md p-8"
      >
        <h3 className="text-2xl font-bold text-gray-800">
          Complete Your Order
        </h3>

        <p className="text-gray-500 mt-2">
          Enter your delivery details and continue to payment.
        </p>

        {/* Full Name */}
        <div className="mt-6">
          <label className="block font-semibold text-gray-700 mb-2">
            Full Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Phone */}
        <div className="mt-4">
          <label className="block font-semibold text-gray-700 mb-2">
            Phone Number
          </label>

          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Address */}
        <div className="mt-4">
          <label className="block font-semibold text-gray-700 mb-2">
            Delivery Address
          </label>

          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your full address"
            rows="4"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Payment Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "⏳ Processing..." : "💳 Pay & Place Order"}
        </button>
      </form>
    </section>
  );
}

export default Checkout;
