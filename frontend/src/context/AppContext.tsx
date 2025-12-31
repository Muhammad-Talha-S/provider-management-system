import React, { createContext, useContext, useState } from 'react';
import type { User } from '../types';
import { mockUsers } from '../data/mockData';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: any }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(mockUsers[2]); // Default to Provider Admin

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser }}>
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
