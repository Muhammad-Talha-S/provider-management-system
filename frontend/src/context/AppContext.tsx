// src/context/AppContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User, Provider } from "../types";
import { loginRequest } from "../api/auth";

type AuthTokens = { access: string; refresh: string };

interface AppContextType {
  currentUser: User | null;
  currentProvider: Provider | null;
  isAuthenticated: boolean;
  tokens: AuthTokens | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setCurrentUser: (user: User) => void;
  setCurrentProvider: (provider: Provider | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = "pms_auth"; // localStorage key

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);

  const isAuthenticated = !!tokens?.access && !!currentUser;

  // Restore session on refresh
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { tokens: AuthTokens; user: User; provider: Provider | null };
      setTokens(parsed.tokens);
      setCurrentUser(parsed.user);
      setCurrentProvider(parsed.provider ?? null);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Persist session
  useEffect(() => {
    if (!tokens || !currentUser) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tokens, user: currentUser, provider: currentProvider })
    );
  }, [tokens, currentUser, currentProvider]);

  const login = async (email: string, password: string) => {
    try {
      const data = await loginRequest(email, password);

      // Optional: keep your inactive check, but backend already should handle it
      if ((data.user as any)?.status === "Inactive") {
        return { success: false, error: "User account is inactive. Please contact your administrator." };
      }

      setTokens({ access: data.access, refresh: data.refresh });
      setCurrentUser(data.user);
      setCurrentProvider(data.provider ?? null);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || "Login failed" };
    }
  };

  const logout = () => {
    setTokens(null);
    setCurrentUser(null);
    setCurrentProvider(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      currentUser,
      currentProvider,
      isAuthenticated,
      tokens,
      login,
      logout,
      setCurrentUser,
      setCurrentProvider,
    }),
    [currentUser, currentProvider, isAuthenticated, tokens]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
