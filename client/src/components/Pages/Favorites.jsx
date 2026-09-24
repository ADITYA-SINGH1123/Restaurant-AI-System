// ======================================================
// FAVORITES PAGE
// ======================================================
// Ye page logged-in customer ke favorite foods dikhayega.
//
// Features:
// 1. Customer ke favorites backend se load honge
// 2. Favorite food ki image, name, price, category dikhegi
// 3. Remove Favorite
// 4. View Details
// 5. Add to Cart
// 6. Login protection
// ======================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Favorites() {
  // ======================================================
  // STATES
  // ======================================================

  // Backend se favorites store karne ke liye
  const [favorites, setFavorites] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(true);

  // Error message
  const [error, setError] = useState("");

  // Remove favorite loading
  const [removingId, setRemovingId] = useState("");

  // Add to cart loading
  const [addingId, setAddingId] = useState("");

  // Success message
  const [cartMessage, setCartMessage] = useState("");

  // Navigation
  const navigate = useNavigate();

  // ======================================================
  // GET FAVORITES
  // ======================================================

  useEffect(() => {
    const fetchFavorites = async () => {
      // LocalStorage se JWT token lena
      const token = localStorage.getItem("token");

      // Token nahi hai to login page
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Backend se current user's favorites
        const response = await fetch("http://localhost:5000/api/favorites", {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        // Backend error
        if (!response.ok) {
          throw new Error(data.message || "Failed to load favorites");
        }

        // Favorites state
        setFavorites(data.favorites || []);
      } catch (error) {
        console.error("Favorites error:", error);

        setError(
          error.message || "Something went wrong while loading favorites.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [navigate]);

  // ======================================================
  // ADD TO CART
  // ======================================================

  const addToCart = (food) => {
    try {
      // Button loading state
      setAddingId(food._id);

      // Existing cart read karna
      const savedCart = JSON.parse(localStorage.getItem("cart")) || [];

      // Check karo food already cart mein hai ya nahi
      const existingItemIndex = savedCart.findIndex(
        (item) => String(item._id) === String(food._id),
      );

      let updatedCart;

      // ==================================================
      // FOOD ALREADY IN CART
      // ==================================================

      if (existingItemIndex !== -1) {
        updatedCart = [...savedCart];

        // Existing quantity +1
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: (updatedCart[existingItemIndex].quantity || 1) + 1,
        };
      }

      // ==================================================
      // NEW FOOD
      // ==================================================
      else {
        updatedCart = [
          ...savedCart,
          {
            ...food,
            quantity: 1,
          },
        ];
      }

      // Cart save karna
      localStorage.setItem("cart", JSON.stringify(updatedCart));

      // Success message
      setCartMessage(`${food.name} added to cart successfully!`);

      // Message kuch seconds baad hide
      setTimeout(() => {
        setCartMessage("");
      }, 2500);
    } catch (error) {
      console.error("Add to cart error:", error);

      alert("Unable to add food to cart.");
    } finally {
      setAddingId("");
    }
  };

  // ======================================================
  // REMOVE FAVORITE
  // ======================================================

  const removeFavorite = async (foodId) => {
    const token = localStorage.getItem("token");

    // Safety check
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setRemovingId(foodId);

      // Backend se favorite delete
      const response = await fetch(
        `http://localhost:5000/api/favorites/${foodId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove favorite");
      }

      // UI se favorite remove
      setFavorites((previousFavorites) =>
        previousFavorites.filter(
          (favorite) => String(favorite.foodId?._id) !== String(foodId),
        ),
      );
    } catch (error) {
      console.error("Remove favorite error:", error);

      alert(error.message || "Failed to remove favorite.");
    } finally {
      setRemovingId("");
    }
  };

  // ======================================================
  // LOADING SCREEN
  // ======================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="text-5xl">❤️</div>

          <p className="mt-4 text-lg font-bold text-gray-700">
            Loading Favorites...
          </p>
        </div>
      </div>
    );
  }

  // ======================================================
  // MAIN PAGE
  // ======================================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50 px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-600">
            RK Restaurant
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            ❤️ My Favorites
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500">
            Your favorite foods are saved here. Add them to your cart whenever
            you are ready to order.
          </p>
        </div>

        {/* ==================================================
            CART SUCCESS MESSAGE
        ================================================== */}

        {cartMessage && (
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-center text-sm font-bold text-green-700 shadow-sm">
            ✅ {cartMessage}
          </div>
        )}

        {/* ==================================================
            ERROR MESSAGE
        ================================================== */}

        {error && (
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center text-sm font-bold text-red-600">
            ❌ {error}
          </div>
        )}

        {/* ==================================================
            EMPTY FAVORITES
        ================================================== */}

        {!error && favorites.length === 0 && (
          <div className="mx-auto mt-12 max-w-3xl rounded-[2rem] border border-orange-100 bg-white px-6 py-16 text-center shadow-xl">
            {/* Empty heart */}
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 text-5xl">
              💔
            </div>

            <h2 className="mt-7 text-3xl font-black text-gray-900">
              No Favorites Yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              Add your favorite foods using the ❤️ button and they will appear
              here.
            </p>

            {/* Explore menu */}
            <button
              onClick={() => navigate("/menu")}
              className="mt-8 rounded-full bg-orange-600 px-8 py-3.5 font-black text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-orange-700 hover:shadow-xl"
            >
              🍴 Explore Menu
            </button>
          </div>
        )}

        {/* ==================================================
            FAVORITES GRID
        ================================================== */}

        {favorites.length > 0 && (
          <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((favorite) => {
              // Populated Food object
              const food = favorite.foodId;

              // Safety check
              if (!food) return null;

              return (
                <div
                  key={favorite._id}
                  className="group overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* ==================================================
                      FOOD IMAGE
                  ================================================== */}

                  <div className="relative h-52 overflow-hidden bg-orange-50">
                    {food.image ? (
                      <img
                        src={food.image}
                        alt={food.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                        onError={(event) => {
                          // Image load fail hone par hide
                          event.currentTarget.style.display = "none";

                          // Fallback icon show
                          const fallback =
                            event.currentTarget.nextElementSibling;

                          if (fallback) {
                            fallback.style.display = "flex";
                          }
                        }}
                      />
                    ) : null}

                    {/* Fallback icon */}
                    <div
                      className={`absolute inset-0 items-center justify-center ${
                        food.image ? "hidden" : "flex"
                      }`}
                    >
                      <span className="text-7xl">{food.icon || "🍽️"}</span>
                    </div>

                    {/* Favorite badge */}
                    <div className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-xl shadow-md">
                      ❤️
                    </div>

                    {/* Category */}
                    <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-orange-700 shadow">
                      {food.category}
                    </div>
                  </div>

                  {/* ==================================================
                      FOOD INFORMATION
                  ================================================== */}

                  <div className="p-5">
                    {/* Food name */}
                    <h2 className="truncate text-xl font-black text-gray-900">
                      {food.name}
                    </h2>

                    {/* Description */}
                    {food.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-500">
                        {food.description}
                      </p>
                    )}

                    {/* Price */}
                    <p className="mt-4 text-2xl font-black text-orange-600">
                      ₹{food.price}
                    </p>

                    {/* ==================================================
                        ACTION BUTTONS
                    ================================================== */}

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      {/* View Details */}
                      <button
                        onClick={() => navigate(`/food/${food._id}`)}
                        className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs font-black text-orange-700 transition hover:bg-orange-100"
                      >
                        👁️ Details
                      </button>

                      {/* Remove */}
                      <button
                        onClick={() => removeFavorite(food._id)}
                        disabled={removingId === food._id}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingId === food._id ? "Removing..." : "🗑️ Remove"}
                      </button>
                    </div>

                    {/* ==================================================
                        ADD TO CART
                    ================================================== */}

                    <button
                      onClick={() => addToCart(food)}
                      disabled={addingId === food._id}
                      className="mt-3 flex w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white shadow-md transition duration-300 hover:bg-orange-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addingId === food._id ? "Adding..." : "🛒 Add to Cart"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ==================================================
            GO TO CART
        ================================================== */}

        {favorites.length > 0 && (
          <div className="mt-10 text-center">
            <button
              onClick={() => navigate("/cart")}
              className="rounded-full border border-orange-200 bg-white px-7 py-3 font-black text-orange-700 shadow-sm transition hover:bg-orange-50"
            >
              🛒 View Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ======================================================
// EXPORT COMPONENT
// ======================================================

export default Favorites;
