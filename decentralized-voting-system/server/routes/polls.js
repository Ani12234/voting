const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const Voter = require('../models/Voter');
const Vote = require('../models/Vote'); // Import the new Vote model
// Import the contract ABI
const VotingArtifact = require('../../artifacts/contracts/Voting.sol/Voting.json');
const VotingABI = VotingArtifact.abi;
const auth = require('../middleware/auth'); // Import auth middleware
const { ethers } = require('ethers');

// Get all polls (accessible to all authenticated users)
router.get('/', async (req, res) => {
    try {
        const pollsFromDB = await Poll.find().sort({ createdAt: -1 });

        const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
        const votingContractAddress = process.env.VOTING_CONTRACT_ADDRESS;
        const votingContract = new ethers.Contract(votingContractAddress, VotingABI, provider);

        const pollsWithOnChainData = await Promise.all(pollsFromDB.map(async (poll) => {
            const pollObject = poll.toObject();
            const now = new Date();
            pollObject.status = poll.endTime && now > poll.endTime ? 'Closed' : 'Active';
            // Include the contract address used for debugging/UX alignment
            pollObject.contractAddress = votingContractAddress;

            if (pollObject.blockchainId !== undefined && pollObject.blockchainId !== null) {
                try {
                    const onChainPoll = await votingContract.getPoll(pollObject.blockchainId);
                    pollObject.onChainValid = true;
                    // ABI order (artifact): [title, description, options, votes, endTime, isActive]
                    const votesArray = Array.isArray(onChainPoll.votes) ? onChainPoll.votes : onChainPoll[3];
                    const onChainVotes = (votesArray || []).map(voteCount => Number(voteCount));
                    // Optionally expose endTime/isActive for UI if needed
                    pollObject.endTimeOnChain = Number(onChainPoll.endTime ?? onChainPoll[4]);
                    pollObject.isActiveOnChain = Boolean(onChainPoll.isActive ?? onChainPoll[5]);

                    // Update the votes in each option
                    pollObject.options.forEach((option, index) => {
                        if (index < onChainVotes.length) {
                            option.votes = onChainVotes[index];
                        }
                    });
                } catch (e) {
                    console.error(`Failed to fetch on-chain data for poll ${pollObject.blockchainId}:`, e.message);
                    pollObject.onChainValid = false;
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

// Check for required environment variables
const requiredEnvVars = ['VOTING_CONTRACT_ADDRESS', 'INFURA_URL', 'ADMIN_PRIVATE_KEY'];
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
        const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
        const contract = new ethers.Contract(
            process.env.VOTING_CONTRACT_ADDRESS,
            VotingABI,
            wallet
        );

        console.log('Received duration:', duration);
        
        let durationInSeconds;
        let endTime;
        let durationInMinutes;

        if (duration === 'infinite') {
            // Use a large but safe number for 'infinite' duration (100 years in seconds)
            durationInSeconds = (60 * 60 * 24 * 365 * 100).toString();
            endTime = null; // Represents infinite duration in the database
            durationInMinutes = null;
        } else {
            // Convert minutes to seconds for the blockchain
            durationInMinutes = parseInt(duration, 10);
            if (isNaN(durationInMinutes) || durationInMinutes <= 0) {
                return res.status(400).json({ message: 'Invalid duration provided. Must be a positive number or "infinite".' });
            }
            // Validate maximum duration (e.g., 1 year)
            const MAX_DURATION_MINUTES = 60 * 24 * 365; // 1 year in minutes
            if (durationInMinutes > MAX_DURATION_MINUTES) {
                return res.status(400).json({ 
                    message: `Duration too long. Maximum allowed is ${MAX_DURATION_MINUTES} minutes (1 year).` 
                });
            }
            durationInSeconds = (durationInMinutes * 60).toString();
            endTime = new Date(Date.now() + durationInMinutes * 60 * 1000);
        }

        // Ensure the value is within safe integer range for JavaScript
        if (durationInSeconds && !Number.isSafeInteger(Number(durationInSeconds))) {
            return res.status(400).json({ 
                message: 'Duration results in a number that is too large.' 
            });
        }


        console.log(`Creating poll with duration: ${durationInMinutes} minutes (${durationInSeconds} seconds)`); // Debugging log

        // Step 2: Call the smart contract to create the poll on-chain
        console.log('Creating poll on-chain...');
        console.log(`Title: ${title}, Description: ${description}, Options: ${options}, Duration: ${durationInSeconds} seconds`);
        
        // Initialize contract with admin wallet
        console.log('Initializing contract with INFURA_URL:', process.env.INFURA_URL);
        console.log('Using VOTING_CONTRACT_ADDRESS:', process.env.VOTING_CONTRACT_ADDRESS);
        
        try {
            // In ethers v6, we can directly use ethers.JsonRpcProvider
            const pollProvider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
            const pollWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, pollProvider);
            const pollContract = new ethers.Contract(
                process.env.VOTING_CONTRACT_ADDRESS,
                VotingABI,
                pollWallet
            );
            
            console.log('Successfully connected to contract. Using admin wallet:', process.env.ADMIN_WALLET_ADDRESS);
            
            // In ethers v6, we can directly use ethers.toBigInt for large numbers
            console.log('Converting duration to BigInt. Input:', durationInSeconds);
            const durationBigInt = ethers.toBigInt(durationInSeconds);
            console.log('Successfully converted to BigInt:', durationBigInt.toString());
            
            console.log('Sending transaction to create poll...');
            
            // Log the exact parameters being sent to the contract
            console.log('Function parameters:', {
                title,
                description,
                options,
                duration: durationBigInt.toString()
            });
            
            // Get the contract interface to check the function signature
            const contractInterface = new ethers.Interface(VotingABI);
            const functionFragment = contractInterface.getFunction('createPoll');
            console.log('Function signature:', functionFragment.format('sighash'));
            
            try {
                // Try with a higher gas limit and explicit gas price
                const tx = await pollContract.createPoll(
                    title,
                    description,
                    options,
                    durationBigInt,
                    {
                        gasLimit: 2000000, // Increased gas limit
                        gasPrice: await pollProvider.getFeeData().then(feeData => feeData.gasPrice * 2n) // Higher gas price
                    }
                );
                
                console.log('Transaction sent. Hash:', tx.hash);
                console.log('Waiting for transaction confirmation...');
                
                const receipt = await tx.wait();
                // Make receipt available after this block
                var pollReceipt = receipt;
                
                if (receipt.status === 0) {
                    throw new Error('Transaction reverted');
                }
                
                console.log('Transaction confirmed in block:', receipt.blockNumber);
                // In ethers v6, the transaction hash on the receipt is `hash`
                console.log('Poll created on-chain. Transaction hash:', receipt.hash);
                
                // Do not return here; continue to process logs and persist to DB
                // return receipt;
            } catch (txError) {
                console.error('Transaction error details:', {
                    code: txError.code,
                    reason: txError.reason,
                    data: txError.data,
                    transaction: txError.transaction,
                    receipt: txError.receipt,
                    stack: txError.stack
                });
                
                // Try to decode the revert reason if available
                if (txError.data) {
                    try {
                        const revertReason = contractInterface.parseError(txError.data);
                        console.error('Revert reason:', revertReason);
                    } catch (decodeError) {
                        console.error('Could not decode revert reason:', decodeError);
                    }
                }
                
                throw txError;
            }
        } catch (error) {
            console.error('Detailed error creating poll on-chain:', {
                message: error.message,
                code: error.code,
                reason: error.reason,
                data: error.data,
                stack: error.stack
            });
            throw error; // This will be caught by the outer try-catch
        }

        // Step 3: Save the poll to the database after on-chain success
        console.log(`Poll end time (database): ${endTime}`); // Debugging log
        // Get the poll ID from the transaction receipt
        // The events array might not be populated depending on the ethers version and provider.
        // A more robust way is to parse the logs manually.
        // Ensure we have the receipt from the transaction above
        if (!pollReceipt) {
            throw new Error('Missing transaction receipt for event parsing');
        }
        const parseInterface = new ethers.Interface(VotingABI);
        const event = pollReceipt.logs.map(log => {
            try {
                return parseInterface.parseLog(log);
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

        // Validate poll and option first
        const poll = await Poll.findById(pollId);
        if (!poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }

        const optionToUpdate = poll.options.find(opt => opt.text === optionText);
        if (!optionToUpdate) {
            return res.status(400).json({ message: 'Invalid option selected.' });
        }

        // Policy: One vote per poll (per-poll voting)
        // Prevent duplicate votes by the same voter on the same poll
        const existingVote = await Vote.findOne({ poll: pollId, voter: voterId });
        if (existingVote) {
            return res.status(409).json({ message: 'You have already voted on this poll.' });
        }

        try {
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

            // Record poll participation for the voter (no global hasVoted flag)
            await Voter.updateOne(
                { _id: voterId },
                { $addToSet: { votedPolls: poll._id }, $set: { lastUpdated: new Date() } }
            );

            // Return the new vote object, which contains the unique ID for the receipt
            return res.status(201).json(newVote);
        } catch (innerErr) {
            // Translate duplicate key from DB unique index (poll+voter) into a 409
            if (innerErr && (innerErr.code === 11000 || /E11000/.test(String(innerErr.message)))) {
                return res.status(409).json({ message: 'You have already voted on this poll.' });
            }
            console.error('Vote processing error:', innerErr);
            return res.status(500).json({ message: 'Server error during vote submission.' });
        }

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
