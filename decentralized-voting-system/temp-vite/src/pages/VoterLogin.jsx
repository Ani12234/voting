import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAccountContext } from '../context/AccountContext';

const VoterLogin = () => {
  const navigate = useNavigate();
  const { login, isMetaMaskInstalled } = useAccountContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await login();
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
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
              Voter Login
            </h2>
            <p className="text-center text-gray-500 mb-6">
              Connect your wallet to log in and cast your vote.
            </p>

            {!isMetaMaskInstalled && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md text-sm">
                MetaMask is not installed. Please install it to continue.
              </div>
            )}

            {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">{error}</div>}

            <Button onClick={handleLogin} disabled={isLoading || !isMetaMaskInstalled} className="w-full">
              {isLoading ? 'Logging In...' : 'Login with Wallet'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default VoterLogin;
