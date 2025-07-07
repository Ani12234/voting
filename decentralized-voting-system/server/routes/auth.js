const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { ethers } = require('ethers');
const Voter = require('../models/Voter');
const Admin = require('../models/Admin');
require('dotenv').config();
const VoterRegistry = require('../../artifacts/contracts/VoterRegistry.sol/VoterRegistry.json');

// Check for required environment variables
const requiredEnvVars = ['JWT_SECRET', 'VOTER_REGISTRY_ADDRESS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
}

// Input validation middleware
const validateLogin = [
    body('walletAddress')
        .trim()
        .isEthereumAddress()
        .withMessage('Please provide a valid Ethereum address'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
];

const validateRegister = [
    body('walletAddress')
        .trim()
        .isEthereumAddress()
        .withMessage('Please provide a valid Ethereum address')
        .custom(async (value) => {
            const admin = await Admin.findOne({ walletAddress: value.toLowerCase() });
            if (admin) {
                throw new Error('Admin already exists');
            }
            return true;
        }),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
];

// Admin login
router.post('/login', validateLogin, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array().map(err => err.msg) 
            });
        }

        const { walletAddress, password } = req.body;
        
        // Find admin by case-insensitive wallet address
        const admin = await Admin.findOne({ 
            walletAddress: { $regex: new RegExp('^' + walletAddress + '$', 'i') } 
        });
        
        if (!admin || !admin.isActive) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: admin._id, walletAddress: admin.walletAddress },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            admin: {
                walletAddress: admin.walletAddress,
                lastLogin: admin.lastLogin
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during authentication' 
        });
    }
});

// Admin registration
router.post('/register', validateRegister, async (req, res) => {
    console.log('Registration request received:', {
        walletAddress: req.body.walletAddress,
        password: req.body.password ? '***' : 'undefined'
    });

    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ 
                success: false,
                errors: errors.array().map(err => ({
                    param: err.param,
                    msg: err.msg,
                    value: err.value
                }))
            });
        }

        const { walletAddress, password } = req.body;
        
        console.log('Creating new admin with:', {
            walletAddress: walletAddress.toLowerCase(),
            password: password ? '***' : 'undefined'
        });
        
        // Create new admin with lowercase wallet address
        const admin = new Admin({ 
            walletAddress: walletAddress.toLowerCase(),
            password 
        });
        
        await admin.save();
        
        console.log('Admin created successfully:', admin.walletAddress);
        
        res.status(201).json({ 
            success: true,
            message: 'Admin created successfully' 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ 
            success: false,
            message: error.message || 'Failed to create admin account' 
        });
    }
});

// Voter login (wallet-based)
router.post('/voter/login', [
    body('walletAddress').isEthereumAddress().withMessage('Invalid wallet address')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { walletAddress } = req.body;

    try {
        console.log(`[LOGIN ATTEMPT] Wallet: ${walletAddress}`);

        const voter = await Voter.findOne({ 
            walletAddress: { $regex: new RegExp('^' + walletAddress + '$', 'i') } 
        });

        if (!voter) {
            console.log(`[LOGIN FAILED] Reason: Voter not found in database.`);
            return res.status(404).json({ message: 'Voter not found. Please register first.' });
        }
        console.log(`[LOGIN] Voter found in DB. Status: ${voter.status}`);

        if (voter.status !== 'approved') {
            console.log(`[LOGIN FAILED] Reason: Voter status is '${voter.status}', not 'approved'.`);
            return res.status(403).json({ message: `Your registration status is ${voter.status}. Please wait for admin approval.` });
        }

        console.log('[LOGIN] Checking on-chain registration...');
        const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const contract = new ethers.Contract(
            process.env.VOTER_REGISTRY_ADDRESS,
            VoterRegistry.abi,
            wallet
        );

        const isRegistered = await contract.isRegistered(walletAddress);
        console.log(`[LOGIN] On-chain registration status: ${isRegistered}`);

        if (!isRegistered) {
            console.log(`[LOGIN FAILED] Reason: Voter not registered on-chain.`);
            return res.status(403).json({ message: 'Voter approved but not yet registered on-chain. Please wait a moment and try again.' });
        }

        console.log('[LOGIN SUCCESS] All checks passed. Generating token.');
        const payload = {
            id: voter.id,
            role: 'voter'
        };

        jwt.sign(
            payload,
            config.get('jwtSecret'),
            { expiresIn: '5h' },
            (err, token) => {
                if (err) {
                    console.error('JWT Signing Error:', err);
                    return res.status(500).send('Server error during token signing');
                }
                res.json({
                    token,
                    voter: {
                        id: voter.id,
                        name: voter.name,
                        walletAddress: voter.walletAddress
                    }
                });
            }
        );

    } catch (error) {
        console.error('Voter login error:', error);
        res.status(500).send('Server error during voter login');
    }
});

module.exports = router;
