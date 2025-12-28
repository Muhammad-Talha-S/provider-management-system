import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, isProviderAdmin, isSupplierRep } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>
        Welcome back, <strong>{user?.full_name}</strong>!
      </p>

      <div style={{ display: "flex", gap: "20px", marginTop: "30px" }}>
        {/* 1. Common Card: Market Overview */}
        <div style={styles.card} onClick={() => navigate("/service-requests")}>
          <h3>🛒 Marketplace</h3>
          <p>Browse open service requests.</p>
        </div>

        {/* 2. SALES REPS & ADMINS Only: Make Offers */}
        {(isSupplierRep() || isProviderAdmin()) && (
          <div style={styles.card} onClick={() => navigate("/my-offers")}>
            <h3>💼 My Offers</h3>
            <p>Track your submitted proposals.</p>
          </div>
        )}

        {/* 3. ADMIN Only: Manage Team */}
        {isProviderAdmin() && (
          <div
            style={{ ...styles.card, border: "1px solid green" }}
            onClick={() => navigate("/company-users")}
          >
            <h3 style={{ color: "green" }}>👥 Team Management</h3>
            <p>Add or remove users from your provider.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    width: "200px",
    cursor: "pointer",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    transition: "transform 0.2s",
  },
};

export default Dashboard;
