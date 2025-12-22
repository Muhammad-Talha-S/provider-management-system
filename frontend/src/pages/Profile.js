import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { toast } from "react-toastify";
import "./Profile.css";

const Profile = () => {
  // State for the Form
  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    taxId: "",
    contactEmail: "",
  });

  // State for the Audit Trail (History)
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Profile Data AND Logs when page loads
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Run both API calls at the same time
      const [profileRes, logsRes] = await Promise.all([
        api.get("/profile/"),
        api.get("/audit-logs/"), // <--- FIXED: Uncommented and removed '/api'
      ]);

      setFormData(profileRes.data);
      setLogs(logsRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  };

  // 2. Update state when you type
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 3. Save Changes to Backend
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.put("/profile/", formData);
      toast.success("✅ Profile updated successfully!");

      // Immediately reload the logs to show the new "Updated Profile" entry
      const logsRes = await api.get("/audit-logs/"); // <--- FIXED: Removed '/api'
      setLogs(logsRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save profile.");
    }
  };

  return (
    <div>
      <Navbar />
      <div
        className="profile-container"
        style={{ maxWidth: "800px", margin: "40px auto", padding: "20px" }}
      >
        <div className="header-section">
          <h1>Provider Profile</h1>
          <p style={{ color: "#666" }}>
            Manage your company master data and legal details.
          </p>
        </div>

        {loading ? (
          <p>Loading your data...</p>
        ) : (
          <>
            {/* --- THE FORM SECTION --- */}
            <form
              onSubmit={handleSave}
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div className="form-group">
                <label
                  style={{
                    display: "block",
                    fontWeight: "bold",
                    marginBottom: "8px",
                  }}
                >
                  Company Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group">
                <label
                  style={{
                    display: "block",
                    fontWeight: "bold",
                    marginBottom: "8px",
                  }}
                >
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group">
                <label
                  style={{
                    display: "block",
                    fontWeight: "bold",
                    marginBottom: "8px",
                  }}
                >
                  Tax ID (Legal)
                </label>
                <input
                  type="text"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group">
                <label
                  style={{
                    display: "block",
                    fontWeight: "bold",
                    marginBottom: "8px",
                  }}
                >
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: "12px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  marginTop: "10px",
                }}
              >
                Save Changes
              </button>
            </form>

            {/* --- THE AUDIT TRAIL SECTION --- */}
            <div
              style={{
                marginTop: "60px",
                borderTop: "2px solid #f3f4f6",
                paddingTop: "30px",
              }}
            >
              <h3 style={{ marginBottom: "5px" }}>🕒 Audit Trail (History)</h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "#666",
                  marginBottom: "20px",
                }}
              >
                A secure record of all changes made to this account.
              </p>

              <div
                style={{
                  background: "#f9fafb",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                }}
              >
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {logs.length === 0 ? (
                    <li
                      style={{
                        padding: "20px",
                        color: "#9ca3af",
                        fontStyle: "italic",
                        textAlign: "center",
                      }}
                    >
                      No activity recorded yet.
                    </li>
                  ) : (
                    logs.map((log) => (
                      <li
                        key={log.id}
                        style={{
                          padding: "15px 20px",
                          borderBottom: "1px solid #e5e7eb",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "14px",
                          background: "white",
                        }}
                      >
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <strong style={{ color: "#1f2937" }}>
                            {log.action}
                          </strong>
                          <span
                            style={{
                              color: "#6b7280",
                              fontSize: "13px",
                              marginTop: "4px",
                            }}
                          >
                            {log.details}
                          </span>
                        </div>
                        <span
                          style={{
                            color: "#9ca3af",
                            fontSize: "12px",
                            background: "#f3f4f6",
                            padding: "4px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          {log.timestamp}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
