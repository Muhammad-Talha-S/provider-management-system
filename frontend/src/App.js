import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ServiceRequestsList from "./pages/ServiceRequestsList";
import CompanyUsers from "./pages/CompanyUsers"; // <--- IMPORT THIS
import Layout from "./components/Layout";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/service-requests" element={<ServiceRequestsList />} />
            <Route path="/company-users" element={<CompanyUsers />} />{" "}
            {/* <--- ADD THIS */}
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
