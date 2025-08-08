const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');

require('dotenv').config();

const Voter = require('../models/Voter');
const aadhaarDb = require('../config/aadhaarDb');
const VoterRegistry = require('../../artifacts/contracts/VoterRegistry.sol/VoterRegistry.json');

// Basic runtime checks
const requiredEnv = [
  'JWT_SECRET',
  'INFURA_URL',
  'VOTER_REGISTRY_ADDRESS',
  'ADMIN_PRIVATE_KEY',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'
];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn('[emailAuth] Missing env vars:', missing.join(', '));
}

// In-memory OTP store: { key: { code, expiresAt } }
// Keyed by `${aadhaarNumber}:${email}`
const otpStore = new Map();

function otpKey(aadhaar, email) {
  return `${String(aadhaar)}:${String(email).toLowerCase()}`;
}

function genOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isExpired(expiresAt) {
  return Date.now() > expiresAt;
}

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for others
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send OTP to email if (aadhaar,email) pair exists in Excel
router.post('/send-otp', [
  body('aadhaarNumber').isLength({ min: 4 }).withMessage('Aadhaar number required'),
  body('email').isEmail().withMessage('Valid email required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const { aadhaarNumber, email } = req.body;

  try {
    // Validate pair via Excel
    if (!aadhaarDb.isValidPair(aadhaarNumber, email)) {
      return res.status(400).json({ success: false, message: 'Aadhaar and email do not match our records.' });
    }

    const code = genOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    otpStore.set(otpKey(aadhaarNumber, email), { code, expiresAt });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your Voting OTP Code',
      text: `Your OTP is ${code}. It expires in 5 minutes.`,
    });

    return res.json({ success: true, message: 'OTP sent to email.' });
  } catch (err) {
    console.error('[emailAuth] send-otp error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
});

// Login with OTP: verifies pair and OTP, registers on-chain if needed, upserts voter, returns JWT
router.post('/login', [
  body('aadhaarNumber').isLength({ min: 4 }).withMessage('Aadhaar number required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('walletAddress').custom((v) => ethers.isAddress(v)).withMessage('Valid wallet address required'),
  body('otp').isLength({ min: 4 }).withMessage('OTP required'),
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Name must be non-empty if provided'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { aadhaarNumber, email, walletAddress, otp, name } = req.body;

  try {
    // Validate pair via Excel
    if (!aadhaarDb.isValidPair(aadhaarNumber, email)) {
      return res.status(400).json({ success: false, message: 'Aadhaar and email do not match our records.' });
    }

    // Verify OTP
    const key = otpKey(aadhaarNumber, email);
    const entry = otpStore.get(key);
    if (!entry) {
      return res.status(400).json({ success: false, message: 'OTP not requested or expired.' });
    }
    if (isExpired(entry.expiresAt)) {
      otpStore.delete(key);
      return res.status(400).json({ success: false, message: 'OTP expired.' });
    }
    if (entry.code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }
    // OTP is single-use
    otpStore.delete(key);

    // Ensure on-chain registration
    const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
    const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(
      process.env.VOTER_REGISTRY_ADDRESS,
      VoterRegistry.abi,
      wallet
    );

    const alreadyRegistered = await contract.isRegistered(walletAddress);
    if (!alreadyRegistered) {
      const tx = await contract.registerVoter(walletAddress);
      await tx.wait();
    }

    // Upsert local voter as approved
    let voter = await Voter.findOne({ walletAddress: { $regex: new RegExp('^' + walletAddress + '$', 'i') } });
    if (!voter) {
      voter = new Voter({
        walletAddress: walletAddress.toLowerCase(),
        name: name || '',
        email: String(email).toLowerCase(),
        aadharNumber: String(aadhaarNumber),
        status: 'approved',
        hasVoted: false,
      });
    } else {
      voter.name = name || voter.name;
      voter.email = String(email).toLowerCase();
      voter.aadharNumber = String(aadhaarNumber);
      voter.status = 'approved';
      voter.lastUpdated = new Date();
    }
    await voter.save();

    // Issue JWT
    const token = jwt.sign({ id: voter._id, role: 'voter' }, process.env.JWT_SECRET, { expiresIn: '5h' });

    return res.json({
      success: true,
      token,
      voter: {
        id: voter._id,
        name: voter.name,
        walletAddress: voter.walletAddress,
        status: voter.status,
      }
    });
  } catch (err) {
    console.error('[emailAuth] login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during email OTP login.' });
  }
});

module.exports = router;
