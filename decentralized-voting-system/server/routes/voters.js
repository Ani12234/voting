const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const Voter = require('../models/Voter');
const Vote = require('../models/Vote');
const auth = require('../middleware/auth');
const { ethers } = require('ethers');

// Check for required environment variables
const requiredEnvVars = ['JWT_SECRET', 'VOTER_REGISTRY_ADDRESS', 'INFURA_URL', 'ADMIN_PRIVATE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
}

// ABI for the VoterRegistry contract
const VoterRegistryABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [], "name": "admin", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_voter", "type": "address" }], "name": "hasAlreadyVoted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "hasVoted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_voter", "type": "address" }], "name": "isRegistered", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_voter", "type": "address" }], "name": "markAsVoted", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_voter", "type": "address" }], "name": "registerVoter", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "selfRegister", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "registeredVoters", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }
];

// Get all voters (admin only)
router.get('/', auth.authenticate, auth.isAdmin, async (req, res) => {
    try {
        const voters = await Voter.find({}).sort({ registrationDate: -1 });
        res.json(voters);
    } catch (error) {
        console.error('Error fetching voters:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Provide transaction data for self-registration (client signs and sends)
router.get('/self-register/tx', async (req, res) => {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
        const network = await provider.getNetwork();
        const iface = new ethers.Interface(VoterRegistryABI);
        const data = iface.encodeFunctionData('selfRegister', []);

        return res.json({
            to: process.env.VOTER_REGISTRY_ADDRESS,
            data,
            value: '0x0',
            chainId: Number(network.chainId)
        });
    } catch (error) {
        console.error('Error building self-register tx:', error);
        res.status(500).json({ message: 'Failed to build self-register transaction' });
    }
});

// Confirm self-registration by checking on-chain state and approving locally
router.post('/self-register/confirm', [
    body('walletAddress').isEthereumAddress().withMessage('Invalid wallet address'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please include a valid email'),
    body('aadharNumber').isLength({ min: 12, max: 12 }).withMessage('Aadhar number must be 12 digits'),
    body('mobileNumber').isLength({ min: 10, max: 10 }).withMessage('Mobile number must be 10 digits')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { walletAddress, name, email, aadharNumber, mobileNumber } = req.body;

        const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
        const registry = new ethers.Contract(process.env.VOTER_REGISTRY_ADDRESS, VoterRegistryABI, provider);
        const isRegistered = await registry.isRegistered(walletAddress);

        if (!isRegistered) {
            return res.status(400).json({
                success: false,
                message: 'Wallet not registered on-chain yet. Please submit the selfRegister transaction from your wallet.'
            });
        }

        // Ensure Aadhar/Mobile are not linked to another wallet
        const existingByDetails = await Voter.findOne({
            $or: [{ aadharNumber }, { mobileNumber }],
            walletAddress: { $ne: walletAddress.toLowerCase() }
        });
        if (existingByDetails) {
            return res.status(409).json({
                success: false,
                message: 'Aadhar or Mobile Number is already registered with a different wallet address.'
            });
        }

        // Upsert voter and mark approved
        let voter = await Voter.findOne({ walletAddress: walletAddress.toLowerCase() });
        if (!voter) {
            voter = new Voter({
                walletAddress: walletAddress.toLowerCase(),
                name,
                email,
                aadharNumber,
                mobileNumber,
                status: 'approved',
                statusReason: 'Self-registered on-chain'
            });
        } else {
            voter.name = name;
            voter.email = email;
            voter.aadharNumber = aadharNumber;
            voter.mobileNumber = mobileNumber;
            voter.status = 'approved';
            voter.statusReason = 'Self-registered on-chain';
            voter.lastUpdated = new Date();
        }

        await voter.save();

        return res.status(200).json({
            success: true,
            message: 'Self-registration confirmed and approved.',
            voter: {
                id: voter.id,
                walletAddress: voter.walletAddress,
                name: voter.name,
                status: voter.status
            }
        });
    } catch (error) {
        console.error('Error confirming self-registration:', error);
        res.status(500).json({ success: false, message: 'Server error during self-registration confirmation.' });
    }
});

// Register a new voter (self-registration)
router.post('/register', [
    body('walletAddress').isEthereumAddress().withMessage('Invalid wallet address'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please include a valid email'),
    body('aadharNumber').isLength({ min: 12, max: 12 }).withMessage('Aadhar number must be 12 digits'),
    body('mobileNumber').isLength({ min: 10, max: 10 }).withMessage('Mobile number must be 10 digits')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { walletAddress, name, email, aadharNumber, mobileNumber } = req.body;

        // Check if personal details are already linked to another wallet
        const existingVoterByDetails = await Voter.findOne({
            $or: [{ aadharNumber }, { mobileNumber }],
            walletAddress: { $ne: walletAddress.toLowerCase() }
        });

        if (existingVoterByDetails) {
            return res.status(409).json({
                success: false,
                message: 'Aadhar or Mobile Number is already registered with a different wallet address.'
            });
        }

        // Find or create the voter record by wallet address
        let voter = await Voter.findOne({ walletAddress: walletAddress.toLowerCase() });

        if (voter) {
            // Wallet exists, update the record
            voter.name = name;
            voter.email = email;
            voter.aadharNumber = aadharNumber;
            voter.mobileNumber = mobileNumber;
            voter.status = 'pending'; // Reset status for re-approval
            voter.lastUpdated = new Date();
        } else {
            // No existing record for this wallet, create a new one
            voter = new Voter({
                walletAddress: walletAddress.toLowerCase(),
                name,
                email,
                aadharNumber,
                mobileNumber,
                status: 'pending'
            });
        }

        await voter.save();

        res.status(201).json({
            success: true,
            message: 'Registration request submitted successfully. Waiting for admin approval.',
            status: 'pending'
        });

    } catch (error) {
        console.error('Voter registration error:', error);
        // Handle potential duplicate key errors from the database
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'A user with the provided details already exists.'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: error.message
        });
    }
});

// Voter Login
router.post('/login', [
    body('walletAddress').isEthereumAddress().withMessage('Invalid wallet address'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            errors: errors.array() 
        });
    }

    const { walletAddress } = req.body;

    try {
        const voter = await Voter.findOne({ walletAddress: walletAddress.toLowerCase() });

        if (!voter) {
            return res.status(404).json({ 
                success: false,
                message: 'Voter not registered. Please complete the registration process.' 
            });
        }

        if (voter.status === 'pending') {
            return res.status(403).json({ 
                success: false,
                message: 'Your registration is pending approval.' 
            });
        }

        if (voter.status === 'rejected') {
            return res.status(403).json({ 
                success: false,
                message: 'Your registration has been rejected. Please contact support.' 
            });
        }

        if (voter.status === 'approved') {
            const token = jwt.sign(
                { id: voter._id, role: 'voter' }, 
                process.env.JWT_SECRET, 
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                token,
                voter: {
                    id: voter.id,
                    walletAddress: voter.walletAddress,
                    name: voter.name,
                    status: voter.status
                }
            });
        } else {
             // Should not happen, but as a fallback
             return res.status(403).json({ 
                success: false,
                message: 'Your account is not active. Please contact support.' 
            });
        }

    } catch (error) {
        console.error('Voter login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during login',
            error: error.message 
        });
    }
});

// Check voter status (public)
router.get('/status/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        
        if (!ethers.isAddress(walletAddress)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid wallet address' 
            });
        }
        
        const voter = await Voter.findOne({ 
            walletAddress: walletAddress.toLowerCase() 
        });
        
        if (!voter) {
            return res.status(200).json({ 
                success: true,
                registered: false,
                pending: false,
                status: 'not_registered'
            });
        }

        res.json({
            success: true,
            registered: voter.status === 'approved',
            pending: voter.status === 'pending',
            status: voter.status,
            hasVoted: voter.hasVoted || false,
            walletAddress: voter.walletAddress,
            name: voter.name,
            email: voter.email,
            registrationDate: voter.registrationDate
        });
    } catch (error) {
        console.error('Voter status check error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error checking voter status',
            error: error.message 
        });
    }
});

// Update voter status (admin only)
router.put(
    '/:voterId/status',
    auth.authenticate,
    auth.isAdmin,
    [
        body('status').isIn(['approved', 'rejected']).withMessage('Invalid status value.'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { voterId } = req.params;
            const { status } = req.body;

            const voter = await Voter.findById(voterId);

            if (!voter) {
                return res.status(404).json({ message: 'Voter not found' });
            }

            // Ensure voter profile is complete before approving
            if (status === 'approved' && (!voter.aadharNumber || !voter.mobileNumber)) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot approve voter. Profile is incomplete. Missing Aadhar or Mobile Number.'
                });
            }

            // If status is 'approved', register on-chain first
            if (status === 'approved') {
                try {
                    console.log('Initializing blockchain connection...');
                    const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
                    const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
                    const contract = new ethers.Contract(
                        process.env.VOTER_REGISTRY_ADDRESS,
                        VoterRegistryABI,
                        wallet
                    );
                    console.log('Using admin wallet for contract interaction:', process.env.ADMIN_WALLET_ADDRESS);

                    console.log('Checking if voter is already registered on-chain...');
                    const isAlreadyRegistered = await contract.isRegistered(voter.walletAddress);

                    if (isAlreadyRegistered) {
                        console.log(`[INFO] Voter ${voter.walletAddress} is already registered on-chain.`);
                    } else {
                        console.log(`[INFO] Registering voter ${voter.walletAddress} on-chain...`);
                        const tx = await contract.registerVoter(voter.walletAddress);
                        console.log(`Transaction sent. Waiting for confirmation...`);
                        const receipt = await tx.wait();
                        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
                        console.log(`Voter ${voter.walletAddress} registered on-chain successfully. Tx: ${tx.hash}`);
                    }

                } catch (error) {
                    console.log('--- BLOCKCHAIN REGISTRATION FAILED ---');
                    console.error(`[ERROR] Failed to register voter ${voter.walletAddress} on-chain.`);
                    // Log detailed error information from ethers.js
                    console.error('[ERROR] Message:', error.message);
                    console.error('[ERROR] Reason:', error.reason); 
                    console.error('[ERROR] Code:', error.code);
                    console.error('[ERROR] Transaction:', error.transactionHash);
                    console.error('[ERROR] Stack Trace:', error.stack);
                    console.log('--------------------------------------');
                    
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to register voter on the blockchain.',
                        error: {
                            reason: error.reason || 'An unknown error occurred.',
                            code: error.code
                        }
                    });
                }
            }

            // Update the voter status in the database
            try {
                voter.status = status;
                voter.statusReason = status === 'approved' 
                    ? 'Registration approved by admin.' 
                    : 'Registration rejected by admin.';
                voter.lastUpdated = Date.now();
                await voter.save();

                console.log(`Successfully updated voter ${voter._id} status to ${status}`);
                
                res.json({
                    success: true,
                    message: `Voter status updated to ${status}.`,
                    voter: {
                        _id: voter._id,
                        walletAddress: voter.walletAddress,
                        name: voter.name,
                        status: voter.status,
                        lastUpdated: voter.lastUpdated
                    },
                });
            } catch (dbError) {
                console.error('Error updating voter in database:', dbError);
                // Even if database update fails, we've already made the blockchain changes
                // So we'll return a success response but note the database issue
                res.status(202).json({
                    success: true,
                    message: `Voter was registered on blockchain but there was an issue updating the database.`,
                    warning: 'Database update may not be reflected',
                    voter: {
                        walletAddress: voter.walletAddress,
                        status: 'approved' // Since blockchain succeeded
                    }
                });
            }
        } catch (error) {
            console.error('Error updating voter status:', error);
            
            // More detailed error response
            const errorResponse = {
                success: false,
                message: 'Failed to update voter status',
                error: error.message || 'Unknown error',
                code: error.code,
                reason: error.reason,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            };
            
            // If it's a blockchain error, add more context
            if (error.transactionHash) {
                errorResponse.transactionHash = error.transactionHash;
                errorResponse.message = 'Blockchain transaction failed';
            }
            
            res.status(500).json(errorResponse);
        }
    }
);

// DEBUG: Get voter data by wallet address (admin only)
router.get('/debug/:walletAddress', auth.authenticate, auth.isAdmin, async (req, res) => {
    try {
        const { walletAddress } = req.params;
        if (!ethers.isAddress(walletAddress)) {
            return res.status(400).json({ message: 'Invalid wallet address format.' });
        }

        const voter = await Voter.findOne({
            walletAddress: { $regex: new RegExp('^' + walletAddress + '$', 'i') }
        });

        if (!voter) {
            return res.status(404).json({ message: 'Voter not found with that address.' });
        }

        res.json({
            message: 'Voter data found.',
            voter
        });

    } catch (error) {
        console.error('Debug voter check error:', error);
        res.status(500).json({ message: 'Server error during debug check.' });
    }
});

// Get the voting history for the logged-in voter
router.get('/history', [auth.authenticate, auth.isVoter], async (req, res) => {
    try {
        const voterId = req.user.id;
        const votes = await Vote.find({ voter: voterId })
            .populate('poll', 'title description') // Populate poll details
            .sort({ timestamp: -1 }); // Show latest votes first

        res.json(votes);
    } catch (error) {
        console.error('Error fetching vote history:', error);
        res.status(500).json({ message: 'Server error while fetching vote history.' });
    }
});

module.exports = router;
