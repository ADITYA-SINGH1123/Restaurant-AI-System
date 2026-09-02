// Footer component
// Ye website ke bottom mein important links aur copyright information show karega.

function Footer() {
  return (
    // Main footer container
    <footer className="bg-gray-900 px-6 py-10 text-white">
      {/* Footer content */}
      <div className="mx-auto max-w-6xl text-center">
        {/* Restaurant name */}
        <h2 className="text-2xl font-bold text-orange-500">🍽️ AI Restaurant</h2>

        {/* Short description */}
        <p className="mt-3 text-gray-400">
          Delicious food, smart recommendations and easy ordering.
        </p>

        {/* Footer links */}
        <div className="mt-6 flex justify-center gap-6 text-sm text-gray-300">
          <span>Home</span>
          <span>Menu</span>
          <span>About</span>
          <span>Contact</span>
        </div>

        {/* Copyright */}
        <p className="mt-8 border-t border-gray-700 pt-5 text-sm text-gray-500">
          © 2026 AI Restaurant. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

// Export Footer component
export default Footer;
