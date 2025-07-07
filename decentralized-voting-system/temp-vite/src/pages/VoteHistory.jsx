import React, { useState, useEffect, useCallback } from 'react';
import { useAccountContext } from '../context/AccountContext';
import { toast } from 'react-toastify';
import { FaFileInvoice } from 'react-icons/fa';

const VoteHistory = () => {
    const { account } = useAccountContext();
    const [votes, setVotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const loadVoteHistory = useCallback(async () => {
        if (!account?.token) {
            setError('Authentication token not found. Please log in.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/voters/history`, {
                headers: { 'x-auth-token': account.token },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch vote history');
            }
            const data = await response.json();
            setVotes(data);
        } catch (err) {
            setError(err.message);
            console.error('Error loading vote history:', err);
        } finally {
            setIsLoading(false);
        }
    }, [account]);

    useEffect(() => {
        if (account) {
            loadVoteHistory();
        } else {
            setIsLoading(false);
            setError('Please log in to view your voting history.');
        }
    }, [account, loadVoteHistory]);

    const handleDownloadInvoice = async (voteId) => {
        if (!voteId) return;
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/invoice/${voteId}`, {
                headers: { 'x-auth-token': account.token },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to download invoice.');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${voteId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Invoice downloaded!');
        } catch (error) {
            console.error('Error downloading invoice:', error);
            toast.error(error.message);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">My Voting History</h2>
                {isLoading ? (
                    <div className="text-center">Loading history...</div>
                ) : error ? (
                    <div className="text-center text-red-500">{error}</div>
                ) : votes.length > 0 ? (
                    <div className="space-y-4">
                        {votes.map((vote) => (
                            <div key={vote._id} className="border border-gray-200 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">{vote.poll?.title || 'Poll Title Not Found'}</h3>
                                    <p className="text-sm text-gray-600">Voted for: {vote.optionText}</p>
                                    <p className="text-xs text-gray-500">Date: {new Date(vote.timestamp).toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={() => handleDownloadInvoice(vote._id)}
                                    className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                    <FaFileInvoice className="inline-block mr-2" />
                                    Download Invoice
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500">You have not cast any votes yet.</p>
                )}
            </div>
        </div>
    );
};

export default VoteHistory;
