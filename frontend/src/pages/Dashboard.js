// src/pages/Dashboard.js
import React from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

const Dashboard = () => {
  // Hardcoded Stats (In real app, fetch these from API)
  const stats = {
    earnings: "€ 12,450",
    activeJobs: 3,
    pendingRequests: 5,
    rating: "4.8/5",
  };

  return (
    <div style={{ backgroundColor: "#f4f7f6", minHeight: "100vh" }}>
      <Navbar />

      <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ color: "#333" }}>Provider Dashboard</h1>
        <p style={{ color: "#666", marginBottom: "30px" }}>
          Welcome back! Here is your business overview.
        </p>

        {/* Top Cards Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <DashboardCard
            title="Total Earnings"
            value={stats.earnings}
            color="#28a745"
          />
          <DashboardCard
            title="Active Jobs"
            value={stats.activeJobs}
            color="#17a2b8"
          />
          <DashboardCard
            title="Pending Requests"
            value={stats.pendingRequests}
            color="#ffc107"
          />
          <DashboardCard
            title="Client Rating"
            value={stats.rating}
            color="#6c757d"
          />
        </div>

        {/* Quick Actions & Recent Activity */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "20px",
          }}
        >
          {/* Main Area */}
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
            }}
          >
            <h2>Quick Actions</h2>
            <div style={{ display: "flex", gap: "15px", marginTop: "15px" }}>
              <Link to="/requests" style={actionBtnStyle}>
                🔍 Find New Jobs
              </Link>
              <Link to="/contracts" style={actionBtnStyle}>
                📝 Review Contracts
              </Link>
              <Link to="/profile" style={actionBtnStyle}>
                ⚙️ Edit Profile
              </Link>
            </div>
          </div>

          {/* Activity Feed */}
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
            }}
          >
            <h3>Recent Activity</h3>
            <ul style={{ listStyle: "none", padding: 0, marginTop: "15px" }}>
              <li style={activityItemStyle}>
                ✅ Signed contract with Client A
              </li>
              <li style={activityItemStyle}>📩 New offer request received</li>
              <li style={activityItemStyle}>💰 Payment of €4,000 received</li>
              <li style={activityItemStyle}>⚠️ Profile incomplete</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Helper Components for styling
const DashboardCard = ({ title, value, color }) => (
  <div
    style={{
      background: "white",
      padding: "20px",
      borderRadius: "8px",
      borderLeft: `5px solid ${color}`,
      boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
    }}
  >
    <h3 style={{ margin: 0, fontSize: "14px", color: "#999" }}>{title}</h3>
    <p style={{ margin: "10px 0 0", fontSize: "24px", fontWeight: "bold" }}>
      {value}
    </p>
  </div>
);

const actionBtnStyle = {
  padding: "12px 20px",
  backgroundColor: "#007bff",
  color: "white",
  textDecoration: "none",
  borderRadius: "5px",
  fontWeight: "bold",
  fontSize: "14px",
};

const activityItemStyle = {
  padding: "10px 0",
  borderBottom: "1px solid #eee",
  fontSize: "14px",
  color: "#555",
};

export default Dashboard;
