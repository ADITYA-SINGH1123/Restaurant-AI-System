import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// ======================================================
// PROFILE / ACCOUNT PAGE
// ======================================================
const Profile = () => {
  const navigate = useNavigate();

  // ======================================================
  // LOGGED-IN USER
  // ======================================================
  // localStorage se logged-in user ki information lena
  const [loggedInUser, setLoggedInUser] = useState(() => {
    return JSON.parse(localStorage.getItem("loggedInUser")) || null;
  });

  // ======================================================
  // EDIT PROFILE STATE
  // ======================================================
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // ======================================================
  // PROFILE UPDATE STATE
  // ======================================================
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  // ======================================================
  // LOYALTY POINTS STATE
  // ======================================================
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [pointsError, setPointsError] = useState("");

  // ======================================================
  // START EDITING
  // ======================================================
  const handleEditProfile = () => {
    setName(loggedInUser?.name || "");
    setPhone(loggedInUser?.phone || "");

    setProfileMessage("");
    setProfileError("");
    setIsEditing(true);
  };

  // ======================================================
  // CANCEL EDITING
  // ======================================================
  const handleCancelEdit = () => {
    setName(loggedInUser?.name || "");
    setPhone(loggedInUser?.phone || "");

    setProfileMessage("");
    setProfileError("");
    setIsEditing(false);
  };

  // ======================================================
  // SAVE PROFILE
  // ======================================================
  const handleSaveProfile = async () => {
    // ==================================================
    // BASIC VALIDATION
    // ==================================================
    if (!name.trim()) {
      setProfileError("Name is required.");
      setProfileMessage("");
      return;
    }

    // Phone optional hai.
    // Agar user phone enter karta hai to basic validation.
    if (phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(phone.trim())) {
      setProfileError("Please enter a valid phone number.");
      setProfileMessage("");
      return;
    }

    // ==================================================
    // GET TOKEN
    // ==================================================
    const token = localStorage.getItem("token");

    if (!token) {
      setProfileError("Login session expired. Please login again.");
      setProfileMessage("");
      return;
    }

    // ==================================================
    // START SAVING
    // ==================================================
    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    try {
      // ==================================================
      // UPDATE PROFILE API
      // ==================================================
      const response = await fetch("http://localhost:5000/api/auth/profile", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await response.json();

      // ==================================================
      // API ERROR
      // ==================================================
      if (!response.ok) {
        setProfileError(data.message || "Unable to update profile.");
        setSavingProfile(false);
        return;
      }

      // ==================================================
      // UPDATED USER DATA
      // ==================================================
      const updatedUser = {
        ...loggedInUser,
        ...data.user,
        phone: data.user?.phone || "",
      };

      // ==================================================
      // UPDATE LOCAL STORAGE
      // ==================================================
      localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));

      // ==================================================
      // UPDATE PAGE STATE
      // ==================================================
      setLoggedInUser(updatedUser);
      setName(updatedUser.name || "");
      setPhone(updatedUser.phone || "");

      // ==================================================
      // SUCCESS MESSAGE
      // ==================================================
      setProfileMessage("Profile updated successfully.");
      setProfileError("");
      setIsEditing(false);
    } catch (error) {
      console.error("Profile update error:", error);

      setProfileError("Unable to connect to server.");
      setProfileMessage("");
    } finally {
      setSavingProfile(false);
    }
  };

  // ======================================================
  // FETCH LOYALTY POINTS
  // ======================================================
  useEffect(() => {
    let isMounted = true;

    const fetchLoyaltyPoints = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        if (isMounted) {
          setLoadingPoints(false);
        }
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:5000/api/auth/loyalty-points",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          if (isMounted) {
            setPointsError(data.message || "Failed to fetch loyalty points.");
            setLoadingPoints(false);
          }
          return;
        }

        if (isMounted) {
          setLoyaltyPoints(Number(data.loyaltyPoints || 0));
          setPointsError("");
          setLoadingPoints(false);

          // ==================================================
          // SYNC USER INFORMATION
          // ==================================================
          if (data.user) {
            const currentUser =
              JSON.parse(localStorage.getItem("loggedInUser")) || {};

            const syncedUser = {
              ...currentUser,
              ...data.user,
              phone: data.user.phone || currentUser.phone || "",
              loyaltyPoints: Number(data.loyaltyPoints || 0),
            };

            localStorage.setItem("loggedInUser", JSON.stringify(syncedUser));

            setLoggedInUser(syncedUser);
          }
        }
      } catch (error) {
        console.error("Loyalty points fetch error:", error);

        if (isMounted) {
          setPointsError("Unable to load loyalty points.");
          setLoadingPoints(false);
        }
      }
    };

    fetchLoyaltyPoints();

    return () => {
      isMounted = false;
    };
  }, []);

  // ======================================================
  // LOGIN CHECK
  // ======================================================
  // Agar user login nahi hai to Login page par bhejna
  if (!loggedInUser) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            Please Login
          </h1>

          <p className="text-gray-600 mb-5">
            You need to login to view your profile.
          </p>

          <button
            onClick={() => navigate("/login")}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ======================================================
  // PROFILE PAGE
  // ======================================================
  return (
    <div className="min-h-screen bg-orange-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        {/* ==================================================
            PROFILE HEADER
        ================================================== */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">👤</div>

          <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>

          <p className="text-gray-500 mt-2">Account Information</p>
        </div>

        {/* ==================================================
            PROFILE SUCCESS MESSAGE
        ================================================== */}
        {profileMessage && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-medium text-green-700">
              ✅ {profileMessage}
            </p>
          </div>
        )}

        {/* ==================================================
            PROFILE ERROR MESSAGE
        ================================================== */}
        {profileError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-600">
              ⚠️ {profileError}
            </p>
          </div>
        )}

        {/* ==================================================
            LOYALTY POINTS CARD
        ================================================== */}
        <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">
                My Loyalty Points
              </p>

              <h2 className="text-3xl font-bold text-orange-600 mt-1">
                {loadingPoints ? "..." : loyaltyPoints}
              </h2>

              <p className="text-sm text-gray-600 mt-1">
                Earn points on delivered orders
              </p>
            </div>

            <div className="text-5xl">🪙</div>
          </div>

          {pointsError && (
            <p className="text-sm text-red-500 mt-3">{pointsError}</p>
          )}

          {!loadingPoints && !pointsError && (
            <div className="mt-4 bg-white rounded-lg px-4 py-3 border border-orange-100">
              <p className="text-sm text-gray-600">
                🎁 Keep ordering and earn more loyalty points!
              </p>
            </div>
          )}
        </div>

        {/* ==================================================
            USER INFORMATION
        ================================================== */}
        <div className="space-y-4">
          {/* ==================================================
              FULL NAME
          ================================================== */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-2">Full Name</p>

            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                maxLength={100}
              />
            ) : (
              <p className="text-lg font-semibold text-gray-800">
                {loggedInUser.name || "Not available"}
              </p>
            )}
          </div>

          {/* ==================================================
              EMAIL
          ================================================== */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-2">Email Address</p>

            <p className="text-lg font-semibold text-gray-800 break-all">
              {loggedInUser.email || "Not available"}
            </p>

            {isEditing && (
              <p className="text-xs text-gray-500 mt-2">
                Email address cannot be changed from profile.
              </p>
            )}
          </div>

          {/* ==================================================
              PHONE
          ================================================== */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-2">Phone Number</p>

            {isEditing ? (
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Enter your phone number"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                maxLength={20}
              />
            ) : (
              <p className="text-lg font-semibold text-gray-800">
                {loggedInUser.phone || "Not added"}
              </p>
            )}
          </div>

          {/* ==================================================
              ACCOUNT TYPE
          ================================================== */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">Account Type</p>

            <p className="text-lg font-semibold text-gray-800 capitalize mt-1">
              {loggedInUser.role || "Customer"}
            </p>
          </div>
        </div>

        {/* ==================================================
            EDIT PROFILE BUTTON
        ================================================== */}
        {!isEditing && (
          <button
            onClick={handleEditProfile}
            className="w-full mt-8 bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
          >
            ✏️ Edit Profile
          </button>
        )}

        {/* ==================================================
            EDIT MODE BUTTONS
        ================================================== */}
        {isEditing && (
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            {/* SAVE */}
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingProfile ? "Saving..." : "💾 Save Profile"}
            </button>

            {/* CANCEL */}
            <button
              onClick={handleCancelEdit}
              disabled={savingProfile}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              ❌ Cancel
            </button>
          </div>
        )}

        {/* ==================================================
            ACTION BUTTONS
        ================================================== */}
        <div className="flex flex-col gap-3 mt-8">
          {/* ==================================================
              MY ORDERS
          ================================================== */}
          <button
            onClick={() => navigate("/my-orders")}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
          >
            📦 My Orders
          </button>

          {/* ==================================================
              CHANGE PASSWORD
          ================================================== */}
          <button
            onClick={() => navigate("/change-password")}
            className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition"
          >
            🔐 Change Password
          </button>

          {/* ==================================================
              HOME
          ================================================== */}
          <button
            onClick={() => navigate("/")}
            className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
