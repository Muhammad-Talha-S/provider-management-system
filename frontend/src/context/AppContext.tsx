// frontend/src/context/AppContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Provider, User } from "../types";
import { loginRequest } from "../api/auth";
import { meRequest, refreshRequest } from "../api/session";

type Tokens = { access: string; refresh: string };
type LoginResult = { success: true } | { success: false; error: string };

interface AppContextType {
  currentUser: User | null;
  currentProvider: Provider | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;

  setCurrentUser: (u: User | null) => void;
  setCurrentProvider: (p: Provider | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LS_ACCESS = "access_token";
const LS_REFRESH = "refresh_token";

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [booting, setBooting] = useState(true);

  const isAuthenticated = !!tokens?.access && !!currentUser;

  const logout = () => {
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    setTokens(null);
    setCurrentUser(null);
    setCurrentProvider(null);
  };

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const data = await loginRequest(email, password);

      localStorage.setItem(LS_ACCESS, data.access);
      localStorage.setItem(LS_REFRESH, data.refresh);

      setTokens({ access: data.access, refresh: data.refresh });
      setCurrentUser(data.user);
      setCurrentProvider(data.provider);

      return { success: true };
    } catch (e: any) {
      const msg = e?.message || "Invalid email or password.";
      return { success: false, error: msg };
    }
  };

  // Boot restore (your original logic)
  useEffect(() => {
    const restore = async () => {
      try {
        const access = localStorage.getItem(LS_ACCESS);
        const refresh = localStorage.getItem(LS_REFRESH);

        if (!access || !refresh) {
          setBooting(false);
          return;
        }

        try {
          const me = await meRequest(access);
          setTokens({ access, refresh });
          setCurrentUser(me.user);
          setCurrentProvider(me.provider);
          setBooting(false);
          return;
        } catch {
          // expired access -> refresh below
        }

        const refreshed = await refreshRequest(refresh);
        localStorage.setItem(LS_ACCESS, refreshed.access);

        const me2 = await meRequest(refreshed.access);
        setTokens({ access: refreshed.access, refresh });
        setCurrentUser(me2.user);
        setCurrentProvider(me2.provider);
      } catch {
        logout();
      } finally {
        setBooting(false);
      }
    };

    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * ✅ NEW: Listen for token updates triggered by authFetch, so
   * the in-memory tokens update immediately (no browser refresh needed).
   */
  useEffect(() => {
    const onTokenUpdated = () => {
      const access = localStorage.getItem(LS_ACCESS);
      const refresh = localStorage.getItem(LS_REFRESH);
      if (!access || !refresh) return;

      setTokens((prev) => {
        // preserve refresh from state if present, else use storage
        const r = prev?.refresh || refresh;
        return { access, refresh: r };
      });
    };

    const onLoggedOut = () => {
      logout();
    };

    window.addEventListener("auth:token-updated", onTokenUpdated as any);
    window.addEventListener("auth:logged-out", onLoggedOut);

    // Also handle multi-tab changes (optional but nice)
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === LS_ACCESS || ev.key === LS_REFRESH) {
        onTokenUpdated();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("auth:token-updated", onTokenUpdated as any);
      window.removeEventListener("auth:logged-out", onLoggedOut);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      currentProvider,
      tokens,
      isAuthenticated,
      login,
      logout,
      setCurrentUser,
      setCurrentProvider,
    }),
    [currentUser, currentProvider, tokens, isAuthenticated]
  );

  if (booting) {
    return <div className="p-8 text-gray-600">Loading session...</div>;
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
