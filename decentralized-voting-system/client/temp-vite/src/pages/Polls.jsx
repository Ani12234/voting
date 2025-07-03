import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '../components/ui/Card';
import { useAccountContext } from '../context/AccountContext';

const Polls = () => {
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { account } = useAccountContext();

  useEffect(() => {
    const fetchPolls = async () => {
      if (!account?.token) {
        setError('Authentication token not found. Please log in.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/polls`, {
          headers: { 'x-auth-token': account.token },
        });
        if (!response.ok) throw new Error('Failed to fetch polls');
        const data = await response.json();
        setPolls(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (account) {
      fetchPolls();
    }
  }, [account]);

  if (isLoading) return <div className="text-center p-8">Loading polls...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6 text-center"
      >
        Active Polls
      </motion.h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {polls.map(poll => (
          <motion.div key={poll._id} layout>
            <Card>
              <div className="p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{poll.title}</h2>
                <p className="text-gray-600 mb-4 h-12 overflow-hidden">{poll.description}</p>
                <div className="space-y-3">
                  {poll.options.map((option, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-700">{option.name}</span>
                      <span className="text-sm font-bold text-gray-500">{option.votes} Votes</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Polls;
