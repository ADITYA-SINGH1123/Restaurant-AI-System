// SearchBar component
// Ye component restaurant ke food items ko search karne ke liye use hoga.

function SearchBar() {
  return (
    // Search section ka main container
    <section className="bg-white px-6 py-8">
      {/* Search bar ki maximum width */}
      <div className="mx-auto max-w-3xl">
        {/* Search input ka container */}
        <div className="flex items-center rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 shadow-sm focus-within:border-orange-600">
          {/* Search icon */}
          <span className="mr-3 text-2xl">🔎</span>

          {/* Food search input */}
          <input
            type="text"
            placeholder="Search your favorite food..."
            className="w-full bg-transparent text-gray-700 outline-none"
          />

          {/* Search button */}
          <button
            type="button"
            className="rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700 transition"
          >
            Search
          </button>
        </div>
      </div>
    </section>
  );
}

// SearchBar component ko export kar rahe hain
export default SearchBar;
