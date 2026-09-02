import { useState } from "react";

// Order Success component
function OrderSuccess() {
  // Order ID ko LocalStorage se load karna
  // Agar ID nahi hai to new ID generate hogi
  const [orderId] = useState(() => {
    const savedOrderId = localStorage.getItem("lastOrderId");

    if (savedOrderId) {
      return savedOrderId;
    }

    const newOrderId = "AI-" + Math.floor(100000 + Math.random() * 900000);

    localStorage.setItem("lastOrderId", newOrderId);

    return newOrderId;
  });

  // Home page par jana
  const goToHome = () => {
    window.location.href = "/";
  };

  return (
    <section className="min-h-screen bg-orange-50 px-6 py-12">
      {/* Success Box */}
      <div className="max-w-2xl mx-auto mt-10 bg-white rounded-xl shadow-md p-10 text-center">
        {/* Success Icon */}
        <div className="text-6xl mb-5">✅</div>

        {/* Heading */}
        <h2 className="text-3xl font-bold text-green-600">Order Confirmed!</h2>

        {/* Message */}
        <p className="text-gray-600 mt-3">Thank you for your order.</p>

        <p className="text-gray-500 mt-2">
          Your delicious food will be delivered soon.
        </p>

        {/* Order ID */}
        <div className="mt-6 bg-orange-50 rounded-lg p-4">
          <p className="text-gray-600 font-semibold">Order ID</p>

          <p className="text-xl font-bold text-orange-600 mt-1">#{orderId}</p>
        </div>

        {/* Home Button */}
        <button
          onClick={goToHome}
          className="mt-6 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
        >
          🏠 Back to Home
        </button>
      </div>
    </section>
  );
}

export default OrderSuccess;
