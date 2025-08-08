import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAccountContext } from '../context/AccountContext';

const VoterLogin = () => {
  const navigate = useNavigate();
  const { requestOtp, loginWithEmailOtp, isMetaMaskInstalled } = useAccountContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOtp = async () => {
    setError('');
    setInfo('');
    setIsLoading(true);
    try {
      await requestOtp({ aadhaarNumber, email });
      setOtpSent(true);
      setInfo('OTP sent to your email. Check inbox/spam.');
    } catch (err) {
      console.error('Send OTP error:', err);
      const msg = err?.response?.data?.message || err.message || 'Failed to send OTP';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndLogin = async () => {
    setError('');
    setInfo('');
    setIsLoading(true);
    try {
      await loginWithEmailOtp({ aadhaarNumber, email, name, otp });
      navigate('/dashboard');
    } catch (err) {
      console.error('Login with OTP error:', err);
      const msg = err?.response?.data?.message || err.message || 'Login failed';
      setError(msg);
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
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Voter Login</h2>
            <p className="text-center text-gray-500 mb-6">Login via Aadhaar + Email OTP (wallet required)</p>

            {!isMetaMaskInstalled && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md text-sm">
                MetaMask is not installed. Please install it to continue.
              </div>
            )}

            {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">{error}</div>}
            {info && <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">{info}</div>}

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Aadhaar Number</label>
                <input
                  className="w-full border rounded p-2"
                  placeholder="123412341234"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input
                  className="w-full border rounded p-2"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name (optional)</label>
                <input
                  className="w-full border rounded p-2"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {!otpSent ? (
              <Button onClick={handleSendOtp} disabled={isLoading || !isMetaMaskInstalled || !aadhaarNumber || !email} className="w-full">
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Enter OTP</label>
                  <input
                    className="w-full border rounded p-2"
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
                <Button onClick={handleVerifyAndLogin} disabled={isLoading || !isMetaMaskInstalled || !otp} className="w-full">
                  {isLoading ? 'Verifying...' : 'Verify & Login'}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default VoterLogin;
