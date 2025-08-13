import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaVoteYea, FaPoll, FaReceipt } from 'react-icons/fa';
import { useAccountContext } from '../context/AccountContext';
import { ethers } from 'ethers';
import { VOTING_CONTRACT_ADDRESS } from '../config/config';
import { VotingABI } from '../utils/contracts';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const VoterDashboard = () => {
  const navigate = useNavigate();
  const { account, setAccount } = useAccountContext();
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOptions, setSelectedOptions] = useState({});
  const [votedPolls, setVotedPolls] = useState(new Set());

  const handleOptionChange = (pollIndex, optionIndex) => {
    setSelectedOptions(prev => ({
      ...prev,
      [pollIndex]: optionIndex
    }));
  };

  const loadPolls = useCallback(async () => {
    if (!account?.token) {
      setError('Authentication token not found. Please log in.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [pollsResponse, historyResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/polls`, {
          headers: { 'x-auth-token': account.token },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/voters/history`, {
          headers: { 'x-auth-token': account.token },
        }),
      ]);

      if (!pollsResponse.ok) {
        throw new Error('Failed to fetch polls');
      }
      const pollsData = await pollsResponse.json();
      setPolls(pollsData);

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        const votedPollIds = new Set(historyData.map(vote => vote.poll?._id).filter(id => id));
        setVotedPolls(votedPollIds);
      } else {
        console.error('Could not fetch vote history');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      loadPolls();
    } else {
      setIsLoading(false);
      setError("Please log in to view your dashboard.");
    }
  }, [account, loadPolls]);

  const vote = async (pollIndex, poll) => {
    const optionIndex = selectedOptions[pollIndex];
    if (optionIndex === undefined) {
      toast.error('Please select an option before voting.');
      return;
    }

    if (account?.hasVoted) {
      toast.info('You have already used your one vote across all polls.');
      return;
    }

    if (!window.ethereum) {
      toast.error('Please install MetaMask wallet to vote.');
      return;
    }

    try {
      // Step 1: Cast vote on-chain via MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const votingContract = new ethers.Contract(VOTING_CONTRACT_ADDRESS, VotingABI, signer);

      const blockchainId = poll.blockchainId;
      if (blockchainId === undefined || blockchainId === null) {
        toast.error('This poll is not properly synced with the blockchain.');
        return;
      }

      toast.info('Please confirm the transaction in MetaMask...');
      const tx = await votingContract.castVote(BigInt(blockchainId), optionIndex);
      
      toast.info('Waiting for transaction to be mined...');
      await tx.wait();
      toast.success('Your vote has been cast successfully on-chain!');

      // Step 2: Record vote in the backend to get an invoice
      const optionText = poll.options[optionIndex].text;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/polls/${poll._id}/vote`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'x-auth-token': account.token,
          },
          body: JSON.stringify({ optionText }),
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to record vote on the server.');
      }

      await response.json();
      toast.success('Vote recorded successfully!');

      // Mark the account as having voted (Policy B) and persist
      setAccount(prev => {
        const updated = { ...(prev || {}), hasVoted: true };
        try { localStorage.setItem('account', JSON.stringify(updated)); } catch (_) {}
        return updated;
      });

      loadPolls(); // Refresh polls to show updated vote counts
      setSelectedOptions(prev => ({ ...prev, [pollIndex]: undefined })); // Clear selection

    } catch (error) {
      console.error('Error casting vote:', error);
      const reason = error.reason || error.data?.message || error.message || 'An unknown error occurred.';

      // If backend enforces Policy B and returns 409, reflect in UI
      if (/already used your one vote/i.test(reason) || /409/.test(reason)) {
        setAccount(prev => {
          const updated = { ...(prev || {}), hasVoted: true };
          try { localStorage.setItem('account', JSON.stringify(updated)); } catch (_) {}
          return updated;
        });
      }
      toast.error(`Failed to cast vote: ${reason}`);
      setError(`Error casting vote: ${reason}`);
    }
  };



  return (
    <div className="container mx-auto p-4">
      {error && (
        <div className="text-center p-4 mb-4 text-red-700 bg-red-100 rounded-lg">{error}</div>
      )}
      {isLoading ? (
        <div className="text-center p-10">Loading dashboard...</div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
            <FaPoll className="mr-3 text-blue-500" />
            Active Polls
          </h2>
          {polls.length > 0 ? (
            <div className="space-y-6">
              {polls.map((poll, pollIndex) => (
                <div key={poll._id} className="border border-gray-200 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-800">{poll.title}</h3>
                  <p className="text-gray-600 mt-2">{poll.description}</p>
                  
                  {account?.hasVoted ? (
                    <div className="mt-4 text-center text-blue-700 font-semibold bg-blue-50 p-3 rounded-lg">
                      You have already used your one vote across all polls.
                    </div>
                  ) : votedPolls.has(poll._id) ? (
                    <div className="mt-4 text-center text-green-600 font-semibold bg-green-50 p-3 rounded-lg">
                      You have already voted in this poll.
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 space-y-2">
                        {poll.options.map((option, optionIndex) => (
                          <label key={optionIndex} className="flex items-center p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                            <input
                              type="radio"
                              name={`poll-${pollIndex}`}
                              value={optionIndex}
                              checked={selectedOptions[pollIndex] === optionIndex}
                              onChange={() => handleOptionChange(pollIndex, optionIndex)}
                              className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500"
                              disabled={account?.hasVoted}
                            />
                            <span className="ml-4 text-lg text-gray-700">{option.text}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          onClick={() => vote(pollIndex, poll)}
                          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                          disabled={account?.hasVoted || selectedOptions[pollIndex] === undefined}
                        >
                          <FaVoteYea className="inline-block mr-2" />
                          Cast Your Vote
                        </button>
                        <span className="text-sm text-gray-500">
                          Ends: {new Date(poll.endTime).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}


                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No active polls at the moment.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default VoterDashboard;