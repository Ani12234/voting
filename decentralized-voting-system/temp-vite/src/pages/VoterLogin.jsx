  const eth = getInjectedProvider();
  const isMobile = isMobileUA();

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAccountContext } from '../context/AccountContext';
import Modal from '../components/ui/Modal';
import OtpInput from '../components/ui/OtpInput';
import { getInjectedProvider, isMobileUA, openInMetaMaskDeepLink } from '../utils/wallet';

const VoterLogin = () => {
  const navigate = useNavigate();
  const { requestOtp, loginWithEmailOtp } = useAccountContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [lastOtpContext, setLastOtpContext] = useState(null); // { aadhaar, email, at }

  const normalizeAadhaar = (val) => String(val ?? '').replace(/\D/g, '');
  const normalizeEmail = (val) => String(val ?? '').trim().toLowerCase();

  const handleSendOtp = async () => {
    setError('');
    setInfo('');
    setIsLoading(true);
    try {
      const aadhaarNorm = normalizeAadhaar(aadhaarNumber);
      const emailNorm = normalizeEmail(email);
      await requestOtp({ aadhaarNumber: aadhaarNorm, email: emailNorm });
      setOtpSent(true);
      setInfo('OTP sent to your email. Check inbox/spam.');
      setShowOtpModal(true);
      const ctx = { aadhaar: aadhaarNorm, email: emailNorm, at: Date.now() };
      setLastOtpContext(ctx);
      try { sessionStorage.setItem('lastOtpContext', JSON.stringify(ctx)); } catch (_) {}
    } catch (err) {
      console.error('Send OTP error:', err);
      const errorsArray = err?.response?.data?.errors;
      const details = Array.isArray(errorsArray) ? errorsArray.map(e => e.msg).join(', ') : '';
      const msg = err?.response?.data?.message || details || err.message || 'Failed to send OTP';
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
      // Guard: ensure OTP was requested for this exact normalized pair
      const aadhaarNorm = normalizeAadhaar(aadhaarNumber);
      const emailNorm = normalizeEmail(email);
      let ctx = lastOtpContext;
      if (!ctx) {
        try { ctx = JSON.parse(sessionStorage.getItem('lastOtpContext') || 'null'); } catch (_) { ctx = null; }
      }
      if (!ctx || ctx.aadhaar !== aadhaarNorm || ctx.email !== emailNorm) {
        setIsLoading(false);
        return setError('Please request OTP for this Aadhaar and Email first.');
      }

      await loginWithEmailOtp({ aadhaarNumber, email, name, otp });
      navigate('/dashboard');
    } catch (err) {
      console.error('Login with OTP error:', err);
      const errorsArray = err?.response?.data?.errors;
      const details = Array.isArray(errorsArray) ? errorsArray.map(e => e.msg).join(', ') : '';
      const msg = err?.response?.data?.message || details || err.message || 'Login failed';
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

            {!eth && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md text-sm">
                {isMobile ? (
                  <div className="flex items-center justify-between gap-2">
                    <span>Open this page in MetaMask’s in‑app browser.</span>
                    <Button
                      type="button"
                      onClick={() => openInMetaMaskDeepLink(window.location.pathname + window.location.search)}
                      className="px-3 py-1 text-xs"
                    >
                      Open in MetaMask
                    </Button>
                  </div>
                ) : (
                  <span>
                    MetaMask is not detected. Please install it from{' '}
                    <a className="underline" href="https://metamask.io/download/" target="_blank" rel="noreferrer">metamask.io</a>.
                  </span>
                )}
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
              <Button onClick={handleSendOtp} disabled={isLoading || !aadhaarNumber || !email} className="w-full">
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Enter the 6-digit OTP sent to your email.</span>
                  <Button type="button" onClick={() => setShowOtpModal(true)} className="px-3 py-1 text-sm">
                    Enter OTP
                  </Button>
                </div>
                <Button onClick={handleVerifyAndLogin} disabled={isLoading || otp.trim().length !== 6} className="w-full">
                  {isLoading ? 'Verifying...' : 'Verify & Login'}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
      {/* OTP Modal */}
      <Modal isOpen={showOtpModal} onClose={() => setShowOtpModal(false)} title="Enter OTP">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">We sent a 6-digit code to {email}. Enter it below.</p>
          <div className="flex justify-center">
            <OtpInput length={6} value={otp} onChange={setOtp} onComplete={() => handleVerifyAndLogin()} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setShowOtpModal(false)}>
              Close
            </Button>
            <Button onClick={handleVerifyAndLogin} disabled={isLoading || otp.trim().length !== 6}>
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VoterLogin;
