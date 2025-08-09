const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');

require('dotenv').config();

const Voter = require('../models/Voter');
const Otp = require('../models/Otp');
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

// OTPs are stored in MongoDB via `Otp` model with a TTL index on expiresAt

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
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = typeof process.env.SMTP_SECURE !== 'undefined'
  ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
  : smtpPort === 465; // SSL for 465 by default

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpSecure,
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
    // Ensure SMTP configuration is present
    const smtpRequired = ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','EMAIL_FROM'];
    const smtpMissing = smtpRequired.filter((k) => !process.env[k]);
    if (smtpMissing.length) {
      console.error('[emailAuth] SMTP not configured. Missing:', smtpMissing.join(', '));
      return res.status(500).json({ success: false, message: 'Email service not configured on server.', missing: smtpMissing });
    }

    // Validate pair via Excel
    if (!aadhaarDb.isValidPair(aadhaarNumber, email)) {
      return res.status(400).json({ success: false, message: 'Aadhaar and email do not match our records.' });
    }

    const code = genOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const key = otpKey(aadhaarNumber, email);
    await Otp.findOneAndUpdate(
      { key },
      { code, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const mailOpts = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your Voting OTP Code',
      text: `Your OTP is ${code}. It expires in 5 minutes.`,
    };
    await transporter.sendMail(mailOpts);

    return res.json({ success: true, message: 'OTP sent to email.' });
  } catch (err) {
    const log = {
      message: err?.message,
      code: err?.code,
      responseCode: err?.responseCode,
      command: err?.command,
    };
    console.error('[emailAuth] send-otp error:', log);
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

    // Verify OTP via Mongo
    const key = otpKey(aadhaarNumber, email);
    const entry = await Otp.findOne({ key });
    if (!entry) {
      return res.status(400).json({ success: false, message: 'OTP not requested or expired.' });
    }
    if (isExpired(entry.expiresAt)) {
      await Otp.deleteOne({ key });
      return res.status(400).json({ success: false, message: 'OTP expired.' });
    }
    if (entry.code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }
    // OTP is single-use
    await Otp.deleteOne({ key });

    // Ensure required chain envs are present
    const chainRequired = ['INFURA_URL', 'ADMIN_PRIVATE_KEY', 'VOTER_REGISTRY_ADDRESS'];
    const chainMissing = chainRequired.filter((k) => !process.env[k]);
    if (chainMissing.length) {
      console.error('[emailAuth] Chain not configured. Missing:', chainMissing.join(', '));
      return res.status(500).json({ success: false, message: 'Blockchain not configured on server.' });
    }

    // Ensure on-chain registration
    try {
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
    } catch (chainErr) {
      console.error('[emailAuth] Chain interaction error:', {
        message: chainErr?.message,
        code: chainErr?.code,
        reason: chainErr?.reason,
      });
      return res.status(500).json({ success: false, message: 'Blockchain interaction failed.' });
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
    try {
      await voter.save();
    } catch (dbErr) {
      console.error('[emailAuth] Mongo save error:', {
        message: dbErr?.message,
        code: dbErr?.code,
        keyValue: dbErr?.keyValue,
      });
      return res.status(500).json({ success: false, message: 'Database error saving voter.' });
    }

    // Issue JWT
    let token;
    try {
      token = jwt.sign({ id: voter._id, role: 'voter' }, process.env.JWT_SECRET, { expiresIn: '5h' });
    } catch (jwtErr) {
      console.error('[emailAuth] JWT sign error:', jwtErr?.message);
      return res.status(500).json({ success: false, message: 'Failed to issue token.' });
    }

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
    console.error('[emailAuth] login error:', {
      message: err?.message,
      stack: err?.stack,
    });
    return res.status(500).json({ success: false, message: 'Server error during email OTP login.' });
  }
});

module.exports = router;
