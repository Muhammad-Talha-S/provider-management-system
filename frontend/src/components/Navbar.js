import { useContext } from "react";
import AuthContext from "../context/AuthContext";
import { Link } from "react-router-dom";

const Navbar = () => {
  let { user, logoutUser } = useContext(AuthContext);

  return (
    <nav
      style={{
        padding: "15px",
        background: "#333",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* Left Side: Title and Navigation Links */}
      <div>
        <strong style={{ marginRight: "20px", fontSize: "1.2rem" }}>
          Group 4a Provider Tool
        </strong>

        <Link
          to="/"
          style={{
            color: "white",
            marginRight: "15px",
            textDecoration: "none",
          }}
        >
          Dashboard
        </Link>

        <Link
          to="/requests"
          style={{
            color: "white",
            marginRight: "15px",
            textDecoration: "none",
          }}
        >
          Requests
        </Link>

        <Link to="/profile" style={{ color: "white", textDecoration: "none" }}>
          Profile
        </Link>
      </div>

      {/* Right Side: User Info and Logout */}
      <div>
        <span style={{ marginRight: "15px" }}>
          User: <strong>{user ? user.username : "Guest"}</strong>
        </span>
        <button
          onClick={logoutUser}
          style={{
            cursor: "pointer",
            padding: "5px 10px",
            background: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
