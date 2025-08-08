import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { VoterRegistryABI } from '../utils/contracts';
import { VOTER_REGISTRY_CONTRACT_ADDRESS } from '../config/config.js';

const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
const SEPOLIA_RPC_URL = 'https://sepolia.infura.io/v3/df70cdc4b0064658a3b9d75568a838e0';

const ConnectWallet = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
      return true;
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: [SEPOLIA_RPC_URL],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError);
          setError('Failed to add Sepolia network to MetaMask');
          return false;
        }
      } else {
        console.error('Error switching to Sepolia:', switchError);
        setError('Failed to switch to Sepolia network');
        return false;
      }
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError('Please install MetaMask!');
        return;
      }

      setError('');
      setIsConnected(false);
      
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      // Check current network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== SEPOLIA_CHAIN_ID) {
        const switched = await switchToSepolia();
        if (!switched) return;
      }

      if (accounts.length > 0) {
        const walletAddress = accounts[0];
        setAccount(walletAddress);
        setIsConnected(true);
        localStorage.setItem('connectedWallet', walletAddress);
        
        try {
          // Authenticate with backend
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          
          // Create a verification message
          const message = `Welcome to Decentralized Voting System! \n\n` +
                        `Click to sign in and verify your wallet. \n\n` +
                        `This request will not trigger a blockchain transaction or cost any gas fees.`;
          
          // Sign the message
          const signature = await signer.signMessage(message);
          
          // Send to backend for verification and JWT token
          const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress,
              message,
              signature
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to authenticate with the server');
          }
          
          const data = await response.json();
          
          // Store the JWT token
          localStorage.setItem('token', data.token);
          
          // Check if voter is registered on the blockchain
          const contract = new ethers.Contract(
            VOTER_REGISTRY_CONTRACT_ADDRESS,
            VoterRegistryABI,
            provider // Use provider for read-only operations
          );
          
          const isRegistered = await contract.isRegistered(walletAddress);
          console.log('Is voter registered?', isRegistered);
          
          if (!isRegistered) {
            // Check if they have a pending registration with the backend
            try {
              const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/voters/status/${accounts[0]}`);
              if (response.ok) {
                const data = await response.json();
                if (data.pending) {
                  // They have a pending registration
                  navigate('/login');
                  return;
                }
              }
              // Registration page removed; direct users to login
              navigate('/login');
            } catch (backendError) {
              console.warn('Error checking backend voter status:', backendError);
              // If backend check fails, send them to login
              navigate('/login');
            }
          }
        } catch (statusError) {
          console.error('Error checking voter registration:', statusError);
          setError('Failed to check voter registration. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Error connecting to wallet. Please try again.');
    }
  };

  // Check wallet connection and registration status on mount and when navigate changes
  useEffect(() => {
    let isMounted = true;
    
    const checkConnection = async () => {
      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts'
          });
          
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
            localStorage.setItem('connectedWallet', accounts[0]);
            
            // Check if voter is registered on the blockchain
            try {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const contract = new ethers.Contract(
                VOTER_REGISTRY_CONTRACT_ADDRESS,
                VoterRegistryABI,
                provider // Use provider for read-only operations
              );
              
              const isRegistered = await contract.isRegistered(accounts[0]);
              console.log('Is voter registered?', isRegistered);
              
              if (!isRegistered) {
                // Check if they have a pending registration with the backend
                try {
                  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/voters/status/${accounts[0]}`);
                  if (response.ok) {
                    const data = await response.json();
                    if (data.pending) {
                      // Registration page removed; direct users to login
                      navigate('/login');
                      return;
                    }
                  }
                  // Registration page removed; direct users to login
                  navigate('/login');
                } catch (backendError) {
                  console.warn('Error checking backend voter status:', backendError);
                  // If backend check fails, send them to login
                  navigate('/login');
                }
              }
            } catch (statusError) {
              console.error('Error checking voter registration:', statusError);
              setError('Failed to check voter registration. Please try again.');
            }
          }
        }
      } catch (error) {
        console.error('Error checking connection:', error);
        setError('Error checking wallet connection');
      }
    };

    if (isMounted) {
      checkConnection();
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [navigate]); // Add navigate to dependency array

  return (
    <div style={{ padding: '10px' }}>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      {!isConnected ? (
        <button onClick={connectWallet} style={{
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Connect Wallet
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
          <button onClick={() => {
            setIsConnected(false);
            setAccount('');
            localStorage.removeItem('connectedWallet');
          }} style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectWallet;
