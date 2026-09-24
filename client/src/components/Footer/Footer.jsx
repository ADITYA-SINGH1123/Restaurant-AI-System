import { Link } from "react-router-dom";

// ======================================================
// FOOTER COMPONENT
// ======================================================
// Website ke bottom mein restaurant branding,
// quick navigation, categories, contact information
// aur copyright details show karta hai.
// ======================================================

function Footer() {
  return (
    <footer className="bg-gray-950 text-white">
      {/* ==================================================
          MAIN FOOTER CONTENT
      ================================================== */}
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* ==================================================
              RESTAURANT BRAND
          ================================================== */}
          <div>
            <Link to="/" className="inline-block">
              <h2 className="text-2xl font-extrabold">
                <span className="text-orange-500">🍽️</span> RK Restaurant
              </h2>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-400">
              Delicious food, smart recommendations and easy ordering — creating
              a better dining experience with the power of AI.
            </p>

            {/* Restaurant location */}
            <div className="mt-5 flex items-start gap-3 text-sm text-gray-400">
              <span className="text-lg">📍</span>
              <span>
                Noida, Uttar Pradesh
                <br />
                India
              </span>
            </div>
          </div>

          {/* ==================================================
              QUICK LINKS
          ================================================== */}
          <div>
            <h3 className="text-lg font-bold text-white">Quick Links</h3>

            <div className="mt-5 flex flex-col gap-3 text-sm">
              <Link
                to="/"
                className="text-gray-400 transition hover:translate-x-1 hover:text-orange-500"
              >
                🏠 Home
              </Link>

              <Link
                to="/menu"
                className="text-gray-400 transition hover:translate-x-1 hover:text-orange-500"
              >
                🍴 Menu
              </Link>

              <Link
                to="/cart"
                className="text-gray-400 transition hover:translate-x-1 hover:text-orange-500"
              >
                🛒 Cart
              </Link>

              <Link
                to="/ai-recommendation"
                className="text-gray-400 transition hover:translate-x-1 hover:text-orange-500"
              >
                🤖 AI Recommendation
              </Link>

              <Link
                to="/my-orders"
                className="text-gray-400 transition hover:translate-x-1 hover:text-orange-500"
              >
                📦 My Orders
              </Link>
            </div>
          </div>

          {/* ==================================================
              FOOD CATEGORIES
          ================================================== */}
          <div>
            <h3 className="text-lg font-bold text-white">Popular Categories</h3>

            <div className="mt-5 flex flex-col gap-3 text-sm">
              <Link
                to="/menu?category=Pizza"
                className="text-gray-400 transition hover:text-orange-500"
              >
                🍕 Pizza
              </Link>

              <Link
                to="/menu?category=Burger"
                className="text-gray-400 transition hover:text-orange-500"
              >
                🍔 Burger
              </Link>

              <Link
                to="/menu?category=Noodles"
                className="text-gray-400 transition hover:text-orange-500"
              >
                🍜 Noodles
              </Link>

              <Link
                to="/menu?category=Dessert"
                className="text-gray-400 transition hover:text-orange-500"
              >
                🍰 Dessert
              </Link>

              <Link
                to="/menu?category=Healthy"
                className="text-gray-400 transition hover:text-orange-500"
              >
                🥗 Healthy
              </Link>

              <Link
                to="/menu?category=Drinks"
                className="text-gray-400 transition hover:text-orange-500"
              >
                🥤 Drinks
              </Link>
            </div>
          </div>

          {/* ==================================================
              CONTACT INFORMATION
          ================================================== */}
          <div>
            <h3 className="text-lg font-bold text-white">Contact Us</h3>

            <div className="mt-5 space-y-4 text-sm">
              {/* Phone */}
              <div className="flex items-start gap-3">
                <span className="text-lg">📞</span>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Phone
                  </p>

                  <p className="mt-1 text-gray-300">+91 78xxxxxxxx</p>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3">
                <span className="text-lg">📍</span>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Address
                  </p>

                  <p className="mt-1 text-gray-300">
                    Noida, Uttar Pradesh, India
                  </p>
                </div>
              </div>

              {/* Founder */}
              <div className="flex items-start gap-3">
                <span className="text-lg">👨‍💼</span>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Founder
                  </p>

                  <p className="mt-1 text-gray-300">Aditya Singh</p>
                </div>
              </div>
            </div>

            {/* AI badge */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-400">
              🤖 AI Powered Restaurant
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          BOTTOM COPYRIGHT SECTION
      ================================================== */}
      <div className="border-t border-gray-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 text-center sm:px-8 md:flex-row md:text-left lg:px-10">
          {/* Copyright */}
          <p className="text-sm text-gray-500">
            © 2026{" "}
            <span className="font-semibold text-gray-400">RK Restaurant</span>.
            All rights reserved.
          </p>

          {/* Bottom message */}
          <p className="text-sm text-gray-500">Made with ❤️ & AI technology</p>
        </div>
      </div>
    </footer>
  );
}

// ======================================================
// EXPORT FOOTER COMPONENT
// ======================================================

export default Footer;
