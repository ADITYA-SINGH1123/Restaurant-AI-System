// ======================================================
// AI HISTORY PAGE
// ======================================================
// Ye page user ki previous AI food recommendation
// searches ko display karta hai.
//
// Features:
// 1. AI search history show
// 2. Prompt show
// 3. Category / budget show
// 4. Previous recommendations show
// 5. Clear history
// 6. Login protection
// ======================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AIHistory() {
  // ====================================================
  // STATES
  // ====================================================

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // ====================================================
  // FETCH AI HISTORY
  // ====================================================

  useEffect(() => {
    // User ka login token
    const token = localStorage.getItem("token");

    // Token nahi hai to login page par bhejo
    if (!token) {
      navigate("/login");
      return;
    }

    // History fetch function
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("http://localhost:5000/api/ai-history", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Unauthorized token
        if (response.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load AI history");
        }

        setHistory(data.history || []);
      } catch (err) {
        console.error("AI History Error:", err);
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    // History load karo
    fetchHistory();
  }, [navigate]);

  // ====================================================
  // CLEAR ALL HISTORY
  // ====================================================

  const clearHistory = async () => {
    // Confirmation
    const confirmed = window.confirm(
      "Are you sure you want to clear all AI history?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:5000/api/ai-history", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to clear history");
      }

      // UI se history clear
      setHistory([]);
    } catch (err) {
      console.error("Clear History Error:", err);
      setError(err.message || "Failed to clear history");
    }
  };

  // ====================================================
  // LOADING UI
  // ====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🤖</div>

          <p className="text-lg font-semibold text-gray-700">
            Loading AI history...
          </p>
        </div>
      </div>
    );
  }

  // ====================================================
  // MAIN UI
  // ====================================================

  return (
    <div className="min-h-screen bg-orange-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🤖 AI Recommendation History
              </h1>

              <p className="text-gray-600 mt-2">
                View your previous AI food recommendation searches.
              </p>
            </div>

            <button
              onClick={() => navigate("/ai-recommendation")}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl font-semibold"
            >
              🤖 AI Recommendations
            </button>
          </div>
        </div>

        {/* ==================================================
            ERROR MESSAGE
        ================================================== */}

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 rounded-xl p-4 mb-6">
            ❌ {error}
          </div>
        )}

        {/* ==================================================
            EMPTY HISTORY
        ================================================== */}

        {history.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-10 text-center">
            <div className="text-6xl mb-4">🤖</div>

            <h2 className="text-2xl font-bold text-gray-800">
              No AI history yet
            </h2>

            <p className="text-gray-600 mt-2 mb-6">
              Ask our AI for food recommendations and your searches will appear
              here.
            </p>

            <button
              onClick={() => navigate("/ai-recommendation")}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold"
            >
              Start AI Recommendation
            </button>
          </div>
        ) : (
          <>
            {/* ==================================================
                HISTORY HEADER
            ================================================== */}

            <div className="bg-white rounded-2xl shadow-md p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Your Searches
                </h2>

                <p className="text-gray-600">
                  {history.length} search
                  {history.length !== 1 ? "es" : ""}
                </p>
              </div>

              <button
                onClick={clearHistory}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-xl font-semibold"
              >
                🗑️ Clear History
              </button>
            </div>

            {/* ==================================================
                HISTORY CARDS
            ================================================== */}

            <div className="space-y-6">
              {history.map((item) => (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl shadow-md p-6"
                >
                  {/* ==========================================
                      SEARCH INFORMATION
                  ========================================== */}

                  <div className="flex flex-col gap-3 mb-5">
                    <div>
                      <p className="text-sm text-gray-500">Your request</p>

                      <p className="text-lg font-semibold text-gray-800">
                        {item.prompt || "Surprise me"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.category && (
                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                          Category: {item.category}
                        </span>
                      )}

                      {item.maxPrice !== null &&
                        item.maxPrice !== undefined && (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                            Budget: ₹{item.maxPrice}
                          </span>
                        )}

                      {item.createdAt && (
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                          {new Date(item.createdAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ==========================================
                      RECOMMENDATIONS
                  ========================================== */}

                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    🍽️ Recommended Foods
                  </h3>

                  {item.recommendations && item.recommendations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {item.recommendations.map((food, index) => (
                        <div
                          key={food.foodId || `${item._id}-${index}`}
                          className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-bold text-gray-800">
                                {index + 1}. {food.name}
                              </h4>

                              <p className="text-orange-600 font-semibold mt-1">
                                ₹{food.price}
                              </p>

                              {food.category && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {food.category}
                                </p>
                              )}
                            </div>

                            <span className="text-2xl">🍽️</span>
                          </div>

                          {food.reason && (
                            <p className="text-sm text-gray-600 mt-3">
                              💡 {food.reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      No recommendations saved for this search.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AIHistory;
