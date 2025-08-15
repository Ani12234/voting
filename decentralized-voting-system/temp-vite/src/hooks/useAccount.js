import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

export const useAccount = () => {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const connectingRef = useRef(false);

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

  // Connect wallet and return address
  const connectWallet = async () => {
    if (!window.ethereum) {
      throw new Error('Please install MetaMask to continue.');
    }

    // Avoid concurrent requests that trigger MetaMask -32002 error
    if (connectingRef.current) {
      // If already connecting, try to read current accounts instead of re-requesting
      const existing = await window.ethereum.request({ method: 'eth_accounts' });
      if (existing && existing.length > 0) {
        return { address: existing[0] };
      }
      throw new Error('Please complete the pending MetaMask connection request.');
    }

    connectingRef.current = true;
    try {
      // If an account is already connected, reuse it without prompting
      const existing = await window.ethereum.request({ method: 'eth_accounts' });
      if (existing && existing.length > 0) {
        return { address: existing[0] };
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      return { address };
    } finally {
      connectingRef.current = false;
    }
  };

  // Legacy login (wallet-only, using old backend route)
  const login = async () => {
    const { address } = await connectWallet();

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

  // NEW: request OTP for Aadhaar+Email
  const requestOtp = async ({ aadhaarNumber, email }) => {
    const normalizedAadhaar = String(aadhaarNumber ?? '').replace(/\D/g, '');
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/email-auth/send-otp`, {
      aadhaarNumber: normalizedAadhaar,
      email: normalizedEmail,
    });
    return res.data;
  };

  // NEW: complete login with OTP (does on-chain register + DB upsert)
  const loginWithEmailOtp = async ({ aadhaarNumber, email, name, otp }) => {
    const cleanOtp = String(otp ?? '').trim();
    const normalizedAadhaar = String(aadhaarNumber ?? '').replace(/\D/g, '');
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    // Basic client-side validation to avoid 400s for trivial issues
    if (!normalizedAadhaar || normalizedAadhaar.length < 4) {
      throw new Error('Please enter a valid Aadhaar number.');
    }
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!cleanOtp || cleanOtp.length < 4) {
      throw new Error('Please enter the 6-digit OTP.');
    }
    // If context already has an address, use it
    if (account?.address) {
      const payload = {
        aadhaarNumber: normalizedAadhaar,
        email: normalizedEmail,
        walletAddress: account.address,
        otp: cleanOtp,
        ...(String(name ?? '').trim() ? { name: String(name).trim() } : {}),
      };
      try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/email-auth/login`, payload);
        const data = res.data;
        const newAccount = {
          token: data.token,
          address: account.address,
          role: 'voter',
          isAuthenticated: true,
          ...data.voter,
        };
        localStorage.setItem('account', JSON.stringify(newAccount));
        setAccount(newAccount);
        return newAccount;
      } catch (err) {
        console.error('Login with OTP error details (existing account):', err?.response?.status, err?.response?.data, payload);
        throw err;
      }
    }

    // Otherwise, try to read existing accounts before prompting MetaMask
    try {
      const existing = await window.ethereum?.request?.({ method: 'eth_accounts' });
      if (existing && existing.length > 0) {
        const addr = existing[0];
        const payload = {
          aadhaarNumber: normalizedAadhaar,
          email: normalizedEmail,
          walletAddress: addr,
          otp: cleanOtp,
          ...(String(name ?? '').trim() ? { name: String(name).trim() } : {}),
        };
        try {
          const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/email-auth/login`, payload);
          const data = res.data;
          const newAccount = {
            token: data.token,
            address: addr,
            role: 'voter',
            isAuthenticated: true,
            ...data.voter,
          };
          localStorage.setItem('account', JSON.stringify(newAccount));
          setAccount(newAccount);
          return newAccount;
        } catch (err) {
          console.error('Login with OTP error details (existing eth_accounts):', err?.response?.status, err?.response?.data, payload);
          throw err;
        }
      }
    } catch (_) { /* ignore */ }

    // Finally prompt user to connect wallet, with -32002 guard built-in
    const { address } = await connectWallet();
    const payload = {
      aadhaarNumber: normalizedAadhaar,
      email: normalizedEmail,
      walletAddress: address,
      otp: cleanOtp,
      ...(String(name ?? '').trim() ? { name: String(name).trim() } : {}),
    };
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/email-auth/login`, payload);
      const data = res.data;
      const newAccount = {
        token: data.token,
        address,
        role: 'voter',
        isAuthenticated: true,
        ...data.voter,
      };
      localStorage.setItem('account', JSON.stringify(newAccount));
      setAccount(newAccount);
      return newAccount;
    } catch (err) {
      console.error('Login with OTP error details (connectWallet path):', err?.response?.status, err?.response?.data, payload);
      throw err;
    }
  };

  return {
    account,
    loading,
    login,
    requestOtp,
    loginWithEmailOtp,
    disconnect,
    setAccount,
    isMetaMaskInstalled
  };
};
