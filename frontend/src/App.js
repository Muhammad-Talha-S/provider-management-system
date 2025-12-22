import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ServiceRequests from "./pages/ServiceRequests";
import Contracts from "./pages/Contracts";
import Profile from "./pages/Profile";
import Team from "./pages/Team";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import Policies from "./pages/Policies";
function App() {
  return (
    <Router>
      <div className="App">
        {/* ToastContainer allows pop-up messages to work everywhere */}
        <ToastContainer position="top-right" autoClose={3000} />

        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Login />} />

          {/* Protected Routes (Pages with Navbar) */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/requests" element={<ServiceRequests />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/profile" element={<Profile />} />
          {/* <--- NEW: Add the route here */}
          {/* <Route path="/team" element={<Team />} />*/}
          <Route path="/experts" element={<Team />} />
          {/* Catch-all: Redirect any unknown URL to Login */}
          <Route path="*" element={<Navigate to="/" />} />
          <Route path="/policies" element={<Policies />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
