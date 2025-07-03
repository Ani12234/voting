import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Heading, Text, Button, Select, VStack, Alert, AlertIcon } from '@chakra-ui/react';
import { ethers } from 'ethers';
import { VotingABI } from '../utils/contracts';
import { VOTING_CONTRACT_ADDRESS, NETWORK } from '../config';

function Vote() {
  const { pollId } = useParams();
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        setError('');
        
        if (!pollId) {
          setError('No poll ID provided');
          return;
        }
        
        if (!window.ethereum) {
          throw new Error('Please install MetaMask');
        }

        // Request account access if needed
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Use JsonRpcProvider for read operations
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const contract = new ethers.Contract(VOTING_CONTRACT_ADDRESS, VotingABI, signer);
        
        console.log('Fetching poll with ID:', pollId);
        const pollData = await contract.getPoll(pollId);
        console.log('Received poll data:', pollData);
        
        if (!pollData || !pollData.title) {
          throw new Error('Invalid poll data received');
        }

        setPoll({
          title: pollData.title,
          description: pollData.description,
          options: pollData.options,
          votes: pollData.votes,
          endTime: pollData.endTime,
          isActive: pollData.isActive
        });
      } catch (err) {
        console.error('Error fetching poll:', err);
        setError(err.message || 'Failed to load poll. Please try again.');
      }
    };

    if (pollId) {
      fetchPoll();
    }
  }, [pollId]);

  const handleVote = async () => {
    try {
      setError('');
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      if (selectedOption === '') {
        throw new Error('Please select an option to vote for');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(VOTING_CONTRACT_ADDRESS, VotingABI, signer);

      console.log('Sending vote for option:', selectedOption);
      // The function is named 'castVote' in the contract ABI
      const tx = await contract.castVote(pollId, selectedOption);
      console.log('Transaction hash:', tx.hash);
      
      // Wait for the transaction to be mined
      await tx.wait();
      console.log('Vote successful!');
      
      setSelectedOption('');
      
      // Refresh poll data
      const pollData = await contract.getPoll(pollId);
      console.log('Updated poll data:', pollData);
      
      setPoll({
        title: pollData.title,
        description: pollData.description,
        options: pollData.options,
        votes: pollData.votes,
        endTime: pollData.endTime,
        isActive: pollData.isActive
      });
      
      // Show success message
      setError('Vote submitted successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setError(''), 3000);
      
    } catch (err) {
      console.error('Error voting:', err);
      setError(err.message || 'Failed to submit vote. Please try again.');
    }
  };

  if (!pollId) {
    return (
      <Box p={4}>
        <Alert status="error" mb={4}>
          <AlertIcon />
          No poll ID provided. Please select a poll to vote.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={4}>
      {error ? (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      ) : poll ? (
        <div>
          <Heading mb={4}>{poll.title}</Heading>
          <Text mb={4}>{poll.description}</Text>

          <VStack spacing={4}>
            <Select
              placeholder="Select an option"
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
            >
              {poll.options.map((option, index) => (
                <option key={index} value={index}>
                  {option}
                </option>
              ))}
            </Select>

            <Button
              colorScheme="blue"
              onClick={handleVote}
              isDisabled={!selectedOption || !poll.isActive}
            >
              Vote
            </Button>

            <Text mt={4}>Votes:</Text>
            {poll.options.map((option, index) => (
              <Text key={index}>
                {option}: {poll.votes ? poll.votes[index] || 0 : 0}
              </Text>
            ))}
          </VStack>
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </Box>
  );
}

export default Vote;
