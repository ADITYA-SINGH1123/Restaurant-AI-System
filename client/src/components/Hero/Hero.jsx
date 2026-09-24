import { Link } from "react-router-dom";

// ======================================================
// HERO COMPONENT
// ======================================================
// Website ka main hero section.
// Background mein restaurant video chalega.
// ======================================================

function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-[calc(100vh-64px)] overflow-hidden"
    >
      {/* ==================================================
          BACKGROUND VIDEO
      ================================================== */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/videos/restaurant.mp4" type="video/mp4" />
        {/* Video support na hone par fallback text */}
        Your browser does not support the video tag.
      </video>

      {/* ==================================================
          DARK OVERLAY
          Text ko video ke upar clearly visible rakhta hai.
      ================================================== */}
      <div className="absolute inset-0 bg-black/55"></div>

      {/* ==================================================
          GRADIENT OVERLAY
      ================================================== */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/35"></div>

      {/* ==================================================
          HERO CONTENT
      ================================================== */}
      <div className="relative z-10 flex min-h-[calc(100vh-64px)] items-center justify-center px-6 text-center">
        <div className="max-w-4xl">
          {/* Welcome Text */}
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-orange-300 md:text-base">
            Welcome to
          </p>

          {/* Restaurant Name */}
          <h1 className="text-5xl font-extrabold leading-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
            RK Restaurant
          </h1>

          {/* Decorative Line */}
          <div className="mx-auto mt-5 h-1 w-20 rounded-full bg-orange-500"></div>

          {/* Description */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-200 sm:text-lg md:text-xl">
            Delicious food, smart recommendations, easy ordering and a better
            dining experience — powered by AI.
          </p>

          {/* ==================================================
              BUTTONS
          ================================================== */}
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            {/* Explore Menu */}
            <Link
              to="/menu"
              className="rounded-full bg-orange-600 px-8 py-3.5 font-semibold text-white shadow-lg transition duration-300 hover:scale-105 hover:bg-orange-700"
            >
              🍴 Explore Our Food
            </Link>

            {/* AI Recommendation */}
            <Link
              to="/ai-recommendation"
              className="rounded-full border-2 border-white px-8 py-3.5 font-semibold text-white transition duration-300 hover:scale-105 hover:bg-white hover:text-gray-900"
            >
              🤖 AI Recommendation
            </Link>
          </div>

          {/* Small Tagline */}
          <p className="mt-8 text-sm text-gray-300">
            Fresh Food • Smart Choices • Easy Ordering
          </p>
        </div>
      </div>

      {/* ==================================================
          SCROLL INDICATOR
      ================================================== */}
      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-center text-white">
        <p className="text-xs uppercase tracking-widest text-gray-300">
          Explore
        </p>

        <div className="mx-auto mt-2 h-8 w-px animate-pulse bg-white/70"></div>
      </div>
    </section>
  );
}

// ======================================================
// EXPORT HERO COMPONENT
// ======================================================

export default Hero;
