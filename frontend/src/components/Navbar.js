import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { FaBell } from "react-icons/fa"; // Requires: npm install react-icons
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();

  // State for Notifications
  const [notifCount, setNotifCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // 1. Poll for notifications every 5 seconds
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications/");
        setNotifications(res.data);
        setNotifCount(res.data.length);
      } catch (err) {
        // Silent fail (don't annoy user if polling fails)
        console.error("Polling error", err);
      }
    };

    // Fetch immediately on load
    fetchNotifications();

    // Set up the auto-refresh timer (5000ms = 5 seconds)
    const interval = setInterval(fetchNotifications, 5000);

    // Cleanup the timer when component unmounts
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/");
  };

  const handleClearNotifications = async () => {
    try {
      await api.put("/notifications/"); // Tell backend to mark as read
      setNotifications([]);
      setNotifCount(0);
      setShowDropdown(false);
    } catch (err) {
      console.error("Failed to clear notifications");
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">PROVIDER MANAGEMENT PORTAL</div>

      <div className="nav-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/requests">Requests</Link>

        {/* ✅ Restored Experts Link */}
        <Link to="/experts">Team</Link>

        <Link to="/contracts">Contracts</Link>
        <Link to="/profile">Profile</Link>

        {/* --- NOTIFICATION BELL --- */}
        <div
          className="notif-container"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <FaBell className="bell-icon" />
          {notifCount > 0 && <span className="badge">{notifCount}</span>}

          {/* DROPDOWN MENU */}
          {showDropdown && (
            <div className="notif-dropdown">
              {notifications.length === 0 ? (
                <p className="no-notif">No new notifications</p>
              ) : (
                <>
                  {notifications.map((n) => (
                    <div key={n.id} className="notif-item">
                      <span className="notif-msg">{n.message}</span>
                      <span className="notif-time">{n.timestamp}</span>
                    </div>
                  ))}
                  <button
                    onClick={handleClearNotifications}
                    className="btn-clear"
                  >
                    Mark all as Read
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
