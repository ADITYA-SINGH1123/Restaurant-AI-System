import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

// ======================================================
// FOOD DETAILS COMPONENT
// ======================================================
// Is page par customer:
// 1. Food ki image dekh sakta hai
// 2. Food ka naam, description aur price dekh sakta hai
// 3. Quantity increase/decrease kar sakta hai
// 4. Food ko cart mein add kar sakta hai
// 5. Food ko Favorites mein add/remove kar sakta hai
// 6. Food ki rating aur reviews dekh sakta hai
// 7. Login hone par review submit kar sakta hai
// ======================================================

function FoodDetails() {
  // URL se food ID lena
  const { id } = useParams();

  // Page navigation
  const navigate = useNavigate();

  // ======================================================
  // FOOD STATES
  // ======================================================

  const [food, setFood] = useState(null);

  // Quantity
  const [quantity, setQuantity] = useState(1);

  // Food loading
  const [loading, setLoading] = useState(true);

  // Food error
  const [error, setError] = useState("");

  // ======================================================
  // FAVORITE STATES
  // ======================================================

  // Food favorite hai ya nahi
  const [isFavorite, setIsFavorite] = useState(false);

  // Favorite button loading
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Favorite success/error message
  const [favoriteMessage, setFavoriteMessage] = useState("");

  // ======================================================
  // REVIEW STATES
  // ======================================================

  const [reviews, setReviews] = useState([]);

  const [averageRating, setAverageRating] = useState(0);

  const [totalReviews, setTotalReviews] = useState(0);

  const [reviewRating, setReviewRating] = useState(5);

  const [reviewComment, setReviewComment] = useState("");

  const [reviewLoading, setReviewLoading] = useState(false);

  const [reviewError, setReviewError] = useState("");

  const [reviewSuccess, setReviewSuccess] = useState("");

  // ======================================================
  // CHECK CURRENT USER
  // ======================================================

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

  // ======================================================
  // FETCH FOOD DETAILS
  // ======================================================

  useEffect(() => {
    const fetchFoodDetails = async () => {
      try {
        setLoading(true);
        setError("");

        // Backend se specific food fetch karna
        const response = await fetch(`http://localhost:5000/api/foods/${id}`);

        if (!response.ok) {
          throw new Error("Food not found");
        }

        // Backend response read karna
        const data = await response.json();

        // Backend response:
        // { success: true, food: {...} }
        setFood(data.food);
      } catch (err) {
        console.error("Food details error:", err);

        setError("Food details load nahi ho payi.");
      } finally {
        setLoading(false);
      }
    };

    fetchFoodDetails();
  }, [id]);

  // ======================================================
  // CHECK FAVORITE STATUS
  // ======================================================
  // Login user ke liye backend se check karenge ki
  // current food favorite hai ya nahi.
  // ======================================================

  useEffect(() => {
    const checkFavorite = async () => {
      // Login nahi hai to favorite check nahi karna
      const token = localStorage.getItem("token");

      if (!token) {
        setIsFavorite(false);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/favorites/check/${id}`,
          {
            headers: {
              // JWT authentication
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (response.ok && data.success) {
          setIsFavorite(Boolean(data.isFavorite));
        }
      } catch (err) {
        console.error("Favorite status error:", err);
      }
    };

    checkFavorite();
  }, [id]);

  // ======================================================
  // TOGGLE FAVORITE
  // ======================================================
  // Favorite nahi hai -> Add
  // Favorite hai -> Remove
  // ======================================================

  const toggleFavorite = async () => {
    // Login token
    const token = localStorage.getItem("token");

    // Login required
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setFavoriteLoading(true);
      setFavoriteMessage("");

      // ==================================================
      // REMOVE FAVORITE
      // ==================================================

      if (isFavorite) {
        const response = await fetch(
          `http://localhost:5000/api/favorites/${id}`,
          {
            method: "DELETE",

            headers: {
              // JWT authentication
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to remove favorite.");
        }

        // UI update
        setIsFavorite(false);

        setFavoriteMessage("Removed from favorites.");
      } else {
        // ==================================================
        // ADD FAVORITE
        // ==================================================

        const response = await fetch("http://localhost:5000/api/favorites", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            // JWT authentication
            Authorization: `Bearer ${token}`,
          },

          // Food ID send karo
          body: JSON.stringify({
            foodId: id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to add favorite.");
        }

        // UI update
        setIsFavorite(true);

        setFavoriteMessage("Added to favorites! ❤️");
      }
    } catch (err) {
      console.error("Toggle favorite error:", err);

      setFavoriteMessage(err.message || "Favorite update failed.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  // ======================================================
  // FETCH REVIEWS
  // ======================================================

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/reviews/food/${id}`,
        );

        if (!response.ok) {
          throw new Error("Reviews not found");
        }

        const data = await response.json();

        if (data.success) {
          setReviews(data.reviews || []);
          setAverageRating(data.averageRating || 0);
          setTotalReviews(data.totalReviews || 0);
        }
      } catch (err) {
        console.error("Reviews fetch error:", err);

        // Reviews fail hone par food page ko break nahi karna.
        setReviews([]);
        setAverageRating(0);
        setTotalReviews(0);
      }
    };

    fetchReviews();
  }, [id]);

  // ======================================================
  // INCREASE QUANTITY
  // ======================================================

  const increaseQuantity = () => {
    setQuantity((previousQuantity) => previousQuantity + 1);
  };

  // ======================================================
  // DECREASE QUANTITY
  // ======================================================

  const decreaseQuantity = () => {
    // Quantity minimum 1 rahegi
    setQuantity((previousQuantity) =>
      previousQuantity > 1 ? previousQuantity - 1 : 1,
    );
  };

  // ======================================================
  // ADD TO CART
  // ======================================================

  const addToCart = () => {
    if (!food) {
      return;
    }

    // Existing cart read karna
    const existingCart = JSON.parse(localStorage.getItem("cart")) || [];

    // Check food already cart mein hai ya nahi
    const existingIndex = existingCart.findIndex(
      (item) => item._id === food._id,
    );

    let updatedCart;

    if (existingIndex !== -1) {
      // Existing food ki quantity mein selected quantity add karna
      updatedCart = existingCart.map((item, index) => {
        if (index === existingIndex) {
          return {
            ...item,
            quantity: (item.quantity || 1) + quantity,
          };
        }

        return item;
      });
    } else {
      // New food cart mein add karna
      updatedCart = [
        ...existingCart,
        {
          ...food,
          quantity,
        },
      ];
    }

    // Cart save karna
    localStorage.setItem("cart", JSON.stringify(updatedCart));

    // Success message
    alert(`${food.name} added to cart! 🛒`);

    // Cart page par jaana
    navigate("/cart");
  };

  // ======================================================
  // SUBMIT REVIEW
  // ======================================================

  const submitReview = async (event) => {
    event.preventDefault();

    // Old messages clear karna
    setReviewError("");
    setReviewSuccess("");

    // Login token lena
    const token = localStorage.getItem("token");

    // Login required
    if (!token) {
      setReviewError("Please login first to submit a review.");

      return;
    }

    // Empty comment check
    if (!reviewComment.trim()) {
      setReviewError("Please write a review.");

      return;
    }

    try {
      setReviewLoading(true);

      // Review API call
      const response = await fetch("http://localhost:5000/api/reviews", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          // JWT authentication
          Authorization: `Bearer ${token}`,
        },

        // Review data
        body: JSON.stringify({
          foodId: id,
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
      });

      const data = await response.json();

      // API error
      if (!response.ok) {
        throw new Error(data.message || "Failed to submit review.");
      }

      // Success message
      setReviewSuccess("Review added successfully! ⭐");

      // Form clear
      setReviewComment("");
      setReviewRating(5);

      // Latest review list dobara fetch karna
      const reviewsResponse = await fetch(
        `http://localhost:5000/api/reviews/food/${id}`,
      );

      const reviewsData = await reviewsResponse.json();

      if (reviewsData.success) {
        setReviews(reviewsData.reviews || []);
        setAverageRating(reviewsData.averageRating || 0);
        setTotalReviews(reviewsData.totalReviews || 0);
      }
    } catch (err) {
      console.error("Submit review error:", err);

      setReviewError(err.message || "Review submit nahi ho paya.");
    } finally {
      setReviewLoading(false);
    }
  };

  // ======================================================
  // DELETE REVIEW
  // ======================================================

  const deleteReview = async (reviewId) => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    // Confirmation
    const confirmed = window.confirm(
      "Are you sure you want to delete this review?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/reviews/${reviewId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete review.");
      }

      // Reviews dobara fetch karna
      const reviewsResponse = await fetch(
        `http://localhost:5000/api/reviews/food/${id}`,
      );

      const reviewsData = await reviewsResponse.json();

      if (reviewsData.success) {
        setReviews(reviewsData.reviews || []);
        setAverageRating(reviewsData.averageRating || 0);
        setTotalReviews(reviewsData.totalReviews || 0);
      }

      setReviewSuccess("Review deleted successfully.");
    } catch (err) {
      console.error("Delete review error:", err);

      setReviewError(err.message || "Review delete nahi ho paya.");
    }
  };

  // ======================================================
  // LOADING SCREEN
  // ======================================================

  if (loading) {
    return (
      <section className="flex min-h-[80vh] items-center justify-center bg-orange-50">
        <div className="text-center">
          {/* Loading spinner */}
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600"></div>

          <p className="mt-5 font-semibold text-gray-600">
            Loading food details...
          </p>
        </div>
      </section>
    );
  }

  // ======================================================
  // ERROR SCREEN
  // ======================================================

  if (error || !food) {
    return (
      <section className="flex min-h-[80vh] items-center justify-center bg-orange-50 px-6">
        <div className="max-w-md rounded-3xl bg-white p-10 text-center shadow-xl">
          {/* Error icon */}
          <div className="text-6xl">🍽️</div>

          <h2 className="mt-5 text-2xl font-black text-gray-900">
            Food Not Found
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            {error || "This food item is currently unavailable."}
          </p>

          <Link
            to="/menu"
            className="mt-7 inline-block rounded-full bg-orange-600 px-7 py-3 font-bold text-white transition hover:bg-orange-700"
          >
            ← Back to Menu
          </Link>
        </div>
      </section>
    );
  }

  // ======================================================
  // TOTAL PRICE
  // ======================================================

  const totalPrice = food.price * quantity;

  // ======================================================
  // MAIN FOOD DETAILS
  // ======================================================

  return (
    <section className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {/* ==================================================
            BACK TO MENU
        ================================================== */}

        <Link
          to="/menu"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 transition hover:text-orange-600"
        >
          ← Back to Menu
        </Link>

        {/* ==================================================
            FOOD DETAILS CARD
        ================================================== */}

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-xl">
          <div className="grid lg:grid-cols-2">
            {/* ==================================================
                FOOD IMAGE
            ================================================== */}

            <div className="relative min-h-[350px] bg-orange-50 sm:min-h-[450px]">
              {food.image ? (
                <img
                  src={food.image}
                  alt={food.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[350px] items-center justify-center text-9xl">
                  {food.icon || "🍽️"}
                </div>
              )}

              {/* Image overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

              {/* Category badge */}
              <div className="absolute left-6 top-6 rounded-full bg-white/95 px-4 py-2 text-sm font-black text-orange-700 shadow-lg">
                {food.category}
              </div>

              {/* ==================================================
                  FAVORITE BUTTON ON IMAGE
              ================================================== */}

              <button
                type="button"
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-2xl shadow-lg transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
                title={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                {isFavorite ? "❤️" : "🤍"}
              </button>
            </div>

            {/* ==================================================
                FOOD INFORMATION
            ================================================== */}

            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
              {/* Small heading */}
              <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-600">
                RK Restaurant
              </p>

              {/* Food name */}
              <h1 className="mt-3 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
                {food.name}
              </h1>

              {/* ==================================================
                  REAL RATING
              ================================================== */}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="text-lg">
                  {"★".repeat(Math.round(averageRating))}
                  {"☆".repeat(5 - Math.round(averageRating))}
                </div>

                <span className="text-sm font-bold text-gray-600">
                  {averageRating > 0 ? `${averageRating}/5` : "No rating yet"}
                </span>

                <span className="text-sm text-gray-400">
                  ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
                </span>
              </div>

              {/* Description */}
              <p className="mt-7 text-base leading-7 text-gray-600">
                {food.description ||
                  "A delicious dish prepared with fresh ingredients and served with care."}
              </p>

              {/* Divider */}
              <div className="my-7 h-px bg-orange-100"></div>

              {/* Price */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Price
                </p>

                <p className="mt-1 text-4xl font-black text-orange-600">
                  ₹{food.price}
                </p>
              </div>

              {/* ==================================================
                  FAVORITE BUTTON
              ================================================== */}

              <button
                type="button"
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className={`mt-6 w-full rounded-2xl border px-6 py-4 text-base font-black transition ${
                  isFavorite
                    ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {favoriteLoading
                  ? "Updating..."
                  : isFavorite
                    ? "❤️ Remove from Favorites"
                    : "🤍 Add to Favorites"}
              </button>

              {/* Favorite message */}
              {favoriteMessage && (
                <div className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-600">
                  {favoriteMessage}
                </div>
              )}

              {/* ==================================================
                  QUANTITY
              ================================================== */}

              <div className="mt-7">
                <p className="mb-3 text-sm font-bold text-gray-700">Quantity</p>

                <div className="flex w-fit items-center overflow-hidden rounded-xl border border-orange-200 bg-orange-50">
                  {/* Decrease */}
                  <button
                    type="button"
                    onClick={decreaseQuantity}
                    className="flex h-12 w-12 items-center justify-center text-xl font-black text-orange-700 transition hover:bg-orange-100"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>

                  {/* Quantity */}
                  <div className="flex h-12 min-w-14 items-center justify-center bg-white px-4 text-lg font-black text-gray-900">
                    {quantity}
                  </div>

                  {/* Increase */}
                  <button
                    type="button"
                    onClick={increaseQuantity}
                    className="flex h-12 w-12 items-center justify-center text-xl font-black text-orange-700 transition hover:bg-orange-100"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* ==================================================
                  ORDER SUMMARY
              ================================================== */}

              <div className="mt-6 flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4">
                <span className="text-sm font-semibold text-gray-500">
                  Total
                </span>

                <span className="text-xl font-black text-gray-900">
                  ₹{totalPrice}
                </span>
              </div>

              {/* ==================================================
                  ADD TO CART
              ================================================== */}

              <button
                type="button"
                onClick={addToCart}
                className="mt-6 w-full rounded-2xl bg-orange-600 px-6 py-4 text-base font-black text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-orange-700 hover:shadow-xl"
              >
                🛒 Add {quantity} to Cart
              </button>

              {/* Delivery information */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
                  <div className="text-xl">⚡</div>

                  <p className="mt-1 text-xs font-bold text-gray-600">
                    Quick Order
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
                  <div className="text-xl">🍴</div>

                  <p className="mt-1 text-xs font-bold text-gray-600">
                    Fresh Food
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================
            REVIEWS SECTION
        ====================================================== */}

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          {/* ==================================================
              REVIEW SUMMARY
          ================================================== */}

          <div className="rounded-3xl border border-orange-100 bg-white p-7 shadow-lg">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">
              Customer Feedback
            </p>

            <h2 className="mt-2 text-2xl font-black text-gray-900">
              Ratings & Reviews
            </h2>

            <div className="mt-6 text-center">
              <p className="text-5xl font-black text-orange-600">
                {averageRating > 0 ? averageRating : "—"}
              </p>

              <div className="mt-2 text-2xl">
                {"★".repeat(Math.round(averageRating))}
                {"☆".repeat(5 - Math.round(averageRating))}
              </div>

              <p className="mt-2 text-sm text-gray-500">
                Based on {totalReviews}{" "}
                {totalReviews === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>

          {/* ==================================================
              REVIEW FORM
          ================================================== */}

          <div className="rounded-3xl border border-orange-100 bg-white p-7 shadow-lg lg:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">
              Share Your Experience
            </p>

            <h2 className="mt-2 text-2xl font-black text-gray-900">
              Write a Review
            </h2>

            {!loggedInUser ? (
              <div className="mt-6 rounded-2xl bg-orange-50 p-5">
                <p className="text-sm font-semibold text-gray-700">
                  Please login to give a rating and review.
                </p>

                <Link
                  to="/login"
                  className="mt-4 inline-block rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700"
                >
                  Login to Review
                </Link>
              </div>
            ) : (
              <form onSubmit={submitReview} className="mt-6">
                {/* Rating selection */}
                <label className="block text-sm font-bold text-gray-700">
                  Your Rating
                </label>

                <div className="mt-3 flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`text-3xl transition hover:scale-110 ${
                        star <= reviewRating
                          ? "text-orange-500"
                          : "text-gray-300"
                      }`}
                      aria-label={`Give ${star} star rating`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                {/* Comment */}
                <label className="mt-6 block text-sm font-bold text-gray-700">
                  Your Review
                </label>

                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Tell us about your experience..."
                  maxLength={500}
                  rows={4}
                  className="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />

                <div className="mt-2 text-right text-xs text-gray-400">
                  {reviewComment.length}/500
                </div>

                {/* Error */}
                {reviewError && (
                  <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {reviewError}
                  </div>
                )}

                {/* Success */}
                {reviewSuccess && (
                  <div className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-600">
                    {reviewSuccess}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="mt-5 rounded-xl bg-orange-600 px-6 py-3 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reviewLoading ? "Submitting..." : "⭐ Submit Review"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ======================================================
            EXISTING REVIEWS
        ====================================================== */}

        <div className="mt-8 rounded-3xl border border-orange-100 bg-white p-7 shadow-lg">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">
                What Customers Say
              </p>

              <h2 className="mt-2 text-2xl font-black text-gray-900">
                Customer Reviews
              </h2>
            </div>

            <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">
              {totalReviews} {totalReviews === 1 ? "Review" : "Reviews"}
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="mt-8 rounded-2xl bg-gray-50 p-8 text-center">
              <div className="text-4xl">⭐</div>

              <h3 className="mt-3 text-lg font-black text-gray-800">
                No reviews yet
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Be the first customer to review this food.
              </p>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              {reviews.map((review) => {
                // Review user ka naam
                const reviewerName = review.userId?.name || "Customer";

                // Current user ka ID
                const currentUserId = loggedInUser?._id;

                // Review owner check
                const reviewUserId = review.userId?._id || review.userId;

                const isOwner =
                  currentUserId &&
                  reviewUserId &&
                  String(currentUserId) === String(reviewUserId);

                return (
                  <div
                    key={review._id}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <p className="font-black text-gray-900">
                          {reviewerName}
                        </p>

                        <div className="mt-1 text-lg text-orange-500">
                          {"★".repeat(review.rating)}
                          {"☆".repeat(5 - review.rating)}
                        </div>
                      </div>

                      <div className="text-xs text-gray-400">
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString()
                          : ""}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-gray-600">
                      {review.comment}
                    </p>

                    {/* Delete only own review */}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => deleteReview(review._id)}
                        className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                      >
                        Delete Review
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================================================
            BOTTOM MESSAGE
        ================================================== */}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            Fresh food • Easy ordering • Better dining experience
          </p>
        </div>
      </div>
    </section>
  );
}

export default FoodDetails;
