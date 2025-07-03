import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { VotingABI } from '../utils/contracts';
import { VOTING_CONTRACT_ADDRESS } from '../config';

function Results() {
  const [polls, setPolls] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const { ethereum } = window;
        if (!ethereum) {
          alert('Please install MetaMask!');
          return;
        }

        const provider = new ethers.BrowserProvider(ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          VOTING_CONTRACT_ADDRESS,
          VotingABI,
          signer
        );

        const count = await contract.getPollsCount();
        const pollsData = [];

        // Get polls from contract
        for (let i = 0; i < count; i++) {
          const poll = await contract.getPoll(i);
          pollsData.push({
            id: i,
            title: poll.title,
            options: poll.options,
            votes: poll.votes,
            endTime: poll.endTime,
            isActive: poll.isActive
          });
        }

        // Get additional data from backend
        try {
          const response = await axios.get('http://localhost:5000/api/polls');
          console.log('Backend polls:', response.data);
          // You can merge this data with the contract data if needed
        } catch (backendError) {
          console.error('Error fetching backend polls:', backendError.response?.data || backendError.message);
        }

        setPolls(pollsData);
      } catch (error) {
        console.error('Error fetching results:', error.message);
        if (error.code) {
          console.error('Error code:', error.code);
        }
      }
    };

    fetchResults();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Election Results</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {polls.map((poll) => (
          <div key={poll.id} style={{
            padding: '15px',
            background: '#f7fafc',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2>{poll.title}</h2>
            <div style={{ marginTop: '10px' }}>
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
            <p>Closed: {new Date(poll.endTime * 1000).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Results;
