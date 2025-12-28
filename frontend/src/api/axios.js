import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/", // Make sure this matches your Django URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to attach the Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
