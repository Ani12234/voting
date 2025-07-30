const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const Voter = require('../models/Voter');
const Vote = require('../models/Vote'); // Import the new Vote model
const votingContractArtifact = require('../../artifacts/contracts/Voting.sol/Voting.json');
const auth = require('../middleware/auth'); // Import auth middleware
const { ethers } = require('ethers');

// Get all polls (accessible to all authenticated users)
router.get('/', async (req, res) => {
    try {
        const pollsFromDB = await Poll.find().sort({ createdAt: -1 });

        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const votingContractAddress = process.env.VOTING_CONTRACT_ADDRESS;
        const votingContract = new ethers.Contract(votingContractAddress, votingContractArtifact.abi, provider);

        const pollsWithOnChainData = await Promise.all(pollsFromDB.map(async (poll) => {
            const pollObject = poll.toObject();
            const now = new Date();
            pollObject.status = now > poll.endTime ? 'Closed' : 'Active';

            if (pollObject.blockchainId !== undefined && pollObject.blockchainId !== null) {
                try {
                    const onChainPoll = await votingContract.getPoll(pollObject.blockchainId);
                    // onChainPoll.votes is an array of BigInts, convert them to numbers
                                        const onChainVotes = onChainPoll[3].map(voteCount => Number(voteCount));

                    // Update the votes in each option
                    pollObject.options.forEach((option, index) => {
                        if (index < onChainVotes.length) {
                            option.votes = onChainVotes[index];
                        }
                    });
                } catch (e) {
                    console.error(`Failed to fetch on-chain data for poll ${pollObject.blockchainId}:`, e.message);
                    // If fetching fails, we can leave the votes as they are in the DB
                }
            }
            return pollObject;
        }));

        res.json(pollsWithOnChainData);
    } catch (error) {
        console.error('Error fetching polls:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create a new poll (admin only)
require('dotenv').config();
const { VotingABI } = require('../utils/contracts');

// Check for required environment variables
const requiredEnvVars = ['VOTING_CONTRACT_ADDRESS', 'INFURA_URL', 'PRIVATE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
}

router.post('/', [auth.authenticate, auth.isAdmin], async (req, res) => {
    const { title, description, options, duration } = req.body;

    if (!title || !description || !Array.isArray(options) || options.length < 2 || !duration) {
        return res.status(400).json({ message: 'Invalid poll data provided.' });
    }

    try {
        // Step 1: Connect to the blockchain and get the admin signer
        const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const contract = new ethers.Contract(
            process.env.VOTING_CONTRACT_ADDRESS,
            VotingABI,
            wallet
        );

        const durationInMinutes = parseInt(duration, 10);
        if (isNaN(durationInMinutes) || durationInMinutes <= 0) {
            return res.status(400).json({ message: 'Invalid duration.' });
        }

        const durationInSeconds = durationInMinutes * 60;
        console.log(`Creating poll with duration: ${durationInMinutes} minutes (${durationInSeconds} seconds)`); // Debugging log

        // Step 2: Call the smart contract to create the poll on-chain
        console.log('Creating poll on-chain...');
        const tx = await contract.createPoll(title, description, options, durationInSeconds);
        const receipt = await tx.wait(); // Wait for the transaction to be mined
        console.log(`Poll created on-chain. Transaction hash: ${receipt.hash}`);

        // Step 3: Save the poll to the database after on-chain success
        const endTime = new Date(Date.now() + durationInSeconds * 1000);
        console.log(`Poll end time (database): ${endTime}`); // Debugging log
        // Get the poll ID from the transaction receipt
        // The events array might not be populated depending on the ethers version and provider.
        // A more robust way is to parse the logs manually.
        const event = receipt.logs.map(log => {
            try {
                return votingContract.interface.parseLog(log);
            } catch (e) {
                return null;
            }
        }).find(parsedLog => parsedLog && parsedLog.name === 'PollCreated');

        if (!event) {
            throw new Error('PollCreated event not found in transaction receipt');
        }

        const pollId = Number(event.args.pollId);
        console.log('Poll ID from contract:', pollId);
        
        const poll = new Poll({
            title,
            description,
            options: options.map(optText => ({ text: optText, votes: 0 })),
            duration: durationInMinutes,
            endTime,
            createdBy: req.user.id, // Associate with admin who created it
            blockchainId: pollId
        });

        const newPoll = await poll.save();
        res.status(201).json({
            message: 'Poll created successfully',
            poll: {
                id: newPoll.id,
                title: newPoll.title,
                description: newPoll.description,
                options: newPoll.options,
                startTime: newPoll.startTime,
                endTime: newPoll.endTime,
                status: newPoll.status,
                blockchainId: newPoll.blockchainId
            }
        });

    } catch (error) {
        console.error('Error creating poll:', error);
        // Check for specific contract errors if possible
        if (error.reason) {
            return res.status(500).json({ message: `Blockchain error: ${error.reason}` });
        }
        res.status(500).json({ message: 'Server error during poll creation.' });
    }
});

// Vote on a poll (approved voters only)
router.post('/:pollId/vote', [auth.authenticate, auth.isVoter, auth.isApprovedVoter], async (req, res) => {
    try {
        const pollId = req.params.pollId;
        const voterId = req.user.id; // Use the user ID from the token
        const { optionText } = req.body;

        // Check if the voter has already voted on this poll
        const existingVote = await Vote.findOne({ poll: pollId, voter: voterId });
        if (existingVote) {
            return res.status(409).json({ message: 'You have already voted on this poll.' });
        }

        const poll = await Poll.findById(pollId);
        if (!poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }

        const optionToUpdate = poll.options.find(opt => opt.text === optionText);
        if (!optionToUpdate) {
            return res.status(400).json({ message: 'Invalid option selected.' });
        }

        // Create a new vote record for each vote
        const newVote = new Vote({
            poll: pollId,
            voter: voterId,
            optionText: optionToUpdate.text
        });

        // Increment the vote count for the option
        optionToUpdate.votes += 1;

        await poll.save();
        await newVote.save();

        // Return the new vote object, which contains the unique ID for the receipt
        res.status(201).json(newVote);

    } catch (error) {
        console.error('Vote submission error:', error);
        res.status(500).json({ message: 'Server error during vote submission.' });
    }
});

// Delete a poll (admin only)
router.delete('/:id', [auth.authenticate, auth.isAdmin], async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);
        if (!poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }

        // Note: This does not affect the on-chain poll, it only removes it from the app's database.
        await Poll.findByIdAndDelete(req.params.id);

        // Also delete associated votes to keep the database clean
        await Vote.deleteMany({ poll: req.params.id });

        res.json({ message: 'Poll deleted successfully' });
    } catch (error) {
        console.error('Error deleting poll:', error);
        res.status(500).json({ message: 'Server error while deleting poll.' });
    }
});

// Update a poll (admin only)
router.put('/:id', [auth.authenticate, auth.isAdmin], async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title || !description) {
            return res.status(400).json({ message: 'Title and description are required.' });
        }

        const poll = await Poll.findById(req.params.id);
        if (!poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }

        // Note: This only updates the off-chain data in the database.
        const updatedPoll = await Poll.findByIdAndUpdate(
            req.params.id,
            { title, description },
            { new: true } // Return the updated document
        );

        res.json(updatedPoll);
    } catch (error) {
        console.error('Error updating poll:', error);
        res.status(500).json({ message: 'Server error while updating poll.' });
    }
});

module.exports = router;
