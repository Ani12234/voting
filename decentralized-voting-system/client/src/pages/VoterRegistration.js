import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useToast } from '@chakra-ui/react';

const VoterRegistration = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    aadharNumber: '',
    mobileNumber: '',
  });
  const [otp, setOtp] = useState('');

  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setWalletAddress(address);
      setIsConnected(true);

      toast({
        title: 'Success',
        description: 'Wallet connected successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error connecting wallet:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to connect wallet',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSendOtp = async () => {
    if (!formData.mobileNumber || !/^\d{10}$/.test(formData.mobileNumber)) {
      toast({ title: 'Error', description: 'Please enter a valid 10-digit mobile number.', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/otp/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: formData.mobileNumber }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to send OTP');
      }
      setIsOtpSent(true);
      setSuccess('OTP sent successfully to your mobile number.');
      toast({ title: 'Success', description: 'OTP sent successfully!', status: 'success', duration: 3000, isClosable: true });
    } catch (err) {
      setError(err.message);
      toast({ title: 'Error', description: err.message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !/^\d{6}$/.test(otp)) {
        toast({ title: 'Error', description: 'Please enter the 6-digit OTP.', status: 'error', duration: 3000, isClosable: true });
        return;
    }
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/otp/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: formData.mobileNumber, otp }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Invalid OTP');
      }
      setIsOtpVerified(true);
      setSuccess('Mobile number verified successfully.');
      toast({ title: 'Success', description: 'OTP verified successfully!', status: 'success', duration: 3000, isClosable: true });
    } catch (err) {
      setError(err.message);
      toast({ title: 'Error', description: err.message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setIsLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOtpVerified) {
        toast({ title: 'Verification Required', description: 'Please verify your mobile number first.', status: 'warning', duration: 3000, isClosable: true });
        return;
    }
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!isConnected) {
        throw new Error('Please connect your wallet first');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/voters/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, walletAddress }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed');
      }

      toast({
        title: 'Registration Submitted',
        description: data.message || 'Registration request submitted successfully! Waiting for admin approval.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      navigate('/polls');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message);
      toast({
        title: 'Registration Error',
        description: err.message || 'Registration failed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-[#111518] dark justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-[#1c2127] rounded-xl overflow-hidden">
        <div className="p-8">
          <h1 className="text-white text-2xl font-bold text-center mb-6">Voter Registration</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 text-green-200 rounded-md text-sm">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 bg-[#283139] border border-[#3a424e] rounded-lg text-white" placeholder="Full Name" required disabled={isOtpVerified} />
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 bg-[#283139] border border-[#3a424e] rounded-lg text-white" placeholder="you@example.com" required disabled={isOtpVerified} />
            
            <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} className="w-full px-4 py-2 bg-[#283139] border border-[#3a424e] rounded-lg text-white" placeholder="Aadhaar Number (12 digits)" required pattern="\d{12}" title="Aadhaar number must be 12 digits" disabled={isOtpVerified} />

            <div className="flex gap-2">
              <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className="w-full px-4 py-2 bg-[#283139] border border-[#3a424e] rounded-lg text-white" placeholder="Mobile Number (10 digits)" required pattern="\d{10}" title="Mobile number must be 10 digits" disabled={isOtpSent} />
              {!isOtpSent ? (
                <button type="button" onClick={handleSendOtp} disabled={isLoading} className="w-40 bg-[#1383eb] hover:bg-[#0c6bc5] text-white font-medium py-2 px-4 rounded-lg">Send OTP</button>
              ) : (
                <button type="button" disabled={true} className="w-40 bg-gray-600 text-white font-medium py-2 px-4 rounded-lg">OTP Sent</button>
              )}
            </div>

            {isOtpSent && !isOtpVerified && (
              <div className="flex gap-2">
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-4 py-2 bg-[#283139] border border-[#3a424e] rounded-lg text-white" placeholder="Enter 6-digit OTP" required />
                <button type="button" onClick={handleVerifyOtp} disabled={isLoading} className="w-40 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg">Verify OTP</button>
              </div>
            )}

            <div className="pt-2">
              {!isConnected ? (
                <button type="button" onClick={connectWallet} className="w-full flex items-center justify-center gap-2 bg-[#1383eb] hover:bg-[#0c6bc5] text-white font-medium py-2 px-4 rounded-lg">Connect MetaMask</button>
              ) : (
                <div className="p-3 bg-[#283139] rounded-lg border border-[#3a424e]">
                  <p className="text-sm text-gray-400 mb-1">Connected Wallet</p>
                  <p className="text-sm font-mono text-white break-all">{walletAddress}</p>
                </div>
              )}
            </div>
            
            <button type="submit" disabled={isLoading || !isConnected || !isOtpVerified} className={`w-full py-2 px-4 rounded-full font-medium text-white ${isLoading || !isConnected || !isOtpVerified ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#1383eb] hover:bg-[#0c6bc5]'} transition-colors`}>
              {isLoading ? 'Registering...' : 'Complete Registration'}
            </button>
          </form>
          
          <p className="mt-6 text-center text-sm text-gray-400">
            Already registered?{' '}
            <button onClick={() => navigate('/login')} className="text-[#1383eb] hover:underline">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoterRegistration;
