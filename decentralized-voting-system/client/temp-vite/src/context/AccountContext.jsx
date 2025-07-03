import React, { createContext, useContext } from 'react';
import { useAccount } from '../hooks/useAccount';

const AccountContext = createContext(null);

export const AccountProvider = ({ children }) => {
  const accountData = useAccount();
  return (
    <AccountContext.Provider value={accountData}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccountContext = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
};
