import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@chakra-ui/react';
import { ethers } from 'ethers';

const VoterLogin = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const connectWallet = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/voter/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userType', 'voter');

      toast({
        title: 'Login Successful',
        description: 'You are now logged in.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate('/polls');

    } catch (err) {
      setError(err.message);
      toast({
        title: 'Login Error',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-[#111518] dark justify-center items-center px-4">
      <div className="w-full max-w-md bg-[#1c2127] rounded-xl overflow-hidden">
        <div className="p-8">
          <h1 className="text-white text-2xl font-bold text-center mb-6">Voter Login</h1>
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="pt-2">
            <button
              type="button"
              onClick={connectWallet}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#1383eb] hover:bg-[#0c6bc5] text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600"
            >
              {isLoading ? 'Connecting...' : 'Connect MetaMask & Login'}
            </button>
          </div>
          <p className="mt-6 text-center text-sm text-gray-400">
            Not registered yet?{' '}
            <button onClick={() => navigate('/register')} className="text-[#1383eb] hover:underline">
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoterLogin;
