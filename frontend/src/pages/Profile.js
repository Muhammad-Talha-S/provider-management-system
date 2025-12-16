// src/pages/Profile.js
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";

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

        // --- MOCK DATA FOR TESTING UI (Delete this block when Backend is ready) ---
        setProfile({
          companyName: "Tech Solutions GmbH",
          address: "Mainzer Landstraße 50, Frankfurt",
          taxId: "DE123456789",
          contactEmail: "info@techsolutions.de",
        });
        setLoading(false);
        // -----------------------------------------------------------------------
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
      await api.put("/profile/", profile); // Update backend
      setMessage("Profile updated successfully!");
    } catch (error) {
      setMessage("Error updating profile.");
      console.error(error);
    }
  };

  return (
    <div>
      <Navbar />
      <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        <h1>Company Profile</h1>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            <div>
              <label>
                <strong>Company Name:</strong>
              </label>
              <input
                type="text"
                name="companyName"
                value={profile.companyName}
                onChange={handleChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div>
              <label>
                <strong>Address:</strong>
              </label>
              <input
                type="text"
                name="address"
                value={profile.address}
                onChange={handleChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div>
              <label>
                <strong>Tax ID:</strong>
              </label>
              <input
                type="text"
                name="taxId"
                value={profile.taxId}
                onChange={handleChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div>
              <label>
                <strong>Contact Email:</strong>
              </label>
              <input
                type="email"
                name="contactEmail"
                value={profile.contactEmail}
                onChange={handleChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: "10px",
                background: "#28a745",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Save Changes
            </button>

            {message && <p style={{ color: "green" }}>{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;
