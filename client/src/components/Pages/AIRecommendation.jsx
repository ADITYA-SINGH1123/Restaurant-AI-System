// ======================================================
// AI FOOD RECOMMENDATION PAGE
// ======================================================
// Features:
// 1. Natural language food search
// 2. Budget detection
// 3. Category selection
// 4. Personalized recommendations
// 5. Previous order based recommendation
// 6. Favorite based recommendation
// 7. AI recommendation reason
// 8. Natural conversation-style AI response
// 9. Quick suggestions
// 10. Add to Cart
// 11. Login authentication
// 12. Professional responsive UI
// 13. Better AI conversation experience
// 14. AI Recommendation History
// ======================================================

import { useState } from "react";

// ======================================================
// COMPONENT
// ======================================================

const AIRecommendation = () => {
  // ====================================================
  // USER INPUT STATES
  // ====================================================

  // User ka natural-language prompt
  const [prompt, setPrompt] = useState("");

  // Optional category
  const [category, setCategory] = useState("");

  // Optional maximum budget
  const [maxPrice, setMaxPrice] = useState("");

  // ====================================================
  // RECOMMENDATION STATES
  // ====================================================

  // AI recommendations
  const [recommendations, setRecommendations] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Error message
  const [error, setError] = useState("");

  // Success/info message
  const [message, setMessage] = useState("");

  // Natural AI conversation message
  const [aiMessage, setAiMessage] = useState("");

  // ====================================================
  // GENERATE CONVERSATION-STYLE AI MESSAGE
  // ====================================================
  // User ke prompt ko analyse karke human-friendly
  // response generate kiya jayega.
  // ====================================================

  const generateAIMessage = (resultCount) => {
    // Prompt ko lowercase mein convert karna
    const lowerPrompt = prompt.trim().toLowerCase();

    // ----------------------------------------------------
    // SURPRISE / VAGUE REQUEST
    // ----------------------------------------------------

    if (
      lowerPrompt.includes("surprise me") ||
      lowerPrompt === "surprise" ||
      lowerPrompt.includes("i don't know what to eat") ||
      lowerPrompt.includes("dont know what to eat") ||
      lowerPrompt.includes("suggest something") ||
      lowerPrompt.includes("recommend something") ||
      lowerPrompt.includes("what should i eat") ||
      lowerPrompt.includes("best food for me") ||
      lowerPrompt.includes("you choose") ||
      lowerPrompt.includes("choose for me") ||
      lowerPrompt.includes("anything is fine")
    ) {
      return `I picked ${resultCount} options for you based on your preferences and our restaurant menu.`;
    }

    // ----------------------------------------------------
    // HEALTHY + BUDGET
    // ----------------------------------------------------

    if (
      (lowerPrompt.includes("healthy") ||
        lowerPrompt.includes("healthier") ||
        lowerPrompt.includes("light") ||
        lowerPrompt.includes("fresh")) &&
      (lowerPrompt.includes("cheap") ||
        lowerPrompt.includes("affordable") ||
        lowerPrompt.includes("budget") ||
        maxPrice)
    ) {
      if (maxPrice) {
        return `You're looking for healthier food within ₹${maxPrice}. I found ${resultCount} suitable options for you.`;
      }

      return `You're looking for healthier and budget-friendly food. I found ${resultCount} options that may suit you.`;
    }

    // ----------------------------------------------------
    // SPICY + FILLING + BUDGET
    // ----------------------------------------------------

    if (
      (lowerPrompt.includes("spicy") || lowerPrompt.includes("hot")) &&
      (lowerPrompt.includes("filling") ||
        lowerPrompt.includes("hungry") ||
        lowerPrompt.includes("heavy")) &&
      maxPrice
    ) {
      return `You're hungry and looking for something spicy and filling within ₹${maxPrice}. Here are ${resultCount} options I think you'll like.`;
    }

    // ----------------------------------------------------
    // SPICY + BUDGET
    // ----------------------------------------------------

    if (
      (lowerPrompt.includes("spicy") || lowerPrompt.includes("hot")) &&
      maxPrice
    ) {
      return `You're looking for something spicy within ₹${maxPrice}. Here are ${resultCount} options for you.`;
    }

    // ----------------------------------------------------
    // SPICY ONLY
    // ----------------------------------------------------

    if (lowerPrompt.includes("spicy") || lowerPrompt.includes("hot")) {
      return `You're in the mood for something spicy. Here are ${resultCount} options from our menu.`;
    }

    // ----------------------------------------------------
    // FILLING + BUDGET
    // ----------------------------------------------------

    if (
      (lowerPrompt.includes("filling") ||
        lowerPrompt.includes("heavy") ||
        lowerPrompt.includes("hungry") ||
        lowerPrompt.includes("full meal")) &&
      maxPrice
    ) {
      return `You're looking for something filling within ₹${maxPrice}. Here are ${resultCount} options that should make a satisfying meal.`;
    }

    // ----------------------------------------------------
    // FILLING ONLY
    // ----------------------------------------------------

    if (
      lowerPrompt.includes("filling") ||
      lowerPrompt.includes("heavy") ||
      lowerPrompt.includes("hungry") ||
      lowerPrompt.includes("full meal")
    ) {
      return `You seem to be looking for a filling meal. Here are ${resultCount} options from our menu.`;
    }

    // ----------------------------------------------------
    // SWEET / DESSERT
    // ----------------------------------------------------

    if (
      lowerPrompt.includes("sweet") ||
      lowerPrompt.includes("dessert") ||
      lowerPrompt.includes("cake")
    ) {
      if (maxPrice) {
        return `You're looking for something sweet within ₹${maxPrice}. Here are ${resultCount} dessert options for you.`;
      }

      return `You're in the mood for something sweet. Here are ${resultCount} options you might enjoy.`;
    }

    // ----------------------------------------------------
    // CHEAP / AFFORDABLE
    // ----------------------------------------------------

    if (
      lowerPrompt.includes("cheap") ||
      lowerPrompt.includes("affordable") ||
      lowerPrompt.includes("budget-friendly") ||
      lowerPrompt.includes("not expensive") ||
      lowerPrompt.includes("inexpensive")
    ) {
      if (maxPrice) {
        return `You're looking for affordable food within ₹${maxPrice}. I found ${resultCount} budget-friendly options for you.`;
      }

      return `You're looking for something affordable. Here are ${resultCount} budget-friendly options for you.`;
    }

    // ----------------------------------------------------
    // SIMILAR FOOD REQUEST
    // ----------------------------------------------------

    if (
      lowerPrompt.includes("like burger") ||
      lowerPrompt.includes("similar to burger") ||
      lowerPrompt.includes("burger but")
    ) {
      if (
        lowerPrompt.includes("healthy") ||
        lowerPrompt.includes("healthier")
      ) {
        return `You want something like a burger but healthier. I found ${resultCount} options that match that idea.`;
      }

      return `You want something similar to a burger. Here are ${resultCount} options selected for you.`;
    }

    if (
      lowerPrompt.includes("like pizza") ||
      lowerPrompt.includes("similar to pizza") ||
      lowerPrompt.includes("pizza but")
    ) {
      if (
        lowerPrompt.includes("healthy") ||
        lowerPrompt.includes("healthier")
      ) {
        return `You want something like pizza but healthier. I found ${resultCount} suitable options for you.`;
      }

      return `You want something similar to pizza. Here are ${resultCount} options for you.`;
    }

    if (
      lowerPrompt.includes("like noodles") ||
      lowerPrompt.includes("similar to noodles") ||
      lowerPrompt.includes("noodles but")
    ) {
      return `You want something similar to noodles. Here are ${resultCount} options selected from our menu.`;
    }

    // ----------------------------------------------------
    // CATEGORY
    // ----------------------------------------------------

    if (category) {
      if (maxPrice) {
        return `You're looking for ${category.toLowerCase()} within ₹${maxPrice}. Here are ${resultCount} options for you.`;
      }

      return `You're looking for ${category.toLowerCase()}. Here are ${resultCount} options selected for you.`;
    }

    // ----------------------------------------------------
    // BUDGET ONLY
    // ----------------------------------------------------

    if (maxPrice) {
      return `You're looking for food within ₹${maxPrice}. Here are ${resultCount} options I found for you.`;
    }

    // ----------------------------------------------------
    // GENERIC REQUEST
    // ----------------------------------------------------

    if (prompt.trim()) {
      return `I understood your request and found ${resultCount} food options that may be a good match for you.`;
    }

    // ----------------------------------------------------
    // DEFAULT
    // ----------------------------------------------------

    return `I found ${resultCount} food recommendations for you.`;
  };

  // ====================================================
  // SAVE AI RECOMMENDATION HISTORY
  // ====================================================
  // AI recommendation result ko backend ke through
  // MongoDB mein save karega.
  // ====================================================

  const saveAIHistory = async (result, token) => {
    try {
      // --------------------------------------------------
      // History data prepare karo
      // --------------------------------------------------

      const historyData = {
        prompt: prompt.trim(),
        category: category,
        maxPrice: maxPrice ? Number(maxPrice) : null,

        // Sirf required recommendation information
        recommendations: result.slice(0, 5).map((food) => ({
          foodId: food._id,
          name: food.name,
          price: food.price,
          category: food.category,
          reason: food.reason || "",
        })),
      };

      // --------------------------------------------------
      // History API call
      // --------------------------------------------------

      const response = await fetch("http://localhost:5000/api/ai-history", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          // JWT authentication
          Authorization: `Bearer ${token}`,
        },

        // History data
        body: JSON.stringify(historyData),
      });

      // Backend response
      const data = await response.json();

      // --------------------------------------------------
      // History save error
      // --------------------------------------------------

      if (!response.ok) {
        console.error(
          "AI history save failed:",
          data.message || "Unknown error",
        );

        // History fail hone par recommendation ko
        // fail nahi karna hai.
        return false;
      }

      console.log("✅ AI recommendation history saved");

      return true;
    } catch (error) {
      // History error ko console mein show karo
      console.error("❌ AI history error:", error);

      // Main AI recommendation ko continue rehne do
      return false;
    }
  };

  // ====================================================
  // GET AI RECOMMENDATIONS
  // ====================================================

  const getRecommendations = async () => {
    // Purane messages clear karo
    setError("");
    setMessage("");
    setAiMessage("");
    setRecommendations([]);

    // ----------------------------------------------------
    // INPUT VALIDATION
    // ----------------------------------------------------

    if (!prompt.trim() && !category && !maxPrice) {
      setError("Please tell me what food you are looking for.");
      return;
    }

    // ----------------------------------------------------
    // BUDGET VALIDATION
    // ----------------------------------------------------

    if (maxPrice) {
      const budget = Number(maxPrice);

      if (Number.isNaN(budget) || budget <= 0) {
        setError("Please enter a valid budget.");
        return;
      }
    }

    try {
      // Loading start
      setLoading(true);

      // Login token
      const token = localStorage.getItem("token");

      // Personalized AI ke liye login required
      if (!token) {
        setError("Please login first to use personalized AI recommendations.");

        return;
      }

      // --------------------------------------------------
      // CREATE URL PARAMETERS
      // --------------------------------------------------

      const params = new URLSearchParams();

      // Prompt
      if (prompt.trim()) {
        params.append("prompt", prompt.trim());
      }

      // Category
      if (category) {
        params.append("category", category);
      }

      // Maximum budget
      if (maxPrice) {
        params.append("maxPrice", maxPrice);
      }

      // --------------------------------------------------
      // BACKEND AI API CALL
      // --------------------------------------------------

      const response = await fetch(
        `http://localhost:5000/api/ai/recommendations?${params.toString()}`,
        {
          method: "GET",

          // JWT authentication
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // JSON response
      const data = await response.json();

      // --------------------------------------------------
      // AUTHENTICATION ERROR
      // --------------------------------------------------

      if (response.status === 401) {
        setError("Your login session has expired. Please login again.");

        return;
      }

      // --------------------------------------------------
      // OTHER API ERROR
      // --------------------------------------------------

      if (!response.ok) {
        throw new Error(data.message || "Unable to get recommendations.");
      }

      // --------------------------------------------------
      // SAVE RECOMMENDATIONS
      // --------------------------------------------------

      const result = data.recommendations || [];

      setRecommendations(result);

      // --------------------------------------------------
      // SAVE AI HISTORY
      // --------------------------------------------------
      // AI result successfully milne ke baad history
      // MongoDB mein save karo.
      //
      // Is function ka error main recommendation ko
      // stop nahi karega.
      // --------------------------------------------------

      await saveAIHistory(result, token);

      // --------------------------------------------------
      // RESULT MESSAGE
      // --------------------------------------------------

      if (result.length === 0) {
        setMessage(
          "No matching food found. Try a different request or budget.",
        );

        setAiMessage("");
      } else {
        // Green result message
        setMessage(
          `✨ ${result.length} food recommendation${
            result.length > 1 ? "s" : ""
          } found for you!`,
        );

        // Natural AI response
        setAiMessage(generateAIMessage(result.length));
      }
    } catch (err) {
      // Console error
      console.error("AI recommendation error:", err);

      // User-friendly error
      setError(
        err.message || "Something went wrong while getting recommendations.",
      );
    } finally {
      // Loading stop
      setLoading(false);
    }
  };

  // ====================================================
  // ADD FOOD TO CART
  // ====================================================

  const addToCart = (food) => {
    try {
      // Existing cart read karo
      const existingCart = JSON.parse(localStorage.getItem("cart")) || [];

      // Food already cart mein hai?
      const existingFoodIndex = existingCart.findIndex(
        (item) => String(item._id) === String(food._id),
      );

      let updatedCart;

      // --------------------------------------------------
      // FOOD ALREADY EXISTS
      // --------------------------------------------------

      if (existingFoodIndex !== -1) {
        // Cart ki copy
        updatedCart = [...existingCart];

        // Quantity +1
        updatedCart[existingFoodIndex] = {
          ...updatedCart[existingFoodIndex],

          quantity: (updatedCart[existingFoodIndex].quantity || 1) + 1,
        };
      }

      // --------------------------------------------------
      // NEW FOOD
      // --------------------------------------------------
      else {
        updatedCart = [
          ...existingCart,
          {
            ...food,
            quantity: 1,
          },
        ];
      }

      // Cart save karo
      localStorage.setItem("cart", JSON.stringify(updatedCart));

      // Success message
      setError("");

      setMessage(`🛒 ${food.name} added to cart successfully!`);
    } catch (err) {
      // Error handling
      console.error("Add to cart error:", err);

      setError("Unable to add food to cart.");
    }
  };

  // ====================================================
  // CLEAR ALL
  // ====================================================

  const clearRecommendations = () => {
    // Inputs clear
    setPrompt("");
    setCategory("");
    setMaxPrice("");

    // Recommendations clear
    setRecommendations([]);

    // Messages clear
    setMessage("");
    setError("");
    setAiMessage("");
  };

  // ====================================================
  // QUICK PROMPT
  // ====================================================

  const handleQuickPrompt = (text) => {
    // Prompt set karo
    setPrompt(text);

    // Purane messages clear
    setError("");
    setMessage("");
    setAiMessage("");

    // Recommendations clear
    setRecommendations([]);
  };

  // ====================================================
  // ENTER KEY
  // ====================================================

  const handleKeyDown = (event) => {
    // Enter press par AI request
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      getRecommendations();
    }
  };

  // ====================================================
  // PAGE UI
  // ====================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <div className="mb-10 text-center">
          {/* AI Icon */}
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-5xl shadow-md">
            🤖
          </div>

          {/* Title */}
          <h1 className="text-4xl font-extrabold text-orange-600 md:text-5xl">
            AI Food Assistant
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Tell me what you want to eat, and I will find the best food
            recommendations for you.
          </p>
        </div>

        {/* ==================================================
            INPUT CARD
        ================================================== */}

        <div className="mx-auto max-w-4xl rounded-3xl border border-orange-100 bg-white p-6 shadow-xl md:p-8">
          {/* Card heading */}
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-800">
              💬 Tell AI what you want
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Describe your taste, budget, or food preference.
            </p>
          </div>

          {/* Prompt Label */}
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            What are you looking for?
          </label>

          {/* Prompt Input */}
          <textarea
            rows="3"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Example: I'm hungry, give me something filling under 300"
            className="w-full resize-none rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100"
          />

          {/* Help text */}
          <p className="mt-2 text-xs text-gray-500">
            💡 Try: "cheap and healthy food", "spicy food under 300", or
            "Surprise me".
          </p>

          {/* ==================================================
              QUICK SUGGESTIONS
          ================================================== */}

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-gray-700">
              ⚡ Quick suggestions
            </p>

            <div className="flex flex-wrap gap-2">
              {/* Healthy */}
              <button
                onClick={() =>
                  handleQuickPrompt("I want healthy food under 300")
                }
                className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700 transition hover:-translate-y-0.5 hover:bg-green-200"
              >
                🥗 Healthy under ₹300
              </button>

              {/* Burger */}
              <button
                onClick={() => handleQuickPrompt("I want burger")}
                className="rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700 transition hover:-translate-y-0.5 hover:bg-orange-200"
              >
                🍔 Burger
              </button>

              {/* Dessert */}
              <button
                onClick={() => handleQuickPrompt("I want dessert under 200")}
                className="rounded-full bg-pink-100 px-4 py-2 text-sm font-medium text-pink-700 transition hover:-translate-y-0.5 hover:bg-pink-200"
              >
                🍰 Dessert under ₹200
              </button>

              {/* Spicy */}
              <button
                onClick={() => handleQuickPrompt("I want spicy food under 300")}
                className="rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition hover:-translate-y-0.5 hover:bg-red-200"
              >
                🌶️ Spicy under ₹300
              </button>

              {/* Surprise */}
              <button
                onClick={() => handleQuickPrompt("Surprise me")}
                className="rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 transition hover:-translate-y-0.5 hover:bg-purple-200"
              >
                🔀 Surprise Me
              </button>
            </div>
          </div>

          {/* ==================================================
              FILTERS
          ================================================== */}

          <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Category
                <span className="font-normal text-gray-400"> (Optional)</span>
              </label>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Any Category</option>

                <option value="Pizza">🍕 Pizza</option>

                <option value="Burger">🍔 Burger</option>

                <option value="Noodles">🍜 Noodles</option>

                <option value="Chicken">🍗 Chicken</option>

                <option value="Healthy">🥗 Healthy</option>

                <option value="Dessert">🍰 Dessert</option>
              </select>
            </div>

            {/* Budget */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Maximum Budget
                <span className="font-normal text-gray-400"> (Optional)</span>
              </label>

              <input
                type="number"
                min="1"
                placeholder="Example: 300"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          {/* ==================================================
              ACTION BUTTONS
          ================================================== */}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {/* Ask AI */}
            <button
              onClick={getRecommendations}
              disabled={loading}
              className="flex-1 rounded-xl bg-orange-500 py-3.5 font-bold text-white shadow-md transition hover:bg-orange-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "🤖 Finding the Best Food..." : "🤖 Ask AI"}
            </button>

            {/* Clear */}
            <button
              onClick={clearRecommendations}
              className="rounded-xl bg-gray-100 px-7 py-3.5 font-semibold text-gray-700 transition hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
        </div>

        {/* ==================================================
            ERROR MESSAGE
        ================================================== */}

        {error && (
          <div className="mx-auto mt-6 max-w-4xl rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-xl">❌</span>

              <div>
                <p className="font-semibold">Something went wrong</p>

                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            CONVERSATION-STYLE AI MESSAGE
        ================================================== */}

        {aiMessage && (
          <div className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-md">
            {/* AI header */}
            <div className="flex items-center gap-3 border-b border-orange-100 bg-orange-50 px-5 py-4">
              {/* AI avatar */}
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                🤖
              </div>

              <div>
                <h3 className="font-bold text-orange-600">AI Food Assistant</h3>

                <p className="text-xs text-gray-500">Personalized suggestion</p>
              </div>
            </div>

            {/* AI message */}
            <div className="p-5">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-base leading-7 text-gray-700">{aiMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            SUCCESS MESSAGE
        ================================================== */}

        {message && (
          <div className="mx-auto mt-4 max-w-4xl rounded-xl border border-green-200 bg-green-50 p-4 text-green-700 shadow-sm">
            {message}
          </div>
        )}

        {/* ==================================================
            RECOMMENDATIONS
        ================================================== */}

        {recommendations.length > 0 && (
          <div className="mt-12">
            {/* Recommendation Heading */}
            <div className="mb-8 text-center">
              <span className="inline-block rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
                🤖 AI Powered
              </span>

              <h2 className="mt-3 text-3xl font-extrabold text-gray-800 md:text-4xl">
                ✨ Recommended For You
              </h2>

              {/* User Prompt */}
              {prompt && (
                <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-500">
                  Based on your request:{" "}
                  <span className="font-semibold text-gray-700">
                    "{prompt}"
                  </span>
                </p>
              )}
            </div>

            {/* ==================================================
                FOOD CARDS
            ================================================== */}

            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((food, index) => (
                <div
                  key={food._id}
                  className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* ==================================================
                        FOOD ICON AREA
                    ================================================== */}

                  <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                    {/* Recommendation number */}
                    <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-600 shadow-sm">
                      #{index + 1}
                    </div>

                    {/* Availability */}
                    <div className="absolute right-4 top-4 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      ● Available
                    </div>

                    {/* Food icon */}
                    <div className="text-7xl transition duration-300 group-hover:scale-110">
                      {food.icon || "🍽️"}
                    </div>
                  </div>

                  {/* ==================================================
                        CARD CONTENT
                    ================================================== */}

                  <div className="p-6">
                    {/* Food name */}
                    <h3 className="text-xl font-extrabold text-gray-800">
                      {food.name}
                    </h3>

                    {/* Category */}
                    <div className="mt-2 inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                      {food.category}
                    </div>

                    {/* Description */}
                    <p className="mt-4 min-h-[48px] text-sm leading-6 text-gray-600">
                      {food.description ||
                        "Delicious food from our restaurant."}
                    </p>

                    {/* ==================================================
                          AI REASON
                      ================================================== */}

                    {food.reason && (
                      <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🤖</span>

                          <p className="text-sm font-bold text-orange-700">
                            Why AI recommended this
                          </p>
                        </div>

                        <p className="mt-2 text-sm leading-5 text-gray-600">
                          {food.reason}
                        </p>
                      </div>
                    )}

                    {/* ==================================================
                          PRICE
                      ================================================== */}

                    <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
                      <div>
                        <p className="text-xs font-medium text-gray-400">
                          Price
                        </p>

                        <p className="text-2xl font-extrabold text-green-600">
                          ₹{food.price}
                        </p>
                      </div>

                      {/* Food icon */}
                      <div className="text-3xl">{food.icon || "🍽️"}</div>
                    </div>

                    {/* ==================================================
                          ADD TO CART
                      ================================================== */}

                    <button
                      onClick={() => addToCart(food)}
                      className="mt-5 w-full rounded-xl bg-orange-500 py-3.5 font-bold text-white shadow-sm transition hover:bg-orange-600 hover:shadow-md active:scale-[0.98]"
                    >
                      🛒 Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================
            EMPTY INITIAL STATE
        ================================================== */}

        {!loading &&
          !error &&
          recommendations.length === 0 &&
          !message &&
          !aiMessage && (
            <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-dashed border-orange-200 bg-white p-10 text-center shadow-sm">
              <div className="text-6xl">🍽️</div>

              <h3 className="mt-4 text-2xl font-bold text-gray-800">
                Let AI choose your food
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-gray-500">
                Tell me your taste, budget, or food preference and I will
                suggest suitable options from the restaurant menu.
              </p>

              <p className="mt-5 text-sm font-semibold text-orange-500">
                Try "I'm hungry, give me something filling under 300"
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

// ======================================================
// EXPORT COMPONENT
// ======================================================

export default AIRecommendation;
