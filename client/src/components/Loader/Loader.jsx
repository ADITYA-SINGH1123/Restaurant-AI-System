// ======================================================
// LOADER COMPONENT
// ======================================================
// Ye component API, AI, payment, orders ya kisi bhi
// loading process ke time use kiya ja sakta hai.
//
// Features:
// - Professional restaurant branding
// - Animated spinner
// - Responsive design
// - Clean loading message
// - Same orange theme as the website
// ======================================================

function Loader() {
  return (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-12">
      {/* ==================================================
          LOADING CARD
      ================================================== */}
      <div className="w-full max-w-sm rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-lg">
        {/* ==================================================
            RESTAURANT ICON
        ================================================== */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-4xl shadow-sm">
          🍽️
        </div>

        {/* ==================================================
            LOADING SPINNER
        ================================================== */}
        <div className="relative mx-auto mt-7 h-12 w-12">
          {/* Outer spinner */}
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-orange-100 border-t-orange-600"></div>

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm">✨</span>
          </div>
        </div>

        {/* ==================================================
            LOADING TEXT
        ================================================== */}
        <h2 className="mt-6 text-xl font-black text-gray-900">Please Wait</h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Preparing something delicious for you...
        </p>

        {/* ==================================================
            LOADING DOTS
        ================================================== */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400"></span>

          <span
            className="h-2 w-2 animate-bounce rounded-full bg-orange-500"
            style={{ animationDelay: "150ms" }}
          ></span>

          <span
            className="h-2 w-2 animate-bounce rounded-full bg-orange-600"
            style={{ animationDelay: "300ms" }}
          ></span>
        </div>

        {/* ==================================================
            BRAND TEXT
        ================================================== */}
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-orange-500">
          RK Restaurant
        </p>
      </div>
    </div>
  );
}

export default Loader;
