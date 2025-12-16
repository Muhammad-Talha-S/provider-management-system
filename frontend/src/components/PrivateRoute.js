import { Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "../context/AuthContext";

const PrivateRoute = () => {
  let { user } = useContext(AuthContext);
  // If user exists, show the page (Outlet). If not, send to Login.
  return user ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
