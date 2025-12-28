import React, { useContext } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Layout = () => {
  const { user, logout, isProviderAdmin, isSupplierRep } =
    useContext(AuthContext);
  const location = useLocation();

  if (!user) return null;

  return (
    <div style={styles.container}>
      <nav style={styles.sidebar}>
        <div style={styles.brand}>
          <h2 style={{ margin: 0 }}>HanseCloud</h2>
          <span style={{ fontSize: "12px", opacity: 0.7 }}>
            {user.provider_name}
          </span>
        </div>

        <div style={styles.menu}>
          <NavLink
            to="/dashboard"
            current={location.pathname}
            label="Dashboard"
          />

          {/* EVERYONE can see requests (usually) */}
          <NavLink
            to="/service-requests"
            current={location.pathname}
            label="Service Requests"
          />

          {/* ONLY Sales Reps & Admins see "My Offers" */}
          {(isSupplierRep() || isProviderAdmin()) && (
            <NavLink
              to="/my-offers"
              current={location.pathname}
              label="My Offers"
            />
          )}

          {/* ONLY Admins see User Management */}
          {isProviderAdmin() && (
            <div
              style={{
                marginTop: "20px",
                borderTop: "1px solid #444",
                paddingTop: "10px",
              }}
            >
              <p style={styles.sectionTitle}>ADMINISTRATION</p>
              <NavLink
                to="/company-users"
                current={location.pathname}
                label="Manage Team"
              />
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <div style={styles.userInfo}>
            <strong>{user.full_name}</strong>
            <br />
            <small style={{ color: "#aaa" }}>
              {user.active_roles?.join(", ")}
            </small>
          </div>
          <button onClick={logout} style={styles.logoutBtn}>
            Log Out
          </button>
        </div>
      </nav>

      <main style={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};

// ... (Keep your NavLink and styles code exactly as it was before) ...
const NavLink = ({ to, current, label }) => (
  <Link
    to={to}
    style={{
      ...styles.link,
      backgroundColor: current === to ? "#34495e" : "transparent",
      fontWeight: current === to ? "bold" : "normal",
    }}
  >
    {label}
  </Link>
);

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    fontFamily: "Segoe UI, sans-serif",
    backgroundColor: "#f4f7f6",
  },
  sidebar: {
    width: "260px",
    backgroundColor: "#2c3e50",
    color: "white",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  brand: { padding: "20px", borderBottom: "1px solid #34495e" },
  menu: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    flex: 1,
  },
  link: {
    color: "#ecf0f1",
    textDecoration: "none",
    padding: "12px 15px",
    borderRadius: "6px",
    display: "block",
    transition: "0.2s",
  },
  sectionTitle: {
    fontSize: "11px",
    color: "#95a5a6",
    textTransform: "uppercase",
    marginBottom: "10px",
    paddingLeft: "15px",
  },
  footer: {
    padding: "20px",
    borderTop: "1px solid #34495e",
    backgroundColor: "#243342",
  },
  userInfo: { marginBottom: "15px", fontSize: "14px" },
  logoutBtn: {
    width: "100%",
    padding: "8px",
    border: "none",
    borderRadius: "4px",
    backgroundColor: "#e74c3c",
    color: "white",
    cursor: "pointer",
  },
  content: { flex: 1, padding: "40px", overflowY: "auto" },
};

export default Layout;
