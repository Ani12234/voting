import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { Box, VStack, HStack, SimpleGrid, 
         Card, CardHeader, CardBody, CardFooter, 
         Heading, Text as ChakraText, 
         Progress, Stack, useToast, Text, Button, Badge } from '@chakra-ui/react';
import jsPDF from 'jspdf';

const Polls = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [vote, setVote] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/polls`);
      const data = await response.json();
      setPolls(data);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch polls',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId, option) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voterAddress: address,
          option: option
        })
      });

      if (!response.ok) throw new Error('Failed to vote');

      await generateVoteReceipt(pollId, option);

      toast({
        title: 'Success',
        description: 'Vote submitted successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setHasVoted(true);
      fetchPolls();
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const generateVoteReceipt = async (pollId, option) => {
    try {
      const doc = new jsPDF();
      const poll = polls.find(p => p.id === pollId);
      
      doc.setFontSize(22);
      doc.text('Voting Receipt', 105, 20, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text(`Poll: ${poll.title}`, 15, 40);
      doc.text(`Option: ${option}`, 15, 55);
      doc.text(`Time: ${new Date().toLocaleString()}`, 15, 70);
      
      doc.setFontSize(12);
      doc.text('This receipt confirms your vote has been recorded on the blockchain.', 15, 90);
      
      doc.save(`vote_receipt_${pollId}_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const getPollResults = async (pollId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/polls/${pollId}/results`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching results:', error);
      return null;
    }
  };

  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Text>Loading polls...</Text>
      </Box>
    );
  }

  return (
    <Box p={8}>
      <Heading as="h1" size="2xl" mb={8}>
        Available Polls
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {polls.map((poll) => (
          <Card key={poll.id}>
            <CardHeader>
              <Heading size="md">{poll.title}</Heading>
              <ChakraText fontSize="sm" color="gray.600">
                {new Date(poll.startDate).toLocaleDateString()} - {new Date(poll.endDate).toLocaleDateString()}
              </ChakraText>
            </CardHeader>

            <CardBody>
              <ChakraText>{poll.description}</ChakraText>
              
              <VStack spacing={4} mt={4}>
                {poll.options.map((option, index) => (
                  <Button 
                    key={index}
                    onClick={() => handleVote(poll.id, option)}
                    colorScheme="blue"
                    width="full"
                    disabled={hasVoted}
                  >
                    {option}
                  </Button>
                ))}
              </VStack>

              {hasVoted && (
                <Box mt={4}>
                  <Heading size="sm" mb={2}>Results</Heading>
                  <Progress 
                    value={50}
                    size="sm"
                    colorScheme="green"
                  />
                </Box>
              )}
            </CardBody>

            <CardFooter>
              <HStack>
                <Badge colorScheme="blue">{poll.votesCount} votes</Badge>
                <Badge colorScheme="green">Active</Badge>
              </HStack>
            </CardFooter>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default Polls;
