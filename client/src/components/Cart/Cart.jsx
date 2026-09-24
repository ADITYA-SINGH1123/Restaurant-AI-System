import { useState } from "react";
import { Link } from "react-router-dom";

// ======================================================
// CART COMPONENT
// ======================================================
// Features:
// 1. Cart items show
// 2. Quantity increase/decrease
// 3. Remove item
// 4. Item subtotal
// 5. Grand total
// 6. Proceed to checkout
// 7. Premium responsive UI
// 8. Combo offer image fallback
// ======================================================

function Cart() {
  // ======================================================
  // CART STATE
  // ======================================================

  // LocalStorage se cart load karna
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart")) || [];

    // Purane items mein quantity missing ho to 1
    return savedCart.map((item) => ({
      ...item,
      quantity: item.quantity || 1,
    }));
  });

  // ======================================================
  // GET CART ITEM IMAGE
  // ======================================================
  // Priority:
  // 1. Item ki own image
  // 2. Combo ke first available food ki image
  // 3. Empty -> fallback icon
  // ======================================================

  const getCartItemImage = (item) => {
    // ----------------------------------------------------
    // Direct item image
    // ----------------------------------------------------

    if (typeof item?.image === "string" && item.image.trim()) {
      return item.image.trim();
    }

    // ----------------------------------------------------
    // Combo image fallback
    // ----------------------------------------------------
    // Agar combo ki own image nahi hai,
    // to combo ke included food ki image use karenge.

    if (
      item?.itemType === "combo" ||
      item?.comboId ||
      String(item?._id || "").startsWith("combo-")
    ) {
      if (Array.isArray(item.items)) {
        for (const comboItem of item.items) {
          const food = comboItem?.foodId;

          // Backend populated food object
          if (
            food &&
            typeof food === "object" &&
            typeof food.image === "string" &&
            food.image.trim()
          ) {
            return food.image.trim();
          }
        }
      }
    }

    // ----------------------------------------------------
    // No image
    // ----------------------------------------------------

    return "";
  };

  // ======================================================
  // SAVE CART
  // ======================================================

  const saveCart = (newCart) => {
    // React state update
    setCartItems(newCart);

    // LocalStorage update
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  // ======================================================
  // INCREASE QUANTITY
  // ======================================================

  const increaseQuantity = (index) => {
    const newCart = [...cartItems];

    // Quantity +1
    newCart[index].quantity += 1;

    saveCart(newCart);
  };

  // ======================================================
  // DECREASE QUANTITY
  // ======================================================

  const decreaseQuantity = (index) => {
    const newCart = [...cartItems];

    // Quantity minimum 1
    if (newCart[index].quantity > 1) {
      newCart[index].quantity -= 1;
    }

    saveCart(newCart);
  };

  // ======================================================
  // REMOVE ITEM
  // ======================================================

  const removeItem = (index) => {
    const newCart = cartItems.filter((_, itemIndex) => itemIndex !== index);

    saveCart(newCart);
  };

  // ======================================================
  // TOTAL PRICE
  // ======================================================

  const totalPrice = cartItems.reduce(
    (total, item) => total + Number(item.price || 0) * item.quantity,
    0,
  );

  // ======================================================
  // TOTAL ITEMS
  // ======================================================

  const totalItems = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  // ======================================================
  // EMPTY CART
  // ======================================================

  if (cartItems.length === 0) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          {/* Page heading */}
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-600">
              RK Restaurant
            </p>

            <h1 className="mt-3 text-4xl font-black text-gray-900 sm:text-5xl">
              Your Cart
            </h1>
          </div>

          {/* Empty cart card */}
          <div className="mt-12 rounded-[2rem] border border-orange-100 bg-white px-6 py-16 text-center shadow-xl">
            {/* Cart icon */}
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 text-5xl">
              🛒
            </div>

            {/* Heading */}
            <h2 className="mt-7 text-3xl font-black text-gray-900">
              Your cart is empty
            </h2>

            {/* Description */}
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              Looks like you haven't added anything yet. Explore our delicious
              menu and choose your favorite food.
            </p>

            {/* Menu button */}
            <Link
              to="/menu"
              className="mt-8 inline-flex items-center rounded-full bg-orange-600 px-8 py-3.5 font-black text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-orange-700 hover:shadow-xl"
            >
              🍴 Explore Menu
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // ======================================================
  // MAIN CART
  // ======================================================

  return (
    <section className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50 px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-600">
            RK Restaurant
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            Your Cart
          </h1>

          <p className="mt-4 text-sm text-gray-500">
            {totalItems} {totalItems === 1 ? "item" : "items"} ready for
            checkout
          </p>
        </div>

        {/* ==================================================
            CART LAYOUT
        ================================================== */}

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* ==================================================
              CART ITEMS
          ================================================== */}

          <div className="space-y-5">
            {cartItems.map((item, index) => {
              // Combo ke liye included food image bhi check karega.
              const itemImage = getCartItemImage(item);

              const isCombo =
                item?.itemType === "combo" ||
                Boolean(item?.comboId) ||
                String(item?._id || "").startsWith("combo-");

              return (
                <div
                  key={item._id || index}
                  className="group overflow-hidden rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    {/* ==================================================
                        FOOD / COMBO IMAGE
                    ================================================== */}

                    <div className="relative h-28 w-full flex-shrink-0 overflow-hidden rounded-2xl bg-orange-50 sm:h-28 sm:w-28">
                      {itemImage ? (
                        <img
                          src={itemImage}
                          alt={item.name || "Food item"}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                          onError={(event) => {
                            // Broken image hone par hide karo.
                            event.currentTarget.style.display = "none";

                            // Fallback icon show karo.
                            const fallback =
                              event.currentTarget.nextElementSibling;

                            if (fallback) {
                              fallback.style.display = "flex";
                            }
                          }}
                        />
                      ) : null}

                      {/* ==================================================
                          FALLBACK ICON
                      ================================================== */}

                      <div
                        className={`h-full w-full items-center justify-center ${
                          itemImage ? "hidden" : "flex"
                        }`}
                      >
                        <span className="text-5xl">
                          {isCombo ? "🎁" : item.icon || "🍽️"}
                        </span>
                      </div>

                      {/* ==================================================
                          CATEGORY / COMBO BADGE
                      ================================================== */}

                      <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-orange-700 shadow">
                        {isCombo ? "🎁 Combo" : item.category || "Food"}
                      </div>
                    </div>

                    {/* ==================================================
                        FOOD INFORMATION
                    ================================================== */}

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-xl font-black text-gray-900">
                        {item.name}
                      </h2>

                      <p className="mt-1 text-sm font-semibold text-gray-400">
                        ₹{item.price} per item
                      </p>

                      {/* Combo original price */}
                      {isCombo &&
                        Number(item.originalPrice || 0) >
                          Number(item.price || 0) && (
                          <p className="mt-1 text-xs font-bold text-gray-400 line-through">
                            Original ₹{item.originalPrice}
                          </p>
                        )}

                      {/* Item subtotal */}
                      <p className="mt-3 text-lg font-black text-orange-600">
                        ₹{item.price * item.quantity}
                      </p>
                    </div>

                    {/* ==================================================
                        QUANTITY
                    ================================================== */}

                    <div className="flex items-center justify-between gap-5 sm:block">
                      <div>
                        <p className="mb-2 text-center text-xs font-bold text-gray-400">
                          Quantity
                        </p>

                        <div className="flex items-center overflow-hidden rounded-xl border border-orange-100 bg-orange-50">
                          {/* Minus */}
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(index)}
                            className="flex h-10 w-10 items-center justify-center text-xl font-black text-gray-700 transition hover:bg-orange-100 hover:text-orange-600"
                            aria-label={`Decrease ${item.name}`}
                          >
                            −
                          </button>

                          {/* Quantity */}
                          <span className="flex h-10 min-w-10 items-center justify-center bg-white px-2 text-sm font-black text-gray-900">
                            {item.quantity}
                          </span>

                          {/* Plus */}
                          <button
                            type="button"
                            onClick={() => increaseQuantity(index)}
                            className="flex h-10 w-10 items-center justify-center text-xl font-black text-orange-600 transition hover:bg-orange-100"
                            aria-label={`Increase ${item.name}`}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded-xl px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Continue shopping */}
            <div className="pt-2">
              <Link
                to="/menu"
                className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-orange-600"
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>

          {/* ==================================================
              ORDER SUMMARY
          ================================================== */}

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-xl sm:p-7">
              {/* Summary heading */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-900">
                  Order Summary
                </h2>

                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                  {totalItems} items
                </span>
              </div>

              {/* Divider */}
              <div className="my-6 h-px bg-gray-100"></div>

              {/* Items total */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Items</span>

                <span className="font-bold text-gray-900">{totalItems}</span>
              </div>

              {/* Food subtotal */}
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>

                <span className="font-bold text-gray-900">₹{totalPrice}</span>
              </div>

              {/* Delivery */}
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-gray-500">Delivery</span>

                <span className="font-bold text-green-600">Free</span>
              </div>

              {/* Divider */}
              <div className="my-6 h-px bg-gray-100"></div>

              {/* Grand total */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-black text-gray-900">Total</span>

                <span className="text-2xl font-black text-orange-600">
                  ₹{totalPrice}
                </span>
              </div>

              {/* Checkout */}
              <Link
                to="/checkout"
                className="mt-7 flex w-full items-center justify-center rounded-2xl bg-orange-600 px-6 py-4 text-sm font-black text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-orange-700 hover:shadow-xl"
              >
                🛍️ Proceed to Checkout
              </Link>

              {/* Secure payment message */}
              <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-center">
                <p className="text-xs font-bold text-gray-600">
                  🔒 Secure & Easy Checkout
                </p>

                <p className="mt-1 text-[11px] text-gray-400">
                  Pay securely using our payment system.
                </p>
              </div>
            </div>

            {/* Trust information */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <div className="text-xl">⚡</div>

                <p className="mt-1 text-xs font-bold text-gray-600">
                  Fast Ordering
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <div className="text-xl">🍴</div>

                <p className="mt-1 text-xs font-bold text-gray-600">
                  Fresh Food
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ======================================================
// EXPORT COMPONENT
// ======================================================

export default Cart;
