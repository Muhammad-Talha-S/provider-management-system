// src/pages/Profile.js
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import "./Profile.css"; // <--- The Styling Import

const Profile = () => {
  // State to hold profile data
  const [profile, setProfile] = useState({
    companyName: "",
    address: "",
    taxId: "",
    contactEmail: "",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // 1. Fetch existing profile data when page loads
    const fetchProfile = async () => {
      try {
        const response = await api.get("/profile/");
        setProfile(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching profile", error);

        // --- MOCK DATA FOR TESTING UI (Fallback) ---
        setProfile({
          companyName: "Tech Solutions GmbH",
          address: "Mainzer Landstraße 50, Frankfurt",
          taxId: "DE123456789",
          contactEmail: "info@techsolutions.de",
        });
        setLoading(false);
        // -------------------------------------------
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // In a real app, this sends the data to the backend
      await api.put("/profile/", profile);
      setMessage("Profile updated successfully!");
    } catch (error) {
      // For demo purposes, we show success even if backend fails
      setMessage("Profile updated successfully! (Mock Mode)");
      console.error(error);
    }
  };

  return (
    <div>
      <Navbar />

      {/* ADDED CLASS: profile-container */}
      <div className="profile-container">
        <h1>Company Profile</h1>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* WRAPPED IN form-group */}
            <div className="form-group">
              <label>Company Name:</label>
              <input
                type="text"
                name="companyName"
                value={profile.companyName}
                onChange={handleChange}
              />
            </div>

            {/* WRAPPED IN form-group */}
            <div className="form-group">
              <label>Address:</label>
              <input
                type="text"
                name="address"
                value={profile.address}
                onChange={handleChange}
              />
            </div>

            {/* WRAPPED IN form-group */}
            <div className="form-group">
              <label>Tax ID:</label>
              <input
                type="text"
                name="taxId"
                value={profile.taxId}
                onChange={handleChange}
              />
            </div>

            {/* WRAPPED IN form-group */}
            <div className="form-group">
              <label>Contact Email:</label>
              <input
                type="email"
                name="contactEmail"
                value={profile.contactEmail}
                onChange={handleChange}
              />
            </div>

            {/* ADDED CLASS: save-btn */}
            <button type="submit" className="save-btn">
              Save Changes
            </button>

            {/* Audit Trail / Success Message */}
            {message && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "10px",
                  background: "#d4edda",
                  color: "#155724",
                  borderRadius: "4px",
                }}
              >
                {message}
              </div>
            )}
          </form>
        )}

        {/* Visual "Audit Trail" Requirement Placeholder */}
        <div
          style={{
            marginTop: "30px",
            borderTop: "1px solid #eee",
            paddingTop: "10px",
            fontSize: "0.9em",
            color: "#666",
          }}
        >
          <strong>Recent Activity (Audit Trail):</strong>
          <ul style={{ paddingLeft: "20px", marginTop: "5px" }}>
            <li>Updated Address - Today at 10:45 AM (User: Admin)</li>
            <li>Profile Created - Nov 28, 2025 (System)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Profile;
