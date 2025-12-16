import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ServiceRequests from "./pages/ServiceRequests";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} /> {/* <--- Added */}
            <Route path="/requests" element={<ServiceRequests />} />{" "}
            {/* <--- Added */}
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
