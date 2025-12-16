import axios from "axios";

// 1. Define the base URL of your Django Backend
// Standard Django local development runs on port 8000
const BASE_URL = "http://localhost:8000/api";

// 2. Create the Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 3. Add an interceptor to attach tokens automatically
// This helps if you are using JWT tokens later in the project
api.interceptors.request.use((config) => {
  // Check if there is a token in local storage
  const authTokens = localStorage.getItem("authTokens")
    ? JSON.parse(localStorage.getItem("authTokens"))
    : null;

  // If token exists, add it to the Authorization header
  if (authTokens?.access) {
    config.headers.Authorization = `Bearer ${authTokens.access}`;
  }

  return config;
});

export default api;
