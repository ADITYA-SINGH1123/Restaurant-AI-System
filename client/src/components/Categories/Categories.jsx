// ======================================================
// CATEGORIES COMPONENT
// ======================================================
// Home page par restaurant ki food categories show karta hai.
//
// Features:
// 1. Pizza
// 2. Burger
// 3. Noodles
// 4. Dessert
// 5. Healthy
// 6. Aloo Paratha
// 7. Snacks
// 8. Drinks
// 9. Category par click karne se filtered Menu open hoga
// ======================================================

import { useNavigate } from "react-router-dom";

// ======================================================
// CATEGORIES COMPONENT
// ======================================================

function Categories() {
  // Page navigation ke liye
  const navigate = useNavigate();

  // ====================================================
  // FOOD CATEGORIES
  // ====================================================

  const categories = [
    {
      icon: "🍕",
      name: "Pizza",
      description: "Cheesy & delicious pizza",
    },

    {
      icon: "🍔",
      name: "Burger",
      description: "Fresh & juicy burgers",
    },

    {
      icon: "🍜",
      name: "Noodles",
      description: "Hot & tasty noodles",
    },

    {
      icon: "🍰",
      name: "Dessert",
      description: "Sweet treats for you",
    },

    {
      icon: "🥗",
      name: "Healthy",
      description: "Fresh & healthy meals",
    },

    {
      // Chicken ko replace kiya gaya hai
      icon: "🫓",
      name: "Aloo Paratha",
      description: "Hot & crispy Indian favorite",
    },

    {
      icon: "🍟",
      name: "Snacks",
      description: "Quick & tasty snacks",
    },

    {
      icon: "🥤",
      name: "Drinks",
      description: "Refreshing beverages",
    },
  ];

  // ====================================================
  // OPEN CATEGORY
  // ====================================================
  // Category click karne par Menu page open hoga
  // aur selected category automatically filter hogi.

  const openCategory = (categoryName) => {
    // Menu page par category ke saath navigate
    navigate(`/menu?category=${encodeURIComponent(categoryName)}`);
  };

  // ====================================================
  // VIEW FULL MENU
  // ====================================================

  const openFullMenu = () => {
    // All food items show karne ke liye Menu open
    navigate("/menu");
  };

  // ====================================================
  // COMPONENT UI
  // ====================================================

  return (
    <section
      id="categories"
      className="relative overflow-hidden bg-gradient-to-b from-white via-orange-50/40 to-white py-20"
    >
      {/* ==================================================
          DECORATIVE BACKGROUND
      ================================================== */}

      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl"></div>

      <div className="pointer-events-none absolute -right-32 bottom-10 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl"></div>

      {/* ==================================================
          MAIN CONTAINER
      ================================================== */}

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* ==================================================
            SECTION HEADING
        ================================================== */}

        <div className="mx-auto max-w-3xl text-center">
          {/* Small heading */}
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-orange-600">
            Explore Our Menu
          </p>

          {/* Main heading */}
          <h2 className="mt-3 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            Choose Your
            <span className="text-orange-600"> Favorite</span>
          </h2>

          {/* Decorative line */}
          <div className="mx-auto mt-5 flex items-center justify-center gap-2">
            <div className="h-1 w-10 rounded-full bg-orange-200"></div>

            <div className="h-1 w-16 rounded-full bg-orange-600"></div>

            <div className="h-1 w-10 rounded-full bg-orange-200"></div>
          </div>

          {/* Description */}
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
            Explore delicious food categories and discover something perfect for
            your next meal.
          </p>
        </div>

        {/* ==================================================
            CATEGORY GRID
        ================================================== */}

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-5">
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => openCategory(category.name)}
              className="group relative rounded-2xl border border-orange-100 bg-white p-5 text-center shadow-sm transition duration-300 hover:-translate-y-2 hover:border-orange-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              {/* ==================================================
                  SMALL CORNER DECORATION
              ================================================== */}

              <div className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-orange-200 transition group-hover:bg-orange-500"></div>

              {/* ==================================================
                  CATEGORY ICON
              ================================================== */}

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 text-3xl transition duration-300 group-hover:scale-110 group-hover:bg-orange-100">
                {category.icon}
              </div>

              {/* ==================================================
                  CATEGORY NAME
              ================================================== */}

              <h3 className="mt-4 text-base font-extrabold text-gray-900 transition group-hover:text-orange-600">
                {category.name}
              </h3>

              {/* ==================================================
                  CATEGORY DESCRIPTION
              ================================================== */}

              <p className="mt-1 text-xs leading-5 text-gray-400">
                {category.description}
              </p>

              {/* ==================================================
                  EXPLORE BUTTON TEXT
              ================================================== */}

              <div className="mt-4 text-xs font-bold text-orange-600 transition group-hover:translate-x-1">
                Explore →
              </div>
            </button>
          ))}
        </div>

        {/* ==================================================
            FULL MENU BUTTON
        ================================================== */}

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={openFullMenu}
            className="rounded-full bg-gray-900 px-7 py-3 text-sm font-bold text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-orange-600 hover:shadow-xl"
          >
            🍽️ View Full Menu →
          </button>
        </div>
      </div>
    </section>
  );
}

// ======================================================
// EXPORT COMPONENT
// ======================================================

export default Categories;
