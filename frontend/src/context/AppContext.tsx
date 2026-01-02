import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { User, Provider } from '../types';
import { mockUsers, mockProviders } from '../data/mockData';

interface AppContextType {
  currentUser: User | null;
  currentProvider: Provider | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setCurrentUser: (user: User) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Find user by email
    const user = mockUsers.find(u => u.email === email);
    
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    if (user.status === 'Inactive') {
      return { success: false, error: 'User account is inactive. Please contact your administrator.' };
    }

    // Check password (in production, this would be hashed comparison)
    if (user.password !== password) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Find provider
    const provider = mockProviders.find(p => p.id === user.providerId);
    
    setCurrentUser(user);
    setCurrentProvider(provider || null);
    setIsAuthenticated(true);

    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentProvider(null);
    setIsAuthenticated(false);
  };

  return (
    <AppContext.Provider value={{ currentUser, currentProvider, isAuthenticated, login, logout, setCurrentUser }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};