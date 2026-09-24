// ======================================================
// SEARCH BAR COMPONENT
// ======================================================
// Ye component restaurant ke food items ko search karne
// ke liye use hoga.
// UI ko professional aur responsive banaya gaya hai.
// ======================================================

function SearchBar() {
  return (
    <section className="bg-orange-50 px-4 py-8 sm:px-6">
      {/* Main search container */}
      <div className="mx-auto max-w-4xl">
        {/* Search heading */}
        <div className="mb-5 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">
            Find Your Favorite
          </p>

          <h2 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
            🔎 Search Food
          </h2>

          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Search for pizza, burger, noodles, dessert and more.
          </p>
        </div>

        {/* Search box */}
        <div className="group flex flex-col gap-3 rounded-2xl border border-orange-100 bg-white p-3 shadow-lg transition duration-300 hover:shadow-xl sm:flex-row sm:items-center">
          {/* Search input area */}
          <div className="flex min-w-0 flex-1 items-center rounded-xl bg-gray-50 px-4 py-3 transition duration-300 focus-within:bg-orange-50">
            {/* Search icon */}
            <span className="mr-3 text-xl sm:text-2xl">🔎</span>

            {/* Food search input */}
            <input
              type="text"
              placeholder="Search your favorite food..."
              aria-label="Search food"
              className="w-full bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400 sm:text-base"
            />

            {/* Clear button - future search functionality ke liye ready */}
            <button
              type="button"
              aria-label="Clear search"
              className="ml-2 rounded-full px-2 py-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Search button */}
          <button
            type="button"
            className="rounded-xl bg-orange-600 px-7 py-3 font-bold text-white shadow-md transition duration-300 hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-lg active:translate-y-0"
          >
            Search
          </button>
        </div>

        {/* Popular search suggestions */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold text-gray-500 sm:text-sm">
            Popular:
          </span>

          <button
            type="button"
            className="rounded-full border border-orange-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600"
          >
            🍕 Pizza
          </button>

          <button
            type="button"
            className="rounded-full border border-orange-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600"
          >
            🍔 Burger
          </button>

          <button
            type="button"
            className="rounded-full border border-orange-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600"
          >
            🍜 Noodles
          </button>

          <button
            type="button"
            className="rounded-full border border-orange-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600"
          >
            🍰 Dessert
          </button>
        </div>
      </div>
    </section>
  );
}

// ======================================================
// EXPORT
// ======================================================

export default SearchBar;
