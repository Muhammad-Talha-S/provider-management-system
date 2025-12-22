import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import {
  FaFileContract,
  FaShieldAlt,
  FaBalanceScale,
  FaDownload,
} from "react-icons/fa";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState({
    total_earnings: 0,
    active_contracts: 0,
    pending_requests: 0,
    client_rating: 4.8,
  });
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState("");

  // Fetch Data & Set Date
  useEffect(() => {
    // Set Date (e.g., "Monday, 22 Dec 2025")
    const date = new Date();
    setCurrentDate(
      date.toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );

    const fetchStats = async () => {
      try {
        const res = await api.get("/dashboard-stats/");
        setStats(res.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading-screen">
          <h2>⏳ Loading Analytics...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <Navbar />

      <div className="dashboard-container">
        {/* --- HEADER --- */}
        <div className="dashboard-header">
          <div>
            <h1>Welcome back, Provider Management (Individual) 👋</h1>
            <p className="subtitle">{currentDate} • Enterprise Portal</p>
          </div>
          <div className="header-actions">
            <button className="btn-report">Download Monthly Report</button>
          </div>
        </div>

        {/* --- STATS CARDS --- */}
        <div className="stats-grid">
          <div className="stat-card blue">
            <h3>Total Earnings</h3>
            <p className="stat-value">
              € {stats.total_earnings.toLocaleString()}
            </p>
            <span className="trend positive">↗ +12% this month</span>
          </div>

          <div className="stat-card green">
            <h3>Active Contracts</h3>
            <p className="stat-value">{stats.active_contracts}</p>
            <span className="trend">Current Projects</span>
          </div>

          <div className="stat-card orange">
            <h3>Pending Requests</h3>
            <p className="stat-value">{stats.pending_requests}</p>
            <span className="trend alert">Requires Attention</span>
          </div>

          <div className="stat-card purple">
            <h3>Client Rating</h3>
            <p className="stat-value">⭐ {stats.client_rating}/5</p>
            <span className="trend">Top Rated Provider</span>
          </div>
        </div>

        {/* --- MAIN CONTENT GRID --- */}
        <div className="dashboard-content-grid">
          {/* LEFT COLUMN: Quick Actions & Recent Activity */}
          <div className="main-column">
            <div className="section-card">
              <h3>⚡ Quick Actions</h3>
              <div className="action-buttons">
                <button
                  onClick={() => navigate("/requests")}
                  className="btn-action primary"
                >
                  View Requests
                </button>
                <button
                  onClick={() => navigate("/contracts")}
                  className="btn-action primary"
                >
                  Sign Contracts
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="btn-action secondary"
                >
                  Company Profile
                </button>
              </div>
            </div>

            <div className="section-card activity-feed">
              <h3>📝 Recent Activity</h3>
              <ul>
                <li className="activity-item">
                  <span className="icon success">✓</span>
                  <div>
                    <strong>Contract Signed</strong>
                    <p>Agreement with FraUAS finalized.</p>
                  </div>
                  <span className="time">2h ago</span>
                </li>
                <li className="activity-item">
                  <span className="icon info">ℹ</span>
                  <div>
                    <strong>New Request Received</strong>
                    <p>IT Support request from Group 2.</p>
                  </div>
                  <span className="time">5h ago</span>
                </li>
                <li className="activity-item">
                  <span className="icon warning">!</span>
                  <div>
                    <strong>Policy Update</strong>
                    <p>New GDPR compliance rules added.</p>
                  </div>
                  <span className="time">1d ago</span>
                </li>
              </ul>
            </div>
          </div>

          {/* RIGHT COLUMN: GOVERNANCE & POLICIES */}
          <div className="side-column">
            <div className="section-card compliance-card">
              <h3>⚖️ Governance Center</h3>
              <p className="section-desc">
                Access company policies and legal terms.
              </p>

              <div className="policy-list">
                {/* 1. Terms */}
                <div
                  className="policy-item"
                  onClick={() => navigate("/policies")}
                >
                  <FaFileContract className="policy-icon" />
                  <div>
                    <strong>Terms & Conditions</strong>
                    <p>Updated Dec 2025</p>
                  </div>
                  <FaDownload className="download-icon" />
                </div>

                {/* 2. Privacy Policy */}
                <div
                  className="policy-item"
                  onClick={() => navigate("/policies")}
                >
                  <FaShieldAlt className="policy-icon" />
                  <div>
                    <strong>Privacy Policy</strong>
                    <p>GDPR & Data Protection</p>
                  </div>
                  <FaDownload className="download-icon" />
                </div>

                {/* 3. SLA Guidelines */}
                <div
                  className="policy-item"
                  onClick={() => navigate("/policies")}
                >
                  <FaBalanceScale className="policy-icon" />
                  <div>
                    <strong>SLA Guidelines</strong>
                    <p>Service Level Standards</p>
                  </div>
                  <FaDownload className="download-icon" />
                </div>
              </div>

              <button
                className="btn-compliance"
                onClick={() => navigate("/policies")}
              >
                View All Policies
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer className="dashboard-footer">
        <div className="footer-content">
          <p>© 2025 Group 4a Solutions. All rights reserved.</p>
          <div className="footer-links">
            <span onClick={() => navigate("/policies")}>Terms of Service</span>
            <span onClick={() => navigate("/policies")}>Privacy Policy</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
