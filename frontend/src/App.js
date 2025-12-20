// src/App.js
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer } from "react-toastify"; // <--- Import Toast Logic
import "react-toastify/dist/ReactToastify.css"; // <--- Import Toast CSS

// Import Pages
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ServiceRequests from "./pages/ServiceRequests";
import Contracts from "./pages/Contracts"; // <--- Import Sprint 3 Placeholder

// Import Components
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <Router>
      <AuthProvider>
        {/* Global Notification Container (Popups appear here) */}
        <ToastContainer position="top-right" autoClose={3000} />

        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes (Must be logged in) */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/requests" element={<ServiceRequests />} />
            <Route path="/contracts" element={<Contracts />} />{" "}
            {/* <--- New Route */}
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
