// React ke StrictMode ko import kar rahe hain
import { StrictMode } from "react";

// React application ko browser ke root element mein render karne ke liye
import { createRoot } from "react-dom/client";

// React Router ka BrowserRouter import kar rahe hain
// Ye website ke different pages/routes ko manage karega.
import { BrowserRouter } from "react-router-dom";

// Global CSS file
import "./index.css";

// Main App component
import App from "./App.jsx";

// HTML ke root element ko find karke React application start kar rahe hain
createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* BrowserRouter poori application ko routing support deta hai */}
    <BrowserRouter>
      {/* Main Restaurant application */}
      <App />
    </BrowserRouter>
  </StrictMode>,
);
