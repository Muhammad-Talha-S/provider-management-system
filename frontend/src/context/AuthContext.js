import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const AuthContext = createContext();

export default AuthContext;

export const AuthProvider = ({ children }) => {
  // 1. Check if token exists in browser storage on load
  let [authTokens, setAuthTokens] = useState(() =>
    localStorage.getItem("authTokens")
      ? JSON.parse(localStorage.getItem("authTokens"))
      : null
  );
  let [user, setUser] = useState(() =>
    localStorage.getItem("authTokens")
      ? jwtDecode(localStorage.getItem("authTokens"))
      : null
  );

  const navigate = useNavigate();

  // 2. Login Function
  let loginUser = async (e) => {
    e.preventDefault();

    // Get values from form
    const username = e.target.username.value;
    const password = e.target.password.value;

    try {
      // POST to Django Backend (Make sure URL matches backend!)
      const response = await api.post("/token/", {
        username: username,
        password: password,
      });

      if (response.status === 200) {
        setAuthTokens(response.data);
        setUser(jwtDecode(response.data.access));
        localStorage.setItem("authTokens", JSON.stringify(response.data));
        navigate("/"); // Go to Dashboard after login
      }
    } catch (error) {
      alert(
        "Login failed! Check your username/password or backend connection."
      );
    }
  };

  // 3. Logout Function
  let logoutUser = () => {
    setAuthTokens(null);
    setUser(null);
    localStorage.removeItem("authTokens");
    navigate("/login");
  };

  let contextData = {
    user: user,
    loginUser: loginUser,
    logoutUser: logoutUser,
  };

  return (
    <AuthContext.Provider value={contextData}>{children}</AuthContext.Provider>
  );
};
