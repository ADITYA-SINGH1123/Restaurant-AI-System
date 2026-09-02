// Loader component
// Ye component API, AI, payment ya kisi bhi loading process ke time use hoga.

function Loader() {
  return (
    // Loading area ka main container
    <div className="flex min-h-40 items-center justify-center">
      {/* Loading content */}
      <div className="text-center">
        {/* Animated loading spinner */}
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600"></div>

        {/* Loading text */}
        <p className="mt-4 font-medium text-gray-600">Please wait...</p>
      </div>
    </div>
  );
}

// Loader component ko export kar rahe hain
export default Loader;
