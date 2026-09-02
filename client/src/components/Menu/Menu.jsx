import { useNavigate } from "react-router-dom";

// Menu component
function Menu() {
  const navigate = useNavigate();

  // Restaurant ke food items
  const menuItems = [
    {
      icon: "🍕",
      name: "Margherita Pizza",
      description: "Classic pizza with cheese and fresh tomato.",
      price: 249,
    },
    {
      icon: "🍔",
      name: "Classic Burger",
      description: "Juicy burger with fresh vegetables and cheese.",
      price: 199,
    },
    {
      icon: "🍜",
      name: "Hakka Noodles",
      description: "Hot and tasty noodles with fresh vegetables.",
      price: 179,
    },
    {
      icon: "🍗",
      name: "Crispy Chicken",
      description: "Crispy and delicious chicken served hot.",
      price: 299,
    },
    {
      icon: "🥗",
      name: "Healthy Bowl",
      description: "Fresh vegetables and healthy ingredients.",
      price: 229,
    },
    {
      icon: "🍰",
      name: "Chocolate Cake",
      description: "Soft and delicious chocolate cake.",
      price: 149,
    },
  ];

  // Add to Cart function
  const addToCart = (item) => {
    // Purana cart localStorage se lena
    const oldCart = JSON.parse(localStorage.getItem("cart")) || [];

    // Naya item cart mein add karna
    const newCart = [...oldCart, item];

    // Cart ko save karna
    localStorage.setItem("cart", JSON.stringify(newCart));

    // Cart page par jana
    navigate("/cart");
  };

  return (
    <section id="menu" className="bg-orange-50 py-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Heading */}
        <div className="text-center mb-10">
          <p className="text-orange-600 font-semibold text-lg">
            Our Popular Menu
          </p>

          <h2 className="text-4xl font-bold text-gray-900 mt-2">
            Delicious Food For You
          </h2>

          <p className="text-gray-500 mt-3">
            Choose your favorite food and enjoy a delicious meal.
          </p>
        </div>

        {/* Food Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition duration-300"
            >
              {/* Food Image / Emoji */}
              <div className="h-48 bg-orange-100 flex items-center justify-center">
                <div className="text-8xl hover:scale-110 transition duration-300">
                  {item.icon}
                </div>
              </div>

              {/* Food Details */}
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  {item.name}
                </h3>

                <p className="text-gray-500 mt-2 min-h-[48px]">
                  {item.description}
                </p>

                {/* Price + Add to Cart */}
                <div className="flex items-center justify-between mt-5">
                  <span className="text-2xl font-bold text-orange-600">
                    ₹{item.price}
                  </span>

                  <button
                    onClick={() => addToCart(item)}
                    className="bg-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-orange-700 transition"
                  >
                    🛒 Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Menu;
