import React, { useEffect, useState } from "react";

const CompanyUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // These match the 'role_name' column in your pgAdmin screenshot
  const AVAILABLE_ROLES = [
    "Supplier Representative",
    "Contract Coordinator",
    "Specialist",
    "Provider Admin",
  ];

  const fetchUsers = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch("http://127.0.0.1:8000/api/users/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setError("Failed to load team. You might not be an Admin.");
      }
    } catch (err) {
      console.error(err);
      setError("Network connection error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Function to Assign a new role
  const handleAssignRole = async (userId, roleName) => {
    if (!window.confirm(`Assign '${roleName}' to this user?`)) return;

    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/users/${userId}/roles/assign/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role_name: roleName }),
        }
      );

      if (response.ok) {
        fetchUsers(); // Refresh the list
      } else {
        alert("Failed to assign role.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Function to Revoke (Remove) a role
  const handleRevokeRole = async (userId, roleName) => {
    if (!window.confirm(`Remove '${roleName}' from this user?`)) return;

    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/users/${userId}/roles/revoke/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role_name: roleName }),
        }
      );

      if (response.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p style={{ padding: "40px" }}>Loading your team...</p>;

  return (
    <div style={{ padding: "30px" }}>
      <h1 style={{ color: "#2c3e50" }}>Team Management</h1>
      <p>
        Manage permissions for {users.length} employees at{" "}
        <strong>{users[0]?.provider?.name || "your company"}</strong>.
      </p>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <table style={styles.table}>
        <thead>
          <tr style={{ backgroundColor: "#f4f6f8", textAlign: "left" }}>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Roles</th>
            <th style={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={styles.td}>
                <strong>{user.full_name}</strong>
              </td>
              <td style={styles.td}>{user.email}</td>

              {/* Role Badges */}
              <td style={styles.td}>
                {user.roles &&
                  user.roles.map((role) => (
                    <span key={role} style={styles.badge}>
                      {role}
                      <button
                        onClick={() => handleRevokeRole(user.id, role)}
                        style={styles.xBtn}
                        title="Remove Role"
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </td>

              {/* Assign Dropdown */}
              <td style={styles.td}>
                <select
                  onChange={(e) => {
                    if (e.target.value)
                      handleAssignRole(user.id, e.target.value);
                    e.target.value = "";
                  }}
                  style={styles.select}
                >
                  <option value="">+ Add Role...</option>
                  {AVAILABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
    backgroundColor: "white",
    boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
  },
  th: { padding: "15px", borderBottom: "2px solid #ddd", color: "#7f8c8d" },
  td: { padding: "15px", borderBottom: "1px solid #eee" },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#e1f5fe",
    color: "#0288d1",
    padding: "5px 10px",
    borderRadius: "15px",
    marginRight: "5px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  xBtn: {
    background: "none",
    border: "none",
    color: "#d32f2f",
    marginLeft: "5px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
  },
  select: { padding: "8px", borderRadius: "4px", border: "1px solid #ccc" },
};

export default CompanyUsers;
