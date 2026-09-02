// FoodDetails component
// Ye component future mein selected food ki complete details show karega.

function FoodDetails() {
  return (
    // Main food details container
    <section className="min-h-screen bg-gray-50 px-6 py-12">
      {/* Page heading */}
      <div className="mx-auto max-w-6xl text-center">
        {/* Small heading */}
        <p className="text-orange-600 font-semibold">🍽️ Food Details</p>

        {/* Main heading */}
        <h1 className="mt-2 text-4xl font-bold text-gray-900">
          Delicious Food
        </h1>

        {/* Description */}
        <p className="mt-3 text-gray-500">
          Select a food item to see its details, price and order options.
        </p>
      </div>

      {/* Food details card */}
      <div className="mx-auto mt-10 max-w-4xl rounded-2xl bg-white p-8 shadow-md">
        {/* Food image placeholder */}
        <div className="flex h-64 items-center justify-center rounded-xl bg-orange-50 text-7xl">
          🍕
        </div>

        {/* Food information */}
        <div className="mt-6">
          {/* Food name */}
          <h2 className="text-3xl font-bold text-gray-900">Cheese Pizza</h2>

          {/* Food description */}
          <p className="mt-3 text-gray-500">
            Delicious cheese pizza prepared with fresh ingredients and special
            restaurant sauce.
          </p>

          {/* Price */}
          <p className="mt-5 text-2xl font-bold text-orange-600">₹299</p>

          {/* Add to cart button */}
          <button className="mt-6 rounded-lg bg-orange-600 px-7 py-3 font-semibold text-white hover:bg-orange-700">
            🛒 Add to Cart
          </button>
        </div>
      </div>
    </section>
  );
}

// Export FoodDetails component
export default FoodDetails;
