import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaVoteYea, FaPoll, FaReceipt } from 'react-icons/fa';
import { useAccountContext } from '../context/AccountContext';
import { ethers } from 'ethers';
import { VOTING_CONTRACT_ADDRESS } from '../config/config';
import { VotingABI } from '../utils/contracts';
import { isRegistered as chainIsRegistered, selfRegister as chainSelfRegister } from '../utils/registry';
import { getInvoiceChallenge, signChallenge, downloadEncryptedInvoice, saveBase64Pdf } from '../utils/invoice';
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
  const [voteIdByPoll, setVoteIdByPoll] = useState({});
  const [walletAddress, setWalletAddress] = useState('');
  const [chainInfo, setChainInfo] = useState({ chainId: '', name: '' });
  const [isRegChecking, setIsRegChecking] = useState(false);
  const [isChainRegistered, setIsChainRegistered] = useState(false);

  // Simple mobile detection for UX hints
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleOptionChange = (pollIndex, optionIndex) => {
    setSelectedOptions(prev => ({
      ...prev,
      [pollIndex]: optionIndex
    }));
  };

  const downloadInvoice = async (poll) => {
    try {
      const voteId = voteIdByPoll[poll._id];
      if (!voteId) {
        toast.error('Vote record not found for this poll yet. Please refresh.');
        return;
      }
      if (!account?.token) {
        toast.error('You are not authenticated.');
        return;
      }
      if (!window.ethereum) {
        toast.error('MetaMask not detected.');
        return;
      }
      // 1) Get challenge
      const chall = await getInvoiceChallenge(voteId, account.token);
      // 2) Sign
      const provider = new ethers.BrowserProvider(window.ethereum);
      const { signature, address } = await signChallenge(provider, chall.challenge);
      // 3) Download
      toast.info('Preparing your encrypted invoice...');
      const { password, filename, pdfBase64, notEncrypted } = await downloadEncryptedInvoice(voteId, address, signature, account.token);
      saveBase64Pdf(filename, pdfBase64);
      toast.success(`Invoice downloaded. Password: ${password}${notEncrypted ? ' (unencrypted fallback)' : ''}`);
    } catch (e) {
      console.error('Invoice download error:', e);
      toast.error(e.message || 'Failed to download invoice');
    }
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
        const mapObj = {};
        historyData.forEach(v => {
          if (v.poll?._id && v._id) mapObj[v.poll._id] = v._id;
        });
        setVoteIdByPoll(mapObj);
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

  // Load wallet/chain/registration status
  useEffect(() => {
    const refresh = async () => {
      if (!window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        setWalletAddress(addr);
        const network = await provider.getNetwork();
        setChainInfo({ chainId: network.chainId?.toString?.() || String(network.chainId), name: network.name || '' });
        setIsRegChecking(true);
        const reg = await chainIsRegistered(provider);
        setIsChainRegistered(Boolean(reg));
      } catch (e) {
        console.warn('Registration status check failed:', e);
      } finally {
        setIsRegChecking(false);
      }
    };
    refresh();
    if (window.ethereum) {
      const onAccounts = () => refresh();
      const onChain = () => refresh();
      window.ethereum.on?.('accountsChanged', onAccounts);
      window.ethereum.on?.('chainChanged', onChain);
      return () => {
        window.ethereum.removeListener?.('accountsChanged', onAccounts);
        window.ethereum.removeListener?.('chainChanged', onChain);
      };
    }
  }, []);

  const handleManualRegister = async () => {
    if (!window.ethereum) {
      if (isMobile) {
        toast.info('Opening in MetaMask Mobile...');
        const url = window.location.href;
        window.location.href = `https://metamask.app.link/dapp/${url.replace(/^https?:\/\//, '')}`;
      } else {
        toast.error('MetaMask not detected.');
      }
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      setIsRegChecking(true);
      toast.info('Registering wallet on-chain. Confirm in MetaMask...');
      await chainSelfRegister(provider, (tx) => toast.info(`Tx submitted: ${tx.hash}`));
      toast.success('Wallet registered successfully.');
      const reg = await chainIsRegistered(provider);
      setIsChainRegistered(Boolean(reg));
    } catch (e) {
      console.error('Manual register failed:', e);
      toast.error(e.reason || e.message || 'Registration failed');
    } finally {
      setIsRegChecking(false);
    }
  };

  const vote = async (pollIndex, poll) => {
    const optionIndex = selectedOptions[pollIndex];
    if (optionIndex === undefined) {
      toast.error('Please select an option before voting.');
      return;
    }

    if (!window.ethereum) {
      if (isMobile) {
        toast.info('Opening in MetaMask Mobile...');
        const url = window.location.href;
        window.location.href = `https://metamask.app.link/dapp/${url.replace(/^https?:\/\//, '')}`;
      } else {
        toast.error('Please install MetaMask wallet to vote.');
      }
      return;
    }

    try {
      // Setup provider and ensure on-chain registration
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Ensure wallet is registered on-chain; if not, self-register first
      let registered = false;
      try {
        registered = await chainIsRegistered(provider);
      } catch (e) {
        console.warn('isRegistered check failed, attempting to continue:', e);
      }
      if (!registered) {
        toast.info('Registering your wallet on-chain. Please confirm in MetaMask...');
        await chainSelfRegister(provider, (tx) => {
          toast.info(`Registration submitted: ${tx.hash}`);
        });
        toast.success('Wallet registered on-chain. Proceeding to vote...');
      }

      // Step 1: Validate poll exists on-chain, then cast vote
      const votingContract = new ethers.Contract(VOTING_CONTRACT_ADDRESS, VotingABI, signer);

      const blockchainId = poll.blockchainId;
      if (blockchainId === undefined || blockchainId === null) {
        toast.error('This poll is not properly synced with the blockchain.');
        return;
      }

      // Pre-validate poll existence to avoid "Invalid poll ID" reverts
      try {
        await votingContract.getPoll(BigInt(blockchainId));
      } catch (e) {
        console.error('On-chain poll lookup failed:', e);
        toast.error('This poll does not exist on the currently configured Voting contract. Please ask admin to re-create it.');
        return;
      }

      toast.info('Please confirm the transaction in MetaMask...');
      const tx = await votingContract.castVote(BigInt(blockchainId), optionIndex);
      
      toast.info('Waiting for transaction to be mined...');
      await tx.wait();
      toast.success('Your vote has been cast successfully on-chain!');

      // Step 2: Record vote in the backend to get an invoice
      const chosen = poll.options[optionIndex] || {};
      const optionText = (chosen.text ?? chosen.name ?? '').toString();
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

      loadPolls(); // Refresh polls to show updated vote counts
      setSelectedOptions(prev => ({ ...prev, [pollIndex]: undefined })); // Clear selection

    } catch (error) {
      console.error('Error casting vote:', error);
      const reason = error.reason || error.data?.message || error.message || 'An unknown error occurred.';

      toast.error(`Failed to cast vote: ${reason}`);
      setError(`Error casting vote: ${reason}`);
    }
  };



  return (
    <div className="container mx-auto p-4">
      {/* Registration / network status banner */}
      <div className="mb-4 p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between"
           style={{ background: '#f8fafc', borderColor: '#e5e7eb' }}>
        <div className="text-sm text-gray-700 space-y-1">
          <div><span className="font-semibold">Network:</span> {chainInfo.name || 'Unknown'} ({chainInfo.chainId || '-'})</div>
          <div className="break-all"><span className="font-semibold">Wallet:</span> {walletAddress || '-'}</div>
          <div>
            <span className="font-semibold">On-chain Registration:</span>{' '}
            {isRegChecking ? 'Checking...' : (isChainRegistered ? 'Registered' : 'Not registered')}
          </div>
        </div>
        <div className="mt-3 sm:mt-0 w-full sm:w-auto">
          <button
            onClick={handleManualRegister}
            disabled={isRegChecking || isChainRegistered || !window.ethereum}
            className={`w-full sm:w-auto px-4 py-3 rounded-md text-white font-semibold ${isChainRegistered ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isChainRegistered ? 'Already Registered' : (isRegChecking ? 'Registering...' : 'Register Wallet')}
          </button>
        </div>
      </div>

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
                  
                  {votedPolls.has(poll._id) ? (
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-green-50 p-3 rounded-lg">
                      <div className="text-green-700 font-semibold">You have already voted in this poll.</div>
                      <button
                        onClick={() => downloadInvoice(poll)}
                        className="w-full sm:w-auto px-4 py-3 bg-emerald-600 text-white font-semibold rounded hover:bg-emerald-700 flex items-center justify-center"
                      >
                        <FaReceipt className="mr-2" /> Download Invoice
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 space-y-2">
                        {poll.options.map((option, optionIndex) => (
                          <label key={optionIndex} className="flex items-center p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors min-h-[48px]">
                            <input
                              type="radio"
                              name={`poll-${pollIndex}`}
                              value={optionIndex}
                              checked={selectedOptions[pollIndex] === optionIndex}
                              onChange={() => handleOptionChange(pollIndex, optionIndex)}
                              className="form-radio h-6 w-6 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-4 text-base sm:text-lg text-gray-700">{option.text ?? option.name}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <button
                          onClick={() => vote(pollIndex, poll)}
                          className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                          disabled={selectedOptions[pollIndex] === undefined}
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