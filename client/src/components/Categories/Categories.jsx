// Categories component बना रहे हैं
function Categories() {
  // Restaurant की सभी food categories
  const categories = [
    {
      // Food category का icon
      icon: "🍕",

      // Category का नाम
      name: "Pizza",

      // Category का छोटा description
      description: "Cheesy & delicious pizza",
    },

    {
      // Food category का icon
      icon: "🍔",

      // Category का नाम
      name: "Burger",

      // Category का छोटा description
      description: "Fresh & juicy burgers",
    },

    {
      // Food category का icon
      icon: "🍜",

      // Category का नाम
      name: "Noodles",

      // Category का छोटा description
      description: "Hot & tasty noodles",
    },

    {
      // Food category का icon
      icon: "🍰",

      // Category का नाम
      name: "Dessert",

      // Category का छोटा description
      description: "Sweet treats for you",
    },

    {
      // Food category का icon
      icon: "🥗",

      // Category का नाम
      name: "Healthy",

      // Category का छोटा description
      description: "Fresh & healthy meals",
    },

    {
      // Food category का icon
      icon: "🍗",

      // Category का नाम
      name: "Chicken",

      // Category का छोटा description
      description: "Delicious chicken dishes",
    },

    {
      // Food category का icon
      icon: "🍟",

      // Category का नाम
      name: "Snacks",

      // Category का छोटा description
      description: "Quick & tasty snacks",
    },

    {
      // Food category का icon
      icon: "🥤",

      // Category का नाम
      name: "Drinks",

      // Category का छोटा description
      description: "Refreshing beverages",
    },
  ];

  // Component का UI return कर रहे हैं
  return (
    // पूरा Categories section
    <section id="categories" className="bg-white py-16">
      {/* Content की maximum width */}
      <div className="max-w-7xl mx-auto px-6">
        {/* Section heading */}
        <div className="text-center mb-10">
          {/* छोटा heading */}
          <p className="text-orange-600 font-semibold text-lg">
            Explore Our Food
          </p>

          {/* Main heading */}
          <h2 className="text-4xl font-bold text-gray-900 mt-2">
            Choose Your Favorite Category
          </h2>

          {/* Description */}
          <p className="text-gray-500 mt-3">
            Find your favorite food from our delicious categories.
          </p>
        </div>

        {/* Categories की grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* सभी categories से cards बना रहे हैं */}
          {categories.map((category, index) => (
            // एक category का card
            <div
              key={index}
              className="group bg-orange-50 rounded-2xl p-6 text-center cursor-pointer hover:bg-orange-600 hover:text-white transition duration-300 shadow-sm hover:shadow-lg"
            >
              {/* Category icon */}
              <div className="text-5xl mb-4 group-hover:scale-110 transition">
                {category.icon}
              </div>

              {/* Category name */}
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-white">
                {category.name}
              </h3>

              {/* Category description */}
              <p className="text-sm text-gray-500 mt-2 group-hover:text-orange-100">
                {category.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Categories component को export कर रहे हैं
export default Categories;
