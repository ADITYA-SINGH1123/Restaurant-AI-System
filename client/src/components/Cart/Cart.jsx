import { useState } from "react";
import { Link } from "react-router-dom";

function Cart() {
  // LocalStorage se cart items load karna
  const [cartItems, setCartItems] = useState(() => {
    return JSON.parse(localStorage.getItem("cart")) || [];
  });

  // Item remove karna
  const removeItem = (index) => {
    const newCart = cartItems.filter((_, i) => i !== index);

    setCartItems(newCart);

    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  // Total price
  const totalPrice = cartItems.reduce((total, item) => total + item.price, 0);

  return (
    <section className="min-h-screen bg-orange-50 px-6 py-12">
      {/* Cart Heading */}
      <h2 className="text-3xl font-bold text-gray-900 text-center">
        🛒 Your Cart
      </h2>

      {/* Empty Cart */}
      {cartItems.length === 0 ? (
        <div className="mt-10 mx-auto max-w-2xl rounded-xl bg-white p-10 text-center shadow-md">
          <div className="text-5xl mb-4">🛒</div>

          <h3 className="text-2xl font-bold text-gray-800">
            Your cart is empty
          </h3>

          <p className="mt-2 text-gray-500">
            Add your favorite food items from the menu.
          </p>

          <Link
            to="/menu"
            className="inline-block mt-6 rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700"
          >
            🍴 Explore Menu
          </Link>
        </div>
      ) : (
        /* Cart Items */
        <div className="max-w-3xl mx-auto mt-10">
          {cartItems.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md p-5 mb-4 flex items-center justify-between"
            >
              {/* Food Information */}
              <div className="flex items-center gap-5">
                <div className="text-5xl">{item.icon}</div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {item.name}
                  </h3>

                  <p className="text-gray-500">{item.description}</p>

                  <p className="text-orange-600 font-bold mt-2">
                    ₹{item.price}
                  </p>
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => removeItem(index)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          ))}

          {/* Total */}
          <div className="bg-white rounded-xl shadow-md p-6 mt-6">
            <div className="flex justify-between text-2xl font-bold">
              <span>Total:</span>

              <span className="text-orange-600">₹{totalPrice}</span>
            </div>

            {/* Proceed to Order */}
            <Link
              to="/checkout"
              className="block w-full mt-5 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 text-center"
            >
              🛍️ Proceed to Order
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

export default Cart;
