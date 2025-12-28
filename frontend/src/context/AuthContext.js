import React, { createContext, useState, useEffect, useCallback } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    window.location.href = "/login";
  }, []);

  const checkUserLoggedIn = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("http://127.0.0.1:8000/api/me/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      console.error("Auth Check Failed", error);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // --- NEW ROLE HELPERS ---
  const hasRole = useCallback(
    (roleName) => {
      return user?.roles?.includes(roleName) || false;
    },
    [user]
  );

  const isProviderAdmin = useCallback(
    () => hasRole("Provider Admin"),
    [hasRole]
  );
  const isSupplierRep = useCallback(
    () => hasRole("Supplier Representative"),
    [hasRole]
  );
  const isSpecialist = useCallback(() => hasRole("Specialist"), [hasRole]);

  useEffect(() => {
    checkUserLoggedIn();
  }, [checkUserLoggedIn]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        isProviderAdmin,
        isSupplierRep,
        isSpecialist,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
