import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const DemoAadhaarAdmin = () => {
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Simple validations
    const onlyDigits = aadhaarNumber.replace(/\D/g, '');
    if (onlyDigits.length !== 12) {
      setError('Aadhaar number must be exactly 12 digits');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/aadhaar-admin/add`, {
        aadhaarNumber: onlyDigits,
        email: email.trim().toLowerCase(),
      });
      if (res.data?.success) {
        setSuccess('Record added to Excel and cache reloaded. You can now use this Aadhaar+Email to request OTP.');
        setAadhaarNumber('');
        setEmail('');
      } else {
        setError(res.data?.message || 'Failed to add record');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to add record';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="p-4 sm:p-6">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Demo: Add Aadhaar + Email</h2>
            <p className="text-sm text-gray-500 mb-4">This writes to the server Excel file and reloads the in-memory cache. Demo only.</p>

            {error && (
              <div className="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">{error}</div>
            )}
            {success && (
              <div className="mb-3 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">{success}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Aadhaar Number</label>
                <input
                  type="text"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  placeholder="123412341234"
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full border rounded p-2"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Adding...' : 'Add to Excel'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={() => navigate('/login')} className="text-blue-600 hover:underline text-sm">
                Go to Login
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DemoAadhaarAdmin;
