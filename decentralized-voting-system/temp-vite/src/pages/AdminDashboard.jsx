import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { VoterRegistryABI } from '../utils/contracts';
import { VOTER_REGISTRY_CONTRACT_ADDRESS } from '../config/config';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaPlus, FaTrash, FaCheck, FaTimes, FaPencilAlt } from 'react-icons/fa';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const [voterToRegister, setVoterToRegister] = useState('');
  const [voters, setVoters] = useState([]);
  const [onChainStatus, setOnChainStatus] = useState({});
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(null); // Tracks which voter is being registered
  const [error, setError] = useState('');
  const [editingPoll, setEditingPoll] = useState(null);
  const [debugWallet, setDebugWallet] = useState('');
  const [debugResult, setDebugResult] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const [newPoll, setNewPoll] = useState({
    title: '',
    description: '',
    options: ['', ''],
    duration: '60',
  });
  const navigate = useNavigate();

  const getAuthToken = useCallback(() => {
    const storedAccount = localStorage.getItem('account');
    if (storedAccount) {
      const account = JSON.parse(storedAccount);
      if (account && account.isAdmin && account.token) {
        return account.token;
      }
    }
    navigate('/admin/login');
    return null;
  }, [navigate]);

  const fetchVoters = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/api/voters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedVoters = response.data;
      setVoters(fetchedVoters);

      if (window.ethereum && fetchedVoters.length > 0) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const voterRegistryContract = new ethers.Contract(VOTER_REGISTRY_CONTRACT_ADDRESS, VoterRegistryABI, provider);
        const statusPromises = fetchedVoters.map(voter => 
          voterRegistryContract.isRegistered(voter.walletAddress)
        );
        const results = await Promise.all(statusPromises);
        
        const newOnChainStatus = {};
        fetchedVoters.forEach((voter, index) => {
          newOnChainStatus[voter.walletAddress] = results[index];
        });
        setOnChainStatus(newOnChainStatus);
      }
    } catch (err) {
      setError('Failed to fetch voters.');
      console.error(err);
    }
  }, [getAuthToken]);

  const fetchPolls = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await axios.get(`${API_BASE_URL}/api/polls`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPolls(response.data);
    } catch (err) {
      setError('Failed to fetch polls.');
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchVoters();
    fetchPolls();
  }, [fetchVoters, fetchPolls]);

  const handleUpdateVoterStatus = async (voterId, status) => {
    try {
      const token = getAuthToken();
      if (!token) return;
      await axios.put(
        `${API_BASE_URL}/api/voters/${voterId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchVoters(); // Refresh the list
    } catch (err) {
      setError('Failed to update voter status.');
    }
  };

  const handleResetData = async () => {
    if (window.confirm('Are you sure you want to delete all poll and vote data? This action cannot be undone.')) {
      setIsResetting(true);
      try {
        const token = getAuthToken();
        if (!token) return;

        const response = await axios.post(`${API_BASE_URL}/api/admin/data/reset`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });

        toast.success(response.data.message);
        fetchPolls(); // Refresh the polls list
      } catch (err) {
        toast.error('Failed to reset data.');
        console.error(err);
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPoll((prev) => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (index, value) => {
    const updatedOptions = [...newPoll.options];
    updatedOptions[index] = value;
    setNewPoll((prev) => ({ ...prev, options: updatedOptions }));
  };

  const addOption = () => {
    setNewPoll((prev) => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (index) => {
    if (newPoll.options.length <= 2) return;
    const updatedOptions = newPoll.options.filter((_, i) => i !== index);
    setNewPoll((prev) => ({ ...prev, options: updatedOptions }));
  };

  const handleRegisterVoter = async (addressToRegister) => {
    if (!addressToRegister) {
      toast.error('Please provide a voter address.');
      return;
    }
    if (!window.ethereum) {
      toast.error('Please install MetaMask wallet.');
      return;
    }

    setIsRegistering(addressToRegister);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const voterRegistryContract = new ethers.Contract(VOTER_REGISTRY_CONTRACT_ADDRESS, VoterRegistryABI, signer);

      toast.info(`Registering ${addressToRegister.substring(0, 6)}... on-chain. Please confirm in MetaMask.`);
      const tx = await voterRegistryContract.registerVoter(addressToRegister);
      await tx.wait();

      toast.success('Voter registered successfully on-chain!');
      setVoterToRegister('');
      setOnChainStatus(prevStatus => ({ ...prevStatus, [addressToRegister]: true }));
    } catch (err) {
      console.error('On-chain registration failed:', err);
      const errorMessage = err.reason || err.message || 'An unknown error occurred.';
      toast.error(`Registration failed: ${errorMessage}`);
    } finally {
      setIsRegistering(null);
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const token = getAuthToken();
      if (!token) return;
            const pollData = { 
        ...newPoll, 
        duration: newPoll.duration === 'infinite' ? 'infinite' : parseInt(newPoll.duration, 10) 
      };
      await axios.post(`${API_BASE_URL}/api/polls`, pollData, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Poll created successfully!');
      setNewPoll({ title: '', description: '', options: ['', ''], duration: '60' });
      fetchPolls();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create poll.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Are you sure you want to delete this poll? This only removes it from the application database, not from the blockchain.')) {
      return;
    }
    try {
      const token = getAuthToken();
      if (!token) return;
      await axios.delete(`${API_BASE_URL}/api/polls/${pollId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Poll deleted successfully from the database.');
      fetchPolls(); // Refresh the list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete poll.');
    }
  };

  const handleUpdatePoll = async (e) => {
    e.preventDefault();
    if (!editingPoll) return;

    try {
        const token = getAuthToken();
        if (!token) return;

        const { _id, title, description } = editingPoll;
        await axios.put(`${API_BASE_URL}/api/polls/${_id}`, { title, description }, {
            headers: { Authorization: `Bearer ${token}` },
        });

        toast.success('Poll updated successfully.');
        setEditingPoll(null); // Close the modal
        fetchPolls(); // Refresh the list
    } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to update poll.');
    }
  };

  const handleDebugSearch = async () => {
    if (!debugWallet) {
        toast.error('Please enter a wallet address.');
        return;
    }
    setDebugResult(null); // Clear previous results
    try {
        const token = getAuthToken();
        if (!token) return;
        const response = await axios.get(`${API_BASE_URL}/api/voters/debug/${debugWallet}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setDebugResult({ success: true, data: response.data });
    } catch (err) {
        setDebugResult({ success: false, message: err.response?.data?.message || 'An error occurred.' });
    }
  };

  const StatusBadge = ({ status }) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>{status}</span>;
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-gray-800">Admin Dashboard</h1>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}

      <Card>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Voter Management</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallet Address</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DB Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Actions</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">On-Chain Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {voters.length > 0 ? voters.map((voter) => (
                <tr key={voter._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{voter.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono" title={voter.walletAddress}>{`${voter.walletAddress.substring(0, 6)}...${voter.walletAddress.substring(voter.walletAddress.length - 4)}`}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={voter.status} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {voter.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button variant="success-outline" size="sm" onClick={() => handleUpdateVoterStatus(voter._id, 'approved')}><FaCheck /></Button>
                        <Button variant="danger-outline" size="sm" onClick={() => handleUpdateVoterStatus(voter._id, 'rejected')}><FaTimes /></Button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {voter.status === 'approved' && (
                      onChainStatus[voter.walletAddress] ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Registered</span>
                      ) : (
                        <Button size="sm" onClick={() => handleRegisterVoter(voter.walletAddress)} disabled={isRegistering === voter.walletAddress}>
                          {isRegistering === voter.walletAddress ? 'Registering...' : 'Register'}
                        </Button>
                      )
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="text-center py-4 text-gray-500">No voters found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Poll</h2>
          <form onSubmit={handleCreatePoll} className="space-y-6">
            <Input label="Poll Title" name="title" value={newPoll.title} onChange={handleInputChange} required />
            <Textarea label="Description" name="description" value={newPoll.description} onChange={handleInputChange} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
              <div className="space-y-4">
                {newPoll.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Input value={option} onChange={(e) => handleOptionChange(index, e.target.value)} placeholder={`Option ${index + 1}`} required className="flex-grow" />
                    <Button type="button" variant="danger-outline" onClick={() => removeOption(index)} disabled={newPoll.options.length <= 2}><FaTrash /></Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="secondary" onClick={addOption} className="mt-4"><FaPlus className="mr-2" />Add Option</Button>
            </div>
                        <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Duration</label>
              <select 
                id="duration" 
                name="duration" 
                value={newPoll.duration} 
                onChange={handleInputChange} 
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="5">5 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="1440">1 Day</option>
                <option value="infinite">Infinite</option>
              </select>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">{isLoading ? 'Creating...' : 'Create Poll'}</Button>
          </form>
        </Card>



        <Card>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Existing Polls</h2>
          <div className="space-y-4">
            {polls.length > 0 ? polls.map((poll) => (
              <div key={poll._id} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">{poll.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{poll.description}</p>
                        <p className="text-sm text-gray-500 mt-2">Status: {poll.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary-outline" size="sm" onClick={() => setEditingPoll(poll)}>
                            <FaPencilAlt />
                        </Button>
                        <Button variant="danger-outline" size="sm" onClick={() => handleDeletePoll(poll._id)}>
                            <FaTrash />
                        </Button>
                    </div>
                </div>
              </div>
            )) : (
              <p className="text-gray-500">No polls found.</p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Reset Poll Data</h2>
          <p className="text-gray-600 mb-4">This will delete all existing polls and votes from the database. This is useful after a contract redeployment to clear outdated data.</p>
          <Button variant="danger" onClick={handleResetData} disabled={isResetting}>
            {isResetting ? 'Resetting...' : 'Reset All Poll & Vote Data'}
          </Button>
        </Card>

        <Card>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Voter Lookup (Debug)</h2>
            <div className="space-y-4">
                <Input 
                    label="Voter Wallet Address"
                    value={debugWallet}
                    onChange={(e) => setDebugWallet(e.target.value)}
                    placeholder="0x..."
                />
                <Button onClick={handleDebugSearch}>Search</Button>
            </div>
            {debugResult && (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h3 className="font-bold text-lg">Lookup Result:</h3>
                    {debugResult.success ? (
                        <pre className="text-sm whitespace-pre-wrap break-all">{JSON.stringify(debugResult.data, null, 2)}</pre>
                    ) : (
                        <p className="text-red-500">{debugResult.message}</p>
                    )}
                </div>
            )}
        </Card>

      </div>

      {editingPoll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">Edit Poll</h2>
                <form onSubmit={handleUpdatePoll} className="space-y-4">
                    <Input
                        label="Poll Title"
                        name="title"
                        value={editingPoll.title}
                        onChange={(e) => setEditingPoll({ ...editingPoll, title: e.target.value })}
                        required
                    />
                    <Textarea
                        label="Description"
                        name="description"
                        value={editingPoll.description}
                        onChange={(e) => setEditingPoll({ ...editingPoll, description: e.target.value })}
                        required
                    />
                    <div className="flex justify-end gap-4 mt-6">
                        <Button type="button" variant="secondary" onClick={() => setEditingPoll(null)}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
