import { useState } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const VoterRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', aadharNumber: '', mobileNumber: '' });
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const connectWallet = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to continue.');
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
      setIsConnected(true);
      setSuccess('Wallet connected successfully!');
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err.message || 'Failed to connect wallet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Please connect your wallet first.');
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/voters/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
            const errorMessages = data.errors.map(err => err.msg).join('. ');
            throw new Error(errorMessages);
        }
        throw new Error(data.message || 'Registration failed.');
      }

      setSuccess(data.message || 'Registration successful! Waiting for admin approval.');

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <div className="p-2 sm:p-4">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
              Voter Registration
            </h2>
            <p className="text-center text-gray-500 mb-6">
              Create your account to participate in the vote.
            </p>

            {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-100 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-100 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="aadharNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Aadhaar Number
                </label>
                <input
                  type="text"
                  id="aadharNumber"
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-100 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="12-digit Aadhaar Number"
                  required
                  minLength="12"
                  maxLength="12"
                />
              </div>
              <div>
                <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  id="mobileNumber"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-100 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="10-digit Mobile Number"
                  required
                  minLength="10"
                  maxLength="10"
                />
              </div>

              {!isConnected ? (
                <Button onClick={connectWallet} disabled={isLoading} className="w-full">
                  {isLoading ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              ) : (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                  <p className="text-sm text-green-800">Wallet Connected</p>
                  <p className="text-xs font-mono text-green-700 break-all">{walletAddress}</p>
                </div>
              )}

              <Button type="submit" disabled={isLoading || !isConnected} className="w-full">
                {isLoading ? 'Registering...' : 'Complete Registration'}
              </Button>
            </form>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default VoterRegistration;
