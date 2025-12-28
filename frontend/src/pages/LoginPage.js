import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    console.log("Attempting Login...");

    try {
      // 1. Send Request
      // FIX: We change the key back to 'email' to match your Python Serializer
      const response = await fetch("http://127.0.0.1:8000/api/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email, // <--- Your Backend demands 'email', not 'username'
          password: password,
        }),
      });

      const data = await response.json();

      // 2. Check Success
      if (response.ok) {
        console.log("Login Success!", data);
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);
        navigate("/dashboard");
      } else {
        // 3. Handle Errors
        console.error("Server Error:", data);
        if (data.detail) {
          setError(data.detail); // "Invalid email or password"
        } else if (data.email) {
          // This captures the error from your explicit 'email = serializers.EmailField()'
          setError(`Email Error: ${data.email[0]}`);
        } else {
          setError("Login Failed. Check credentials.");
        }
      }
    } catch (err) {
      console.error("Network Error:", err);
      setError("Network Error: Is the Backend running?");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Provider Login</h2>
        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button}>
            Log In
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: { display: "flex", justifyContent: "center", marginTop: "100px" },
  card: {
    padding: "30px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    width: "300px",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: "10px",
    margin: "10px 0",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    cursor: "pointer",
  },
  error: { color: "red", fontSize: "14px", marginBottom: "10px" },
};

export default LoginPage;
