import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface RequesterUser {
  id: number;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
}

interface RequesterContextType {
  currentRequester: RequesterUser | null;
  setRequester: (user: RequesterUser) => void;
  clearRequester: () => void;
  isSelectorOpen: boolean;
  openSelector: () => void;
  closeSelector: () => void;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'toktickit_dev_requester';

export const RequesterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRequester, setCurrentRequesterState] = useState<RequesterUser | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(!currentRequester);

  useEffect(() => {
    if (!currentRequester) {
      setIsSelectorOpen(true);
    }
  }, [currentRequester]);

  const setRequester = (user: RequesterUser) => {
    setCurrentRequesterState(user);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save requester to localStorage', e);
    }
    setIsSelectorOpen(false);
  };

  const clearRequester = () => {
    setCurrentRequesterState(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to remove requester from localStorage', e);
    }
    setIsSelectorOpen(true);
  };

  const openSelector = () => setIsSelectorOpen(true);
  const closeSelector = () => {
    if (currentRequester) {
      setIsSelectorOpen(false);
    }
  };

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        setRequester,
        clearRequester,
        isSelectorOpen,
        openSelector,
        closeSelector,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
};

export const useRequester = (): RequesterContextType => {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error('useRequester must be used within a RequesterProvider');
  }
  return context;
};
