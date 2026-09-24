// ======================================================
// INVENTORY DASHBOARD
// ======================================================
// Ye component Admin ke inventory stock ka summary,
// food-wise stock information, search/filter,
// quick stock update aur stock adjustment history
// display karega.

import { useEffect, useMemo, useState } from "react";

// ======================================================
// INVENTORY DASHBOARD COMPONENT
// ======================================================

function InventoryDashboard({ token: passedToken }) {
  // App.jsx se token na mile to localStorage se latest token lo.
  const token = passedToken || localStorage.getItem("token") || "";
  ///console.log("Inventory token prop:", token);
  // ====================================================
  // INVENTORY STATES
  // ====================================================

  const [inventory, setInventory] = useState({
    totalItems: 0,
    inStockItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalStockQuantity: 0,
  });

  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ====================================================
  // STOCK UPDATE STATES
  // ====================================================

  const [stockInputs, setStockInputs] = useState({});
  const [updatingFoodId, setUpdatingFoodId] = useState(null);
  // Bulk stock update states
  const [selectedFoodIds, setSelectedFoodIds] = useState([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // ====================================================
  // SEARCH & FILTER STATES
  // ====================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");

  // ====================================================
  // STOCK HISTORY STATES
  // ====================================================

  const [stockHistory, setStockHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  // ====================================================
  // LOW STOCK LIMIT
  // ====================================================
  // 1 se 5 quantity tak food ko low stock maana jayega.

  const LOW_STOCK_LIMIT = 5;

  // ====================================================
  // FETCH STOCK HISTORY
  // ====================================================

  const fetchStockHistory = async () => {
    if (!token) {
      setHistoryLoading(false);
      setHistoryError("Authentication token not found.");
      return;
    }

    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/inventory-history?limit=50",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setHistoryError(data.message || "Failed to fetch stock history.");
        return;
      }

      const historyList = Array.isArray(data.history) ? data.history : [];

      setStockHistory(historyList);
    } catch (error) {
      console.error("Stock history error:", error);

      setHistoryError(
        "Cannot connect to stock history API. Please make sure the backend is running.",
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  // ====================================================
  // FETCH INVENTORY
  // ====================================================

  const fetchInventory = async (isRefresh = false) => {
    if (!token) {
      setLoading(false);
      setError("Authentication token not found.");
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/foods/admin/inventory-summary",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to fetch inventory.");
        return;
      }

      setInventory({
        totalItems: Number(data.summary?.totalItems || 0),
        inStockItems: Number(data.summary?.inStockItems || 0),
        lowStockItems: Number(data.summary?.lowStockItems || 0),
        outOfStockItems: Number(data.summary?.outOfStockItems || 0),
        totalStockQuantity: Number(data.summary?.totalStockQuantity || 0),
      });

      const foodList = Array.isArray(data.foods) ? data.foods : [];

      setFoods(foodList);

      // Stock inputs ko latest API data ke saath sync karna.
      const inputValues = {};

      foodList.forEach((food) => {
        inputValues[food._id] = Number(food.stock || 0);
      });

      setStockInputs(inputValues);
    } catch (error) {
      console.error("Inventory dashboard error:", error);

      setError(
        "Cannot connect to inventory API. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      if (!token) {
        setLoading(false);
        setHistoryLoading(false);
        setError("Authentication token not found.");
        setHistoryError("Authentication token not found.");
        return;
      }

      setLoading(true);
      setHistoryLoading(true);
      setError("");
      setHistoryError("");

      try {
        // ==================================================
        // INVENTORY API
        // ==================================================

        const inventoryResponse = await fetch(
          "http://localhost:5000/api/foods/admin/inventory-summary",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const inventoryData = await inventoryResponse.json();

        if (cancelled) return;

        if (!inventoryResponse.ok) {
          setError(inventoryData.message || "Failed to fetch inventory.");
        } else {
          setInventory({
            totalItems: Number(inventoryData.summary?.totalItems || 0),
            inStockItems: Number(inventoryData.summary?.inStockItems || 0),
            lowStockItems: Number(inventoryData.summary?.lowStockItems || 0),
            outOfStockItems: Number(
              inventoryData.summary?.outOfStockItems || 0,
            ),
            totalStockQuantity: Number(
              inventoryData.summary?.totalStockQuantity || 0,
            ),
          });

          const foodList = Array.isArray(inventoryData.foods)
            ? inventoryData.foods
            : [];

          setFoods(foodList);

          const inputValues = {};

          foodList.forEach((food) => {
            inputValues[food._id] = Number(food.stock || 0);
          });

          setStockInputs(inputValues);
        }

        // ==================================================
        // STOCK HISTORY API
        // ==================================================

        const historyResponse = await fetch(
          "http://localhost:5000/api/inventory-history?limit=50",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const historyData = await historyResponse.json();

        if (cancelled) return;

        if (!historyResponse.ok) {
          setHistoryError(
            historyData.message || "Failed to fetch stock history.",
          );
        } else {
          const historyList = Array.isArray(historyData.history)
            ? historyData.history
            : [];

          setStockHistory(historyList);
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Inventory dashboard error:", error);

        setError(
          "Cannot connect to inventory API. Please make sure the backend is running.",
        );

        setHistoryError(
          "Cannot connect to stock history API. Please make sure the backend is running.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHistoryLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // ====================================================
  // STOCK INPUT CHANGE
  // ====================================================

  const handleStockInputChange = (foodId, value) => {
    if (value === "") {
      setStockInputs((previous) => ({
        ...previous,
        [foodId]: "",
      }));

      return;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return;
    }

    if (!Number.isInteger(numericValue)) {
      return;
    }

    if (numericValue < 0) {
      return;
    }

    setStockInputs((previous) => ({
      ...previous,
      [foodId]: numericValue,
    }));
  };

  // ====================================================
  // QUICK STOCK CHANGE
  // ====================================================

  const handleQuickStockChange = (food, change) => {
    const currentStock = Number(food.stock || 0);

    const newStock = Math.max(0, currentStock + change);

    setStockInputs((previous) => ({
      ...previous,
      [food._id]: newStock,
    }));
  };

  // ====================================================
  // UPDATE FOOD STOCK
  // ====================================================

  const handleUpdateStock = async (food) => {
    if (!token) {
      setError("Authentication token not found.");
      return;
    }

    const inputValue = stockInputs[food._id];

    if (inputValue === "" || inputValue === undefined) {
      setError(`Please enter a valid stock quantity for ${food.name}.`);
      return;
    }

    const numericStock = Number(inputValue);

    if (
      !Number.isFinite(numericStock) ||
      !Number.isInteger(numericStock) ||
      numericStock < 0
    ) {
      setError("Stock must be a non-negative whole number.");
      return;
    }

    const currentStock = Number(food.stock || 0);

    // Same stock hone par API call ki zarurat nahi.
    if (numericStock === currentStock) {
      return;
    }

    setUpdatingFoodId(food._id);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/foods/${food._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            stock: numericStock,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to update stock.");
        return;
      }

      // Local food list immediately update karna.
      setFoods((previousFoods) =>
        previousFoods.map((item) =>
          item._id === food._id
            ? {
                ...item,
                stock: numericStock,
                available: numericStock > 0,
              }
            : item,
        ),
      );

      // Input ko latest stock ke saath sync karna.
      setStockInputs((previous) => ({
        ...previous,
        [food._id]: numericStock,
      }));

      // Summary refresh.
      await fetchInventory(true);

      // History refresh.
      await fetchStockHistory();
    } catch (error) {
      console.error("Update stock error:", error);

      setError(
        "Cannot connect to stock update API. Please make sure the backend is running.",
      );
    } finally {
      setUpdatingFoodId(null);
    }
  };

  // ====================================================
  // BULK STOCK SELECTION
  // ====================================================

  // Food ko bulk update ke liye select/deselect karna.
  const handleBulkSelection = (foodId) => {
    setSelectedFoodIds((previous) =>
      previous.includes(foodId)
        ? previous.filter((id) => id !== foodId)
        : [...previous, foodId],
    );
  };

  // Visible filtered food items ko ek saath select/deselect karna.
  const handleSelectAllVisible = () => {
    const visibleIds = sortedFoods.map((food) => food._id);

    if (visibleIds.length === 0) {
      return;
    }

    const allSelected = visibleIds.every((id) => selectedFoodIds.includes(id));

    if (allSelected) {
      setSelectedFoodIds((previous) =>
        previous.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedFoodIds((previous) => [
        ...new Set([...previous, ...visibleIds]),
      ]);
    }
  };

  // ====================================================
  // BULK STOCK UPDATE
  // ====================================================

  // Selected food items ka stock ek saath backend me update karna.
  const handleBulkStockUpdate = async () => {
    if (!token) {
      setError("Authentication token not found.");
      return;
    }

    if (selectedFoodIds.length === 0) {
      setError("Please select at least one food item.");
      return;
    }

    const updates = [];

    for (const foodId of selectedFoodIds) {
      const food = foods.find((item) => item._id === foodId);

      if (!food) {
        setError("One or more selected food items were not found.");
        return;
      }

      const inputValue = stockInputs[foodId];

      if (inputValue === "" || inputValue === undefined) {
        setError(`Please enter a valid stock quantity for ${food.name}.`);
        return;
      }

      const numericStock = Number(inputValue);

      if (
        !Number.isFinite(numericStock) ||
        !Number.isInteger(numericStock) ||
        numericStock < 0
      ) {
        setError(`Invalid stock quantity for ${food.name}.`);
        return;
      }

      updates.push({
        foodId,
        stock: numericStock,
      });
    }

    setBulkUpdating(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/foods/admin/bulk-stock",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            updates,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to perform bulk stock update.");
        return;
      }

      // Local food list ko immediately update karna.
      setFoods((previousFoods) =>
        previousFoods.map((food) => {
          const updatedFood = data.foods?.find(
            (item) => String(item._id) === String(food._id),
          );

          if (!updatedFood) {
            return food;
          }

          return {
            ...food,
            stock: Number(updatedFood.newStock || 0),
            available: Number(updatedFood.newStock || 0) > 0,
          };
        }),
      );

      // Stock input values ko updated stock ke saath sync karna.
      setStockInputs((previous) => {
        const next = { ...previous };

        data.foods?.forEach((item) => {
          next[item._id] = Number(item.newStock || 0);
        });

        return next;
      });

      // Selection clear karna.
      setSelectedFoodIds([]);

      // Inventory summary refresh.
      await fetchInventory(true);

      // Stock history refresh.
      await fetchStockHistory();
    } catch (error) {
      console.error("Bulk stock update error:", error);

      setError(
        "Cannot connect to bulk stock update API. Please make sure the backend is running.",
      );
    } finally {
      setBulkUpdating(false);
    }
  };

  // ====================================================
  // INVENTORY CATEGORIES
  // ====================================================

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        foods.map((food) => String(food.category || "").trim()).filter(Boolean),
      ),
    ];

    return ["All", ...uniqueCategories.sort()];
  }, [foods]);

  // ====================================================
  // FILTER INVENTORY
  // ====================================================

  const filteredFoods = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return foods.filter((food) => {
      const name = String(food.name || "").toLowerCase();
      const category = String(food.category || "").toLowerCase();

      const stock = Number(food.stock || 0);

      const matchesSearch =
        !search || name.includes(search) || category.includes(search);

      const matchesCategory =
        categoryFilter === "All" ||
        String(food.category || "").trim() === categoryFilter;

      let matchesStock = true;

      if (stockFilter === "In Stock") {
        matchesStock = stock > LOW_STOCK_LIMIT;
      } else if (stockFilter === "Low Stock") {
        matchesStock = stock > 0 && stock <= LOW_STOCK_LIMIT;
      } else if (stockFilter === "Out of Stock") {
        matchesStock = stock === 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [foods, searchTerm, categoryFilter, stockFilter]);

  // ====================================================
  // SORT INVENTORY
  // ====================================================

  const sortedFoods = [...filteredFoods].sort((a, b) => {
    const stockA = Number(a.stock || 0);
    const stockB = Number(b.stock || 0);

    if (stockA !== stockB) {
      return stockA - stockB;
    }

    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  // ====================================================
  // INVENTORY ANALYTICS
  // ====================================================
  // Current inventory aur stock history se useful analytics calculate karna.
  // Ye values dashboard ko real-time data ke saath update hongi.

  const inventoryAnalytics = useMemo(() => {
    const totalItems = foods.length;
    const totalUnits = foods.reduce(
      (sum, food) => sum + Number(food.stock || 0),
      0,
    );

    const lowStockCount = foods.filter((food) => {
      const stock = Number(food.stock || 0);
      return stock > 0 && stock <= LOW_STOCK_LIMIT;
    }).length;

    const outOfStockCount = foods.filter(
      (food) => Number(food.stock || 0) === 0,
    ).length;

    const healthyStockCount = Math.max(
      totalItems - lowStockCount - outOfStockCount,
      0,
    );

    const stockHealth =
      totalItems > 0 ? Math.round((healthyStockCount / totalItems) * 100) : 0;

    const averageStock =
      totalItems > 0 ? (totalUnits / totalItems).toFixed(1) : "0.0";

    const categoryMap = {};

    foods.forEach((food) => {
      const category = String(food.category || "Uncategorized").trim();
      const stock = Number(food.stock || 0);

      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          items: 0,
          units: 0,
        };
      }

      categoryMap[category].items += 1;
      categoryMap[category].units += stock;
    });

    const categories = Object.values(categoryMap).sort(
      (a, b) => b.units - a.units,
    );

    const increases = stockHistory.reduce((sum, history) => {
      const change = Number(history.change || 0);
      return change > 0 ? sum + change : sum;
    }, 0);

    const decreases = stockHistory.reduce((sum, history) => {
      const change = Number(history.change || 0);
      return change < 0 ? sum + Math.abs(change) : sum;
    }, 0);

    const netMovement = increases - decreases;

    return {
      totalItems,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      healthyStockCount,
      stockHealth,
      averageStock,
      categories,
      increases,
      decreases,
      netMovement,
      adjustmentCount: stockHistory.length,
    };
  }, [foods, stockHistory, LOW_STOCK_LIMIT]);

  // ====================================================
  // STOCK STATUS HELPER
  // ====================================================

  const getStockStatus = (stock) => {
    const numericStock = Number(stock || 0);

    if (numericStock <= 0) {
      return {
        label: "Out of Stock",
        icon: "🔴",
        className: "border-red-200 bg-red-50 text-red-700",
      };
    }

    if (numericStock <= LOW_STOCK_LIMIT) {
      return {
        label: "Low Stock",
        icon: "⚠️",
        className: "border-yellow-200 bg-yellow-50 text-yellow-700",
      };
    }

    return {
      label: "In Stock",
      icon: "🟢",
      className: "border-green-200 bg-green-50 text-green-700",
    };
  };

  // ====================================================
  // HISTORY DATE FORMATTER
  // ====================================================

  const formatHistoryDate = (dateValue) => {
    if (!dateValue) {
      return "Date unavailable";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ====================================================
  // HISTORY CHANGE HELPER
  // ====================================================

  const getHistoryChange = (history) => {
    const change = Number(history.change || 0);

    if (change > 0) {
      return {
        text: `+${change}`,
        className: "border-green-200 bg-green-50 text-green-700",
      };
    }

    if (change < 0) {
      return {
        text: `${change}`,
        className: "border-red-200 bg-red-50 text-red-700",
      };
    }

    return {
      text: "0",
      className: "border-gray-200 bg-gray-50 text-gray-600",
    };
  };

  // ====================================================
  // LATEST STOCK UPDATE BY FOOD
  // ====================================================
  // Har food ke liye fetched stock history me se latest
  // update record identify karna.

  const latestHistoryByFoodId = useMemo(() => {
    const historyMap = {};

    stockHistory.forEach((history) => {
      const foodId = history?.foodId?._id || history?.foodId || "";

      if (!foodId) {
        return;
      }

      const key = String(foodId);
      const currentDate = new Date(history.createdAt).getTime();
      const existingDate = historyMap[key]
        ? new Date(historyMap[key].createdAt).getTime()
        : -Infinity;

      if (Number.isFinite(currentDate) && currentDate > existingDate) {
        historyMap[key] = history;
      }
    });

    return historyMap;
  }, [stockHistory]);

  // Food ka latest stock update readable format me return karna.
  const getLastStockUpdate = (foodId) => {
    const history = latestHistoryByFoodId[String(foodId)];

    if (!history?.createdAt) {
      return "No updates yet";
    }

    return formatHistoryDate(history.createdAt);
  };

  // ====================================================
  // DELETED FOOD HISTORY HELPER
  // ====================================================
  // Agar history ka foodId current foods list me nahi milta,
  // to iska matlab food delete ho chuka hai.
  // Inventory API error ke time false deleted badge avoid karne ke liye
  // current inventory request successful hona bhi required hai.

  const isDeletedFoodHistory = (history) => {
    const historyFoodId = history?.foodId?._id || history?.foodId || "";

    if (!historyFoodId || loading || error) {
      return false;
    }

    return !foods.some(
      (food) => String(food?._id || "") === String(historyFoodId),
    );
  };

  const handleExportInventory = () => {
    if (sortedFoods.length === 0) return;

    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = [
      [
        "Food",
        "Category",
        "Stock",
        "Status",
        "Availability",
        "Last Stock Update",
      ],
      ...sortedFoods.map((food) => [
        food.name || "Unnamed Food",
        food.category || "Other",
        Number(food.stock || 0),
        getStockStatus(food.stock).label,
        food.available ? "Available" : "Unavailable",
        getLastStockUpdate(food._id),
      ]),
    ];

    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // ====================================================
  // LOADING STATE
  // ====================================================

  if (loading) {
    return (
      <section className="mt-10">
        <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-600" />

          <p className="mt-4 text-sm font-semibold text-gray-500">
            Loading inventory...
          </p>
        </div>
      </section>
    );
  }

  // ====================================================
  // MAIN INVENTORY DASHBOARD
  // ====================================================

  return (
    <section className="mt-10">
      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">
            Inventory
          </p>

          <h2 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
            📦 Inventory Management
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Monitor food stock and identify low or out-of-stock items.
          </p>
        </div>

        {/* REFRESH BUTTON */}

        <button
          type="button"
          onClick={async () => {
            await fetchInventory(true);
            await fetchStockHistory();
          }}
          disabled={refreshing || updatingFoodId !== null}
          className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? "⏳ Refreshing..." : "🔄 Refresh Inventory"}
        </button>

        {/* EXPORT INVENTORY REPORT BUTTON */}
        <button
          type="button"
          onClick={handleExportInventory}
          disabled={
            refreshing || updatingFoodId !== null || sortedFoods.length === 0
          }
          className="rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-bold text-green-700 shadow-sm transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          📥 Export Report
        </button>
      </div>

      {/* ==================================================
          ERROR MESSAGE
      ================================================== */}

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          ❌ {error}
        </div>
      )}

      {/* ==================================================
          LOW STOCK / OUT OF STOCK ALERTS
      ================================================== */}

      {(() => {
        const lowStockFoods = foods.filter((food) => {
          const stock = Number(food.stock || 0);

          return stock > 0 && stock <= LOW_STOCK_LIMIT;
        });

        const outOfStockFoods = foods.filter((food) => {
          const stock = Number(food.stock || 0);

          return stock <= 0;
        });

        return (
          <div className="mt-6 space-y-4">
            {/* OUT OF STOCK ALERT */}

            {outOfStockFoods.length > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-xl">
                    🔴
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-red-800">
                      Out of Stock Alert
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-red-700">
                      {outOfStockFoods.length} food item
                      {outOfStockFoods.length > 1 ? "s are" : " is"} currently
                      out of stock.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {outOfStockFoods.map((food) => (
                        <span
                          key={food._id}
                          className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700"
                        >
                          {food.name || "Unnamed Food"} • 0
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LOW STOCK ALERT */}

            {lowStockFoods.length > 0 && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-xl">
                    ⚠️
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-yellow-800">
                      Low Stock Alert
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-yellow-700">
                      {lowStockFoods.length} food item
                      {lowStockFoods.length > 1 ? "s have" : " has"} low stock.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {lowStockFoods.map((food) => {
                        const stock = Number(food.stock || 0);

                        return (
                          <span
                            key={food._id}
                            className="rounded-full border border-yellow-200 bg-white px-3 py-1.5 text-xs font-bold text-yellow-700"
                          >
                            {food.name || "Unnamed Food"} • {stock} left
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ALL STOCK OK */}

            {lowStockFoods.length === 0 && outOfStockFoods.length === 0 && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-xl">
                    ✅
                  </div>

                  <div>
                    <h3 className="font-black text-green-800">
                      Inventory Stock Healthy
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-green-700">
                      All food items have sufficient stock.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ==================================================
          SEARCH & FILTERS
      ================================================== */}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-black text-slate-800">
            🔎 Search & Filter Inventory
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Search food items or filter inventory by category and stock status.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* SEARCH */}

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Search Food
            </label>

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search food name..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          {/* CATEGORY */}

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Category
            </label>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* STOCK STATUS */}

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Stock Status
            </label>

            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="All">All Status</option>

              <option value="In Stock">In Stock</option>

              <option value="Low Stock">Low Stock</option>

              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* FILTER RESULT COUNT + RESET */}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-600">
            Showing {sortedFoods.length} of {foods.length} food items
          </p>

          {(searchTerm ||
            categoryFilter !== "All" ||
            stockFilter !== "All") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setCategoryFilter("All");
                setStockFilter("All");
              }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ==================================================
          BULK STOCK UPDATE
      ================================================== */}

      <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900">
              📦 Bulk Stock Update
            </h3>

            <p className="mt-1 text-sm font-semibold text-gray-500">
              Select food items and update their stock together.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllVisible}
              disabled={bulkUpdating || sortedFoods.length === 0}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sortedFoods.length > 0 &&
              sortedFoods.every((food) => selectedFoodIds.includes(food._id))
                ? "☐ Deselect Visible"
                : "☑ Select Visible"}
            </button>

            <button
              type="button"
              onClick={handleBulkStockUpdate}
              disabled={bulkUpdating || selectedFoodIds.length === 0}
              className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkUpdating
                ? "⏳ Updating..."
                : `Update Selected (${selectedFoodIds.length})`}
            </button>
          </div>
        </div>

        {selectedFoodIds.length > 0 && (
          <p className="mt-3 text-xs font-bold text-orange-700">
            {selectedFoodIds.length} food item
            {selectedFoodIds.length > 1 ? "s" : ""} selected.
          </p>
        )}
      </div>

      {/* ==================================================
          SUMMARY CARDS
      ================================================== */}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* TOTAL ITEMS */}

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-500">Total Items</p>

              <h3 className="mt-2 text-3xl font-black text-gray-900">
                {inventory.totalItems}
              </h3>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl">
              🍽️
            </div>
          </div>
        </div>

        {/* IN STOCK */}

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-500">In Stock</p>

              <h3 className="mt-2 text-3xl font-black text-green-600">
                {inventory.inStockItems}
              </h3>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-xl">
              🟢
            </div>
          </div>
        </div>

        {/* LOW STOCK */}

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-500">Low Stock</p>

              <h3 className="mt-2 text-3xl font-black text-yellow-600">
                {inventory.lowStockItems}
              </h3>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-50 text-xl">
              ⚠️
            </div>
          </div>
        </div>

        {/* OUT OF STOCK */}

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-500">
                Out of Stock
              </p>

              <h3 className="mt-2 text-3xl font-black text-red-600">
                {inventory.outOfStockItems}
              </h3>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-xl">
              🔴
            </div>
          </div>
        </div>

        {/* TOTAL STOCK QUANTITY */}

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-500">Total Stock</p>

              <h3 className="mt-2 text-3xl font-black text-blue-600">
                {inventory.totalStockQuantity}
              </h3>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
              📦
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          INVENTORY ANALYTICS
      ================================================== */}

      <div className="mt-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h3 className="text-lg font-black text-gray-900">
            📊 Inventory Analytics
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Current stock health, category distribution, and recent stock
            movement.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Stock Health
            </p>
            <p className="mt-2 text-2xl font-black text-green-600">
              {inventoryAnalytics.stockHealth}%
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              {inventoryAnalytics.healthyStockCount} healthy items
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Total Units
            </p>
            <p className="mt-2 text-2xl font-black text-blue-600">
              {inventoryAnalytics.totalUnits}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              Across {inventoryAnalytics.totalItems} items
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Average Stock
            </p>
            <p className="mt-2 text-2xl font-black text-purple-600">
              {inventoryAnalytics.averageStock}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              Units per food item
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Stock Added
            </p>
            <p className="mt-2 text-2xl font-black text-green-600">
              +{inventoryAnalytics.increases}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              From recorded adjustments
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Stock Reduced
            </p>
            <p className="mt-2 text-2xl font-black text-red-600">
              -{inventoryAnalytics.decreases}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              From recorded adjustments
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 border-t border-gray-100 p-5 lg:grid-cols-2">
          {/* CATEGORY DISTRIBUTION */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-black text-gray-900">
                Category Distribution
              </h4>
              <span className="text-xs font-bold text-gray-400">
                {inventoryAnalytics.categories.length} categories
              </span>
            </div>

            {inventoryAnalytics.categories.length === 0 ? (
              <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">
                No category data available.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {inventoryAnalytics.categories.map((item) => {
                  const maxUnits = inventoryAnalytics.categories[0]?.units || 1;
                  const percentage = Math.round((item.units / maxUnits) * 100);

                  return (
                    <div key={item.category}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-gray-700">
                          {item.category}
                        </span>
                        <span className="text-xs font-black text-gray-500">
                          {item.units} units · {item.items} items
                        </span>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-orange-500 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STOCK MOVEMENT */}
          <div>
            <h4 className="font-black text-gray-900">Recent Stock Movement</h4>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                <p className="text-xs font-bold text-green-700">
                  Stock Increased
                </p>
                <p className="mt-2 text-2xl font-black text-green-700">
                  +{inventoryAnalytics.increases}
                </p>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-bold text-red-700">
                  Stock Decreased
                </p>
                <p className="mt-2 text-2xl font-black text-red-700">
                  -{inventoryAnalytics.decreases}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-gray-600">
                  Net Movement
                </span>
                <span
                  className={`text-lg font-black ${
                    inventoryAnalytics.netMovement >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {inventoryAnalytics.netMovement > 0 ? "+" : ""}
                  {inventoryAnalytics.netMovement}
                </span>
              </div>

              <p className="mt-1 text-xs font-semibold text-gray-400">
                Based on {inventoryAnalytics.adjustmentCount} recorded stock
                adjustments.
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-yellow-50 p-3">
                <p className="text-xs font-bold text-yellow-700">Low Stock</p>
                <p className="mt-1 text-xl font-black text-yellow-700">
                  {inventoryAnalytics.lowStockCount}
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-3">
                <p className="text-xs font-bold text-red-700">Out of Stock</p>
                <p className="mt-1 text-xl font-black text-red-700">
                  {inventoryAnalytics.outOfStockCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          FOOD-WISE INVENTORY TABLE
      ================================================== */}

      <div className="mt-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h3 className="text-lg font-black text-gray-900">
            📋 Food-wise Stock
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Current inventory status of every food item.
          </p>
        </div>

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {/* BULK SELECT HEADER */}
                <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                  Select
                </th>

                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                  Food
                </th>

                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                  Category
                </th>

                <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                  Stock
                </th>

                <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                  Status
                </th>

                <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                  Availability
                </th>

                {/* LAST STOCK UPDATE */}

                <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                  Last Stock Update
                </th>

                <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                  Quick Update
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {sortedFoods.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-10 text-center text-sm font-semibold text-gray-500"
                  >
                    No food items found.
                  </td>
                </tr>
              ) : (
                sortedFoods.map((food) => {
                  const stock = Number(food.stock || 0);

                  const status = getStockStatus(stock);

                  const inputValue =
                    stockInputs[food._id] === undefined
                      ? stock
                      : stockInputs[food._id];

                  const isUpdating = updatingFoodId === food._id;

                  return (
                    <tr
                      key={food._id}
                      className="transition hover:bg-orange-50/40"
                    >
                      {/* BULK SELECT */}
                      <td className="px-5 py-5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedFoodIds.includes(food._id)}
                          onChange={() => handleBulkSelection(food._id)}
                          disabled={bulkUpdating}
                          className="h-4 w-4 cursor-pointer accent-orange-600 disabled:cursor-not-allowed"
                          aria-label={`Select ${food.name || "food"} for bulk stock update`}
                        />
                      </td>

                      {/* FOOD */}

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          {food.image ? (
                            <img
                              src={food.image}
                              alt={food.name || "Food"}
                              className="h-12 w-12 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-xl">
                              {food.icon || "🍽️"}
                            </div>
                          )}

                          <div>
                            <p className="font-black text-gray-900">
                              {food.name || "Unnamed Food"}
                            </p>

                            <p className="text-xs font-semibold text-gray-400">
                              ₹{Number(food.price || 0)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* CATEGORY */}

                      <td className="px-5 py-5 text-sm font-semibold text-gray-600">
                        {food.category || "Other"}
                      </td>

                      {/* STOCK */}

                      <td className="px-5 py-5 text-center">
                        <span className="text-lg font-black text-gray-900">
                          {stock}
                        </span>
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${status.className}`}
                        >
                          {status.icon} {status.label}
                        </span>
                      </td>

                      {/* AVAILABILITY */}

                      <td className="px-5 py-5 text-center">
                        {food.available ? (
                          <span className="font-bold text-green-600">
                            Available
                          </span>
                        ) : (
                          <span className="font-bold text-red-600">
                            Unavailable
                          </span>
                        )}
                      </td>

                      {/* LAST STOCK UPDATE */}

                      <td className="px-5 py-5 text-center">
                        <span className="text-xs font-bold text-gray-600">
                          {getLastStockUpdate(food._id)}
                        </span>
                      </td>

                      {/* QUICK STOCK UPDATE */}

                      <td className="px-5 py-5">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuickStockChange(food, -1)}
                              disabled={isUpdating || stock <= 0}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-black text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Decrease stock by 1"
                            >
                              −
                            </button>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={inputValue}
                              onChange={(event) =>
                                handleStockInputChange(
                                  food._id,
                                  event.target.value,
                                )
                              }
                              disabled={isUpdating}
                              className="w-20 rounded-lg border border-gray-200 px-2 py-2 text-center text-sm font-black text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
                            />

                            <button
                              type="button"
                              onClick={() => handleQuickStockChange(food, 1)}
                              disabled={isUpdating}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-black text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Increase stock by 1"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUpdateStock(food)}
                            disabled={
                              isUpdating ||
                              inputValue === "" ||
                              Number(inputValue) === stock
                            }
                            className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUpdating ? "⏳ Updating..." : "Update Stock"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE INVENTORY CARDS */}

        <div className="space-y-3 p-4 md:hidden">
          {sortedFoods.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center text-sm font-semibold text-gray-500">
              No food items found.
            </div>
          ) : (
            sortedFoods.map((food) => {
              const stock = Number(food.stock || 0);

              const status = getStockStatus(stock);

              const inputValue =
                stockInputs[food._id] === undefined
                  ? stock
                  : stockInputs[food._id];

              const isUpdating = updatingFoodId === food._id;

              return (
                <div
                  key={food._id}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                >
                  {/* BULK SELECT */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Bulk Select
                    </span>

                    <input
                      type="checkbox"
                      checked={selectedFoodIds.includes(food._id)}
                      onChange={() => handleBulkSelection(food._id)}
                      disabled={bulkUpdating}
                      className="h-4 w-4 cursor-pointer accent-orange-600 disabled:cursor-not-allowed"
                      aria-label={`Select ${food.name || "food"} for bulk stock update`}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    {food.image ? (
                      <img
                        src={food.image}
                        alt={food.name || "Food"}
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 text-2xl">
                        {food.icon || "🍽️"}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-black text-gray-900">
                        {food.name || "Unnamed Food"}
                      </h4>

                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        {food.category || "Other"} • ₹{Number(food.price || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-semibold text-gray-400">
                        Stock
                      </p>

                      <p className="mt-1 text-xl font-black text-gray-900">
                        {stock}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-semibold text-gray-400">
                        Status
                      </p>

                      <span
                        className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.className}`}
                      >
                        {status.icon} {status.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400">
                        Customer Availability
                      </span>

                      <span
                        className={
                          food.available
                            ? "text-xs font-black text-green-600"
                            : "text-xs font-black text-red-600"
                        }
                      >
                        {food.available ? "Available" : "Unavailable"}
                      </span>
                    </div>
                  </div>

                  {/* LAST STOCK UPDATE */}

                  <div className="mt-3 rounded-xl bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Last Stock Update
                    </p>

                    <p className="mt-1 text-sm font-black text-gray-700">
                      {getLastStockUpdate(food._id)}
                    </p>
                  </div>

                  <div className="mt-3 rounded-xl bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Quick Stock Update
                    </p>

                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickStockChange(food, -1)}
                        disabled={isUpdating || stock <= 0}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-xl font-black text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Decrease stock by 1"
                      >
                        −
                      </button>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={inputValue}
                        onChange={(event) =>
                          handleStockInputChange(food._id, event.target.value)
                        }
                        disabled={isUpdating}
                        className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-center text-base font-black text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
                      />

                      <button
                        type="button"
                        onClick={() => handleQuickStockChange(food, 1)}
                        disabled={isUpdating}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-xl font-black text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Increase stock by 1"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateStock(food)}
                      disabled={
                        isUpdating ||
                        inputValue === "" ||
                        Number(inputValue) === stock
                      }
                      className="mt-3 w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdating ? "⏳ Updating..." : "Update Stock"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ==================================================
          STOCK ADJUSTMENT HISTORY
      ================================================== */}

      <div className="mt-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        {/* HISTORY HEADER */}

        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900">
              🕒 Stock Adjustment History
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Recent manual changes made to food stock.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchStockHistory}
            disabled={historyLoading}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {historyLoading ? "⏳ Loading..." : "🔄 Refresh History"}
          </button>
        </div>

        {/* HISTORY ERROR */}

        {historyError && (
          <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            ❌ {historyError}
          </div>
        )}

        {/* HISTORY CONTENT */}

        {historyLoading ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-600" />

            <p className="mt-3 text-sm font-semibold text-gray-500">
              Loading stock history...
            </p>
          </div>
        ) : stockHistory.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-2xl">
              📋
            </div>

            <h4 className="mt-3 font-black text-gray-800">
              No Stock Adjustments Yet
            </h4>

            <p className="mt-1 text-sm font-semibold text-gray-500">
              Stock changes will appear here after an admin updates food
              inventory.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP HISTORY TABLE */}

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                      Food
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                      Previous
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                      New Stock
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                      Change
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                      Admin
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                      Reason
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                      Date & Time
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {stockHistory.map((history) => {
                    const changeInfo = getHistoryChange(history);
                    const deletedFood = isDeletedFoodHistory(history);

                    return (
                      <tr
                        key={history._id}
                        className={`transition hover:bg-orange-50/30 ${
                          deletedFood ? "bg-red-50/40" : ""
                        }`}
                      >
                        {/* FOOD */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-lg">
                              📦
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-black text-gray-900">
                                  {history.foodName || "Unknown Food"}
                                </p>

                                {deletedFood && (
                                  <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">
                                    🗑️ Deleted Food
                                  </span>
                                )}
                              </div>

                              <p className="text-xs font-semibold text-gray-400">
                                Food ID:{" "}
                                {history.foodId?._id || history.foodId || "-"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* PREVIOUS */}

                        <td className="px-5 py-4 text-center">
                          <span className="font-bold text-gray-700">
                            {Number(history.previousStock || 0)}
                          </span>
                        </td>

                        {/* NEW */}

                        <td className="px-5 py-4 text-center">
                          <span className="font-black text-gray-900">
                            {Number(history.newStock || 0)}
                          </span>
                        </td>

                        {/* CHANGE */}

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${changeInfo.className}`}
                          >
                            {changeInfo.text}
                          </span>
                        </td>

                        {/* ADMIN */}

                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-gray-700">
                            {history.adminName || "Admin"}
                          </p>

                          {history.adminId && (
                            <p className="mt-0.5 max-w-[180px] truncate text-xs font-semibold text-gray-400">
                              ID: {history.adminId}
                            </p>
                          )}
                        </td>

                        {/* REASON */}

                        <td className="px-5 py-4 text-sm font-semibold text-gray-600">
                          {history.reason || "Manual stock adjustment"}
                        </td>

                        {/* DATE */}

                        <td className="px-5 py-4 text-sm font-semibold text-gray-500">
                          {formatHistoryDate(history.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE HISTORY CARDS */}

            <div className="space-y-3 p-4 md:hidden">
              {stockHistory.map((history) => {
                const changeInfo = getHistoryChange(history);
                const deletedFood = isDeletedFoodHistory(history);

                return (
                  <div
                    key={history._id}
                    className={`rounded-2xl border p-4 ${
                      deletedFood
                        ? "border-red-200 bg-red-50/50"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    {/* FOOD HEADER */}

                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl">
                        📦
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-gray-900">
                            {history.foodName || "Unknown Food"}
                          </h4>

                          {deletedFood && (
                            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">
                              🗑️ Deleted Food
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs font-semibold text-gray-400">
                          {formatHistoryDate(history.createdAt)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${changeInfo.className}`}
                      >
                        {changeInfo.text}
                      </span>
                    </div>

                    {/* STOCK VALUES */}

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs font-semibold text-gray-400">
                          Previous Stock
                        </p>

                        <p className="mt-1 text-xl font-black text-gray-800">
                          {Number(history.previousStock || 0)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs font-semibold text-gray-400">
                          New Stock
                        </p>

                        <p className="mt-1 text-xl font-black text-gray-900">
                          {Number(history.newStock || 0)}
                        </p>
                      </div>
                    </div>

                    {/* ADMIN */}

                    <div className="mt-3 rounded-xl bg-white p-3">
                      <p className="text-xs font-semibold text-gray-400">
                        Updated By
                      </p>

                      <p className="mt-1 text-sm font-black text-gray-800">
                        {history.adminName || "Admin"}
                      </p>
                    </div>

                    {/* REASON */}

                    <div className="mt-3 rounded-xl bg-white p-3">
                      <p className="text-xs font-semibold text-gray-400">
                        Reason
                      </p>

                      <p className="mt-1 text-sm font-semibold text-gray-600">
                        {history.reason || "Manual stock adjustment"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ======================================================
// EXPORT
// ======================================================

export default InventoryDashboard;
