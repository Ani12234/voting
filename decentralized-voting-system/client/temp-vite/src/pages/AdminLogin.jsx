import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAccountContext } from '../context/AccountContext.jsx'; // Import the context hook

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminLogin = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setAccount } = useAccountContext(); // Get the setAccount function for state management

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        walletAddress,
        password,
      });

      if (response.data.success) {
        const adminAccount = {
          ...response.data.admin,
          address: walletAddress, // Ensure the address is part of the account object
          token: response.data.token,
          isAdmin: true,
          isAuthenticated: true,
        };
        
        // Persist to localStorage for session continuity, using the same key as voter login
        localStorage.setItem('account', JSON.stringify(adminAccount));
        
        // Update the live context state
        setAccount(adminAccount);

        navigate('/admin/dashboard');
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'An error occurred. Please check the console.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center text-gray-900">Admin Login</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            label="Wallet Address"
            name="walletAddress"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Logging In...' : 'Login'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
