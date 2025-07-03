import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { VotingABI } from '../utils/contracts';
import { VOTING_CONTRACT_ADDRESS } from '../config';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AdminDashboard() {
  const [polls, setPolls] = useState([]);
  const [newPoll, setNewPoll] = useState({
    title: '',
    description: '',
    options: [''],
    duration: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        console.log('Current admin token:', token);
        if (!token) {
          console.log('No admin token found, redirecting to login');
          navigate('/admin/login');
          return;
        }
        
        const response = await axios.get(`${API_BASE_URL}/api/polls`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setPolls(response.data);
      } catch (error) {
        console.error('Error fetching polls:', error);
        if (error.response) {
          console.error('Status:', error.response.status);
          console.error('Data:', error.response.data);
          if (error.response.status === 401) {
            // Token expired or invalid, redirect to login
            localStorage.removeItem('adminToken');
            navigate('/admin/login');
          }
        }
      }
    };

    fetchPolls();
  }, [navigate]);

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    try {
      const { ethereum } = window;
      if (!ethereum) {
        alert('Please install MetaMask!');
        return;
      }

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      // Get contract instance
      const contract = new ethers.Contract(
        VOTING_CONTRACT_ADDRESS,
        VotingABI,
        signer
      );

      // Create poll
      const tx = await contract.createPoll(
        newPoll.title,
        newPoll.description,
        newPoll.options,
        parseInt(newPoll.duration)
      );
      await tx.wait();

      // Register voters
      try {
        const token = localStorage.getItem('adminToken');
        const response = await axios.get(`${API_BASE_URL}/api/voters`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const voters = response.data;
        for (const voter of voters) {
          await contract.registerVoter(voter.walletAddress);
        }
      } catch (error) {
        console.error('Error fetching voters:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('adminToken');
          navigate('/admin/login');
          return;
        }
        throw error; // Re-throw to be caught by the outer catch
      }

      alert('Poll created successfully!');
      setNewPoll({
        title: '',
        description: '',
        options: [''],
        duration: ''
      });
      
      // Refresh polls
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_BASE_URL}/api/polls`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setPolls(response.data);
    } catch (error) {
      console.error('Error creating poll:', error);
      alert('Error creating poll. Please try again.');
    }
  };

  const handleAddOption = () => {
    setNewPoll(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const handleRemoveOption = (index) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  if (!localStorage.getItem('adminToken')) {
    navigate('/admin/login');
    return null;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Dashboard</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>Create New Poll</h2>
        <form onSubmit={handleCreatePoll}>
          <div style={{ marginBottom: '10px' }}>
            <label>Title:</label>
            <input
              type="text"
              value={newPoll.title}
              onChange={(e) => setNewPoll(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Description:</label>
            <textarea
              value={newPoll.description}
              onChange={(e) => setNewPoll(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          {newPoll.options.map((option, index) => (
            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                value={option}
                onChange={(e) => {
                  const newOptions = [...newPoll.options];
                  newOptions[index] = e.target.value;
                  setNewPoll(prev => ({ ...prev, options: newOptions }));
                }}
                required
              />
              <button
                type="button"
                onClick={() => handleRemoveOption(index)}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddOption}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            Add Option
          </button>

          <div style={{ marginBottom: '10px' }}>
            <label>Duration (seconds):</label>
            <input
              type="number"
              value={newPoll.duration}
              onChange={(e) => setNewPoll(prev => ({ ...prev, duration: e.target.value }))}
              required
            />
          </div>

          <button
            type="submit"
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Create Poll
          </button>
        </form>
      </div>

      <div>
        <h2>Active Polls</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {polls.map((poll) => (
            <div key={poll.id} style={{
              padding: '15px',
              background: '#f7fafc',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3>{poll.title}</h3>
              <p>{poll.description}</p>
              <p>Closing in: {poll.timeRemaining} minutes</p>
              <div>
                {poll.options.map((option, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '5px'
                  }}>
                    <span>{option}</span>
                    <span style={{ fontWeight: 'bold' }}>
                      {poll.votes[index]} votes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
