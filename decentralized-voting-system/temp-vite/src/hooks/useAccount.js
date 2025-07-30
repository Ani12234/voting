import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

export const useAccount = () => {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  const disconnect = useCallback(() => {
    localStorage.removeItem('account');
    setAccount(null);
  }, []);

  useEffect(() => {
    try {
      const storedAccount = localStorage.getItem('account');
      if (storedAccount) {
        setAccount(JSON.parse(storedAccount));
      }
    } catch (error) {
      console.error('Failed to load account from localStorage', error);
      disconnect();
    } finally {
      setLoading(false);
    }

    if (typeof window.ethereum !== 'undefined') {
      setIsMetaMaskInstalled(true);
    }

    const handleAccountsChanged = (accounts) => {
      if (!accounts.length) {
        disconnect();
      }
    };

    window.ethereum?.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [disconnect]);

  const login = async () => {
    if (!window.ethereum) {
      throw new Error('Please install MetaMask to continue.');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // Axios throws an error for non-2xx responses, which is handled by the component's try/catch.
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/voter/login`, { walletAddress: address });

    const data = response.data; // No 'await' needed here, and no '!response.ok' check.

    const newAccount = {
      token: data.token,
      address: address,
      role: 'voter',
      isAuthenticated: true,
      ...data.voter,
    };

    localStorage.setItem('account', JSON.stringify(newAccount));
    setAccount(newAccount);

    return newAccount;
  };

  return {
    account,
    loading,
    login,
    disconnect,
    setAccount,
    isMetaMaskInstalled
  };
};
