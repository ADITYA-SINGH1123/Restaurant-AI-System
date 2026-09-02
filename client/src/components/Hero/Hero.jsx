import { Link } from "react-router-dom";

// Hero component
function Hero() {
  return (
    // Hero section
    <section
      id="home"
      className="min-h-[calc(100vh-64px)] bg-orange-50 flex items-center"
    >
      {/* Main container */}
      <div className="max-w-7xl mx-auto px-6 py-16 w-full">
        {/* Hero को दो हिस्सों में divide कर रहे हैं */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Left Side - Restaurant Content */}
          <div>
            {/* Welcome text */}
            <p className="text-orange-600 font-semibold text-lg mb-3">
              🍽️ Welcome to AI Restaurant
            </p>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              Delicious Food
              <span className="text-orange-600">.</span>
              <br />
              Delivered With
              <span className="text-orange-600"> AI.</span>
            </h1>

            {/* Description */}
            <p className="mt-6 text-gray-600 text-lg max-w-lg">
              Discover delicious meals, smart food recommendations, easy
              ordering and fast delivery — all in one place.
            </p>

            {/* Buttons */}
            <div className="mt-8 flex flex-wrap gap-4">
              {/* Order Now Button */}
              <button className="bg-orange-600 text-white px-7 py-3 rounded-lg font-semibold hover:bg-orange-700 transition">
                🛒 Order Now
              </button>

              {/* Explore Menu Button */}
              <Link
                to="/menu"
                className="border-2 border-orange-600 text-orange-600 px-7 py-3 rounded-lg font-semibold hover:bg-orange-600 hover:text-white transition"
              >
                🍴 Explore Menu
              </Link>
            </div>
          </div>

          {/* Right Side - Food Illustration */}
          <div className="flex justify-center">
            {/* Pizza */}
            <div className="text-[180px] md:text-[240px]">🍕</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Export Hero component
export default Hero;
