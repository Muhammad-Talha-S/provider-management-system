import React, { useContext } from "react";
import AuthContext from "../context/AuthContext";
import "./LoginPage.css";

const LoginPage = () => {
  let { loginUser } = useContext(AuthContext);

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Provider Portal</h2>
        <p>Please sign in to continue</p>
        <form onSubmit={loginUser}>
          <input type="text" name="username" placeholder="Username" required />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
          />
          <button type="submit">Sign In</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
