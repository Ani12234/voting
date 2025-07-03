import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';

const AdminLogin = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!walletAddress || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      console.log('Attempting login to:', `${API_BASE_URL}/api/auth/login`);
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: walletAddress.trim(),
          password: password.trim()
        }),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Handle validation errors or other error messages from the server
        let errorMessage = 'Login failed';
        
        if (data.errors && Array.isArray(data.errors)) {
          errorMessage = data.errors
            .map(err => {
              if (typeof err === 'string') return err;
              if (err.msg) return err.msg;
              return JSON.stringify(err);
            })
            .join('\n');
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        const error = new Error(errorMessage);
        error.details = data.errors || [];
        throw error;
      }
      
      // Store the token in localStorage
      localStorage.setItem('adminToken', data.token);
      // Redirect to admin dashboard
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      // If we have detailed error messages, show them
      if (error.details && error.details.length > 0) {
        const errorMessages = error.details.map(err => 
          typeof err === 'string' ? err : (err.msg || JSON.stringify(err))
        );
        setError(errorMessages.join('\n'));
      } else {
        setError(error.message || 'An error occurred during login');
      }
    }
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('Password must be at least 8 characters long');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
    return errors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!walletAddress || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    // Password match validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Password strength validation
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join('\n'));
      return;
    }

    try {
      // Convert wallet address to checksum address if it's valid
      const formattedWalletAddress = walletAddress.trim().toLowerCase();
      
      console.log('Sending registration request with:', {
        walletAddress: formattedWalletAddress,
        password: '***' // Don't log actual password
      });

      console.log('Attempting registration at:', `${API_BASE_URL}/api/auth/register`);
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: formattedWalletAddress,
          password: password.trim()
        })
      });

      let data;
      try {
        data = await response.json();
        console.log('Registration response:', data);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) {
        // Handle validation errors or other error messages from the server
        let errorMessage = 'Registration failed';
        
        if (data.errors && Array.isArray(data.errors)) {
          errorMessage = data.errors
            .map(err => {
              if (typeof err === 'string') return err;
              if (err.msg) return err.msg;
              return JSON.stringify(err);
            })
            .join('\n');
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        const error = new Error(errorMessage);
        error.details = data.errors || [];
        throw error;
      }
      
      // After successful registration, switch to login tab and clear form
      setIsRegistering(false);
      setWalletAddress('');
      setPassword('');
      setConfirmPassword('');
      setError('Registration successful! Please log in.');
    } catch (error) {
      console.error('Registration error:', error);
      // If we have detailed error messages, show them
      if (error.details && error.details.length > 0) {
        const errorMessages = error.details.map(err => 
          typeof err === 'string' ? err : (err.msg || JSON.stringify(err))
        );
        setError(errorMessages.join('\n'));
      } else {
        setError(error.message || 'An error occurred during registration');
      }
    }
  };

  const toggleForm = (e) => {
    e.preventDefault();
    setIsRegistering(!isRegistering);
    setError('');
  };

  return (
    <div className="admin-login">
      <h2>{isRegistering ? 'Admin Registration' : 'Admin Sign In'}</h2>
      
      <div className="tabs">
        <button 
          className={`tab ${!isRegistering ? 'active' : ''}`}
          onClick={() => setIsRegistering(false)}
        >
          Sign In
        </button>
        <button 
          className={`tab ${isRegistering ? 'active' : ''}`}
          onClick={() => setIsRegistering(true)}
        >
          Register
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className={`tab-content ${!isRegistering ? 'active' : ''}`}>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="wallet-address">Wallet Address</label>
            <input
              type="text"
              id="wallet-address"
              className="form-control"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn">
            Sign In
          </button>
        </form>
        
        <p className="toggle-text">
          Don't have an account?{' '}
          <a href="#" className="toggle-link" onClick={toggleForm}>
            Register
          </a>
        </p>
      </div>
      
      <div className={`tab-content ${isRegistering ? 'active' : ''}`}>
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="reg-wallet-address">Wallet Address</label>
            <input
              type="text"
              id="reg-wallet-address"
              className="form-control"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <input
              type="password"
              id="reg-password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              type="password"
              id="confirm-password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn">
            Register
          </button>
        </form>
        
        <p className="toggle-text">
          Already have an account?{' '}
          <a href="#" className="toggle-link" onClick={toggleForm}>
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
