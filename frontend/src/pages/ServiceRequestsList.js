import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ServiceRequestsList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRequests = async () => {
      const token = localStorage.getItem("access_token");
      try {
        // Fetch the PUBLISHED requests (as per your backend logic)
        const response = await fetch(
          "http://127.0.0.1:8000/api/service-requests/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Handle pagination (Django REST framework usually returns { count: ..., results: [] })
          setRequests(data.results || data);
        }
      } catch (error) {
        console.error("Failed to load requests", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  if (loading) return <p>Loading Marketplace...</p>;

  return (
    <div>
      <header style={{ marginBottom: "30px" }}>
        <h1 style={{ margin: 0, color: "#2c3e50" }}>Service Marketplace</h1>
        <p style={{ color: "#7f8c8d" }}>
          Browse open requests and submit your specialists.
        </p>
      </header>

      <div style={styles.grid}>
        {requests.length === 0 ? (
          <p>No open requests found right now.</p>
        ) : (
          requests.map((req) => (
            <div key={req.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.badge}>OPEN</span>
                <small style={{ color: "#95a5a6" }}>
                  ID: {req.id.substring(0, 8)}
                </small>
              </div>

              <h3 style={styles.cardTitle}>
                {req.title || "Senior Developer Needed"}
              </h3>

              <div style={styles.details}>
                {/* Adjust these fields based on what your API actually returns */}
                <p>
                  <strong>Role:</strong> {req.role_name || "Specialist"}
                </p>
                <p>
                  <strong>Start Date:</strong> {req.start_date || "ASAP"}
                </p>
              </div>

              <button
                onClick={() => navigate(`/service-requests/${req.id}`)}
                style={styles.viewBtn}
              >
                View Details & Apply
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "25px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "25px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    border: "1px solid #ecf0f1",
    display: "flex",
    flexDirection: "column",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "15px",
  },
  badge: {
    backgroundColor: "#e1f5fe",
    color: "#0288d1",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "bold",
  },
  cardTitle: { margin: "0 0 15px 0", fontSize: "18px", color: "#34495e" },
  details: {
    fontSize: "14px",
    color: "#7f8c8d",
    marginBottom: "20px",
    flex: 1,
  },
  viewBtn: {
    padding: "10px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "background 0.2s",
  },
};

export default ServiceRequestsList;
