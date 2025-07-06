const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('config');
const Voter = require('../models/Voter');
const Vote = require('../models/Vote');
const auth = require('../middleware/auth');
const { ethers } = require('ethers');

// ABI for the VoterRegistry contract
const VoterRegistryABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [], "name": "admin", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_voter", "type": "address" }], "name": "hasAlreadyVoted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "hasVoted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_voter", "type": "address" }], "name": "isRegistered", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_voter", "type": "address" }], "name": "markAsVoted", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_voter", "type": "address" }], "name": "registerVoter", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
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
            const payload = {
                user: {
                    id: voter.id,
                    role: 'voter'
                }
            };

            const secret = config.get('jwtSecret');
            console.log('[DEBUG] Signing token with secret:', secret);
            jwt.sign(
                payload,
                secret,
                { expiresIn: '5h' },
                (err, token) => {
                    if (err) throw err;
                    res.status(200).json({
                        success: true,
                        message: 'Login successful.',
                        token,
                        voter: {
                            id: voter._id,
                            name: voter.name,
                            email: voter.email,
                            walletAddress: voter.walletAddress,
                            hasVoted: voter.hasVoted,
                        }
                    });
                }
            );
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
                    const provider = new ethers.JsonRpcProvider(config.get('sepoliaRpcUrl'));
                    const adminWallet = new ethers.Wallet(config.get('adminPrivateKey'), provider);
                    const voterRegistryContract = new ethers.Contract(
                        config.get('voterRegistryAddress'),
                        VoterRegistryABI,
                        adminWallet
                    );

                    // Check if the voter is already registered on-chain before attempting to register
                    const isAlreadyRegistered = await voterRegistryContract.isRegistered(voter.walletAddress);

                    if (isAlreadyRegistered) {
                        console.log(`[INFO] Voter ${voter.walletAddress} is already registered on-chain. Skipping blockchain transaction.`);
                    } else {
                        console.log(`[INFO] Registering voter ${voter.walletAddress} on-chain...`);
                        const tx = await voterRegistryContract.registerVoter(voter.walletAddress);
                        await tx.wait();
                        console.log(`Voter ${voter.walletAddress} registered on-chain successfully. Tx: ${tx.hash}`);
                    }

                } catch (error) {
                    console.log('--- BLOCKCHAIN REGISTRATION FAILED ---');
                    console.error(`[ERROR] Failed to register voter ${voter.walletAddress} on-chain.`);
                    console.error('[ERROR] Reason:', error.reason);
                    console.error('[ERROR] Code:', error.code);
                    console.error('[ERROR] Full error object:', JSON.stringify(error, null, 2));
                    console.log('--------------------------------------');
                    
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to register voter on the blockchain.',
                        error: error.message || 'Unknown error'
                    });
                }
            }

            // This block now correctly updates the database only after all checks and transactions have passed.
            voter.status = status;
            voter.statusReason = status === 'approved' 
                ? 'Registration approved by admin.' 
                : 'Registration rejected by admin.';
            voter.lastUpdated = Date.now();
            await voter.save();

            res.json({
                success: true,
                message: `Voter status updated to ${status}.`,
                voter,
            });
        } catch (error) {
            console.error('Error updating voter status:', error);
            res.status(500).json({ message: 'Server error' });
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
