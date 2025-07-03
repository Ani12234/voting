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
  const { account } = useAccountContext();
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});

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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/polls`, {
        headers: { 'x-auth-token': account.token },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch polls');
      }
      const data = await response.json();
      setPolls(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading polls:', err);
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

    if (!window.ethereum) {
      toast.error('Please install MetaMask wallet to vote.');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const votingContract = new ethers.Contract(VOTING_CONTRACT_ADDRESS, VotingABI, signer);

      const blockchainId = poll.blockchainId;
      if (blockchainId === undefined || blockchainId === null) {
        toast.error('This poll is not properly synced with the blockchain and is missing its ID.');
        console.error('Poll object is missing blockchainId:', poll);
        return;
      }

      // The contract will handle checks for active poll, voter registration, and previous votes.
      toast.info('Please confirm the transaction in MetaMask...');
      const tx = await votingContract.castVote(BigInt(blockchainId), optionIndex);
      
      toast.info('Waiting for transaction to be mined...');
      await tx.wait();
      
      toast.success('Your vote has been cast successfully!');
      loadPolls(); // Refresh polls to show updated vote counts (if applicable)
      setSelectedOptions(prev => ({ ...prev, [pollIndex]: undefined })); // Clear selection

    } catch (error) {
      console.error('Error casting vote:', error);
      // Ethers often wraps revert reasons in a nested error object.
      const reason = error.reason || error.data?.message || error.message || 'An unknown error occurred.';
      toast.error(`Failed to cast vote: ${reason}`);
      setError(`Error casting vote: ${reason}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      {error && (
        <div className="text-center p-10 text-red-500">{error}</div>
      )}
      {isLoading ? (
        <div className="text-center p-10">Loading dashboard...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {polls.map((poll, index) => (
            <div key={poll._id} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-2">{poll.title}</h3>
              <p className={`text-sm font-bold mb-4 ${poll.status === 'Active' ? 'text-green-500' : 'text-red-500'}`}>
                Status: {poll.status}
              </p>
              <div className="space-y-4">
                {poll.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center">
                    <input
                      type="radio"
                      name={`poll-${poll._id}`}
                      value={optionIndex}
                      checked={selectedOptions[index] === optionIndex}
                      onChange={() => handleOptionChange(index, optionIndex)}
                      className="mr-2"
                    />
                    <span>{option.text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => vote(index, poll)}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                disabled={selectedOptions[index] === undefined || poll.status === 'Closed'}
              >
                {poll.status === 'Closed' ? 'Poll Closed' : 'Vote'}
              </button>
            </div>
          ))}
        </div>
      )}
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
                      />
                      <span className="ml-4 text-lg text-gray-700">{option.text}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => vote(pollIndex, poll)}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                    disabled={selectedOptions[pollIndex] === undefined}
                  >
                    <FaVoteYea className="inline-block mr-2" />
                    Cast Your Vote
                  </button>
                  <span className="text-sm text-gray-500">
                    Ends: {new Date(poll.endTime).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No active polls at the moment.</p>
        )}
      </div>

      {invoice && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-green-800 mb-4 flex items-center">
            <FaReceipt className="mr-3" />
            Vote Confirmation
          </h2>
          <div className="space-y-2 text-gray-700">
            <p><strong>Status:</strong> {invoice.status}</p>
            <p><strong>Voter:</strong> {invoice.voter}</p>
            <p><strong>Poll ID:</strong> {invoice.pollId}</p>
            <p><strong>Timestamp:</strong> {new Date(invoice.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoterDashboard;