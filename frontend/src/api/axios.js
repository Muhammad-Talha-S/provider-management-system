import axios from "axios";

// 1. Create the API client
const api = axios.create({
  baseURL: "http://192.168.178.68:8000/api/", // Make sure this matches your Django URL
});

// 2. The "Interceptor" - Runs before every request
api.interceptors.request.use(
  (config) => {
    // Grab the token we saved during Login
    const token = localStorage.getItem("access");

    // If we have a token, attach it to the header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
