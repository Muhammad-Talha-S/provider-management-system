import React, { useContext } from "react";
import AuthContext from "../context/AuthContext";
import Navbar from "../components/Navbar"; // <---

const Dashboard = () => {
  let { user, logoutUser } = useContext(AuthContext);

  return (
    <div>
      {/* The Navbar sits at the top of the page */}
      <Navbar />

      <div style={{ padding: "20px" }}>
        <h1>Incoming Service Requests</h1>
        <p>Welcome, {user ? user.username : "User"}!</p>
        <p>This is where the list from User Story 08 will appear.</p>

        {/* We removed the logout button from here because it's now in the Navbar! */}
      </div>
    </div>
  );
};

export default Dashboard;
