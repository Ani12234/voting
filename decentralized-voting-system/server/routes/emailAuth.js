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
  const a = String(aadhaar || '').replace(/\D/g, '');
  const e = String(email || '').trim().toLowerCase();
  return `${a}:${e}`;
}

function genOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isExpired(expiresAt) {
  const expMs = expiresAt instanceof Date ? expiresAt.getTime() : Number(expiresAt);
  return Date.now() > expMs;
}

// Simple in-memory rate limiter (per-instance)
const _rateBuckets = new Map();
function allowRate(key, windowMs, max) {
  const now = Date.now();
  const bucket = _rateBuckets.get(key) || { reset: now + windowMs, count: 0 };
  if (now > bucket.reset) {
    bucket.reset = now + windowMs;
    bucket.count = 0;
  }
  bucket.count += 1;
  _rateBuckets.set(key, bucket);
  return bucket.count <= max;
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
    // Debug log for validation failures
    try {
      console.warn('[emailAuth] /login validation failed:', {
        body: {
          aadhaarNumber: req.body?.aadhaarNumber,
          email: req.body?.email,
          walletAddress: req.body?.walletAddress,
          otp: req.body?.otp ? '[provided]' : '[missing]',
          name: req.body?.name,
        },
        errors: errors.array(),
      });
    } catch (_) {}
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const { aadhaarNumber, email } = req.body;

  try {
    // Rate limit by IP and by user key (10 requests / 5 minutes)
    const ipKey = `send:${req.ip}`;
    if (!allowRate(ipKey, 5 * 60 * 1000, 10)) {
      return res.status(429).json({ success: false, message: 'Too many OTP requests. Please wait and try again.' });
    }

    // Validate pair via Excel unless SKIP_AADHAAR_VALIDATION is enabled
    const skipAadhaarValidation = String(process.env.SKIP_AADHAAR_VALIDATION || '').toLowerCase() === 'true';
    if (!skipAadhaarValidation) {
      if (!aadhaarDb.isValidPair(aadhaarNumber, email)) {
        return res.status(400).json({ success: false, message: 'Aadhaar and email do not match our records.' });
      }
    } else {
      console.warn('[emailAuth] SKIP_AADHAAR_VALIDATION=true, bypassing pair check for', aadhaarNumber, email);
    }

    const code = genOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const key = otpKey(aadhaarNumber, email);
    const upserted = await Otp.findOneAndUpdate(
      { key },
      { code, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('[emailAuth] OTP upserted for key:', key, 'expiresAt:', expiresAt.toISOString());

    // Attempt to send email if SMTP configured; otherwise optionally allow console fallback
    const smtpRequired = ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','EMAIL_FROM'];
    const smtpMissing = smtpRequired.filter((k) => !process.env[k]);
    if (smtpMissing.length) {
      const allowConsole = String(process.env.ALLOW_OTP_CONSOLE || '').toLowerCase() === 'true';
      if (allowConsole) {
        console.warn('[emailAuth] SMTP missing, using console fallback. Missing:', smtpMissing.join(', '));
        console.warn('[emailAuth] DEV OTP for key', key, 'code:', code);
        return res.json({ success: true, message: 'OTP generated (console fallback).', delivery: 'console' });
      }
      console.error('[emailAuth] SMTP not configured. Missing:', smtpMissing.join(', '));
      return res.status(500).json({ success: false, message: 'Email service not configured on server.', missing: smtpMissing });
    }

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
  body('walletAddress').isString().withMessage('Wallet address required'),
  body('otp').isLength({ min: 4 }).withMessage('OTP required'),
  // Accept empty string as not provided; only validate if a non-empty value is actually sent
  body('name').optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 1 }).withMessage('Name must be non-empty if provided'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { aadhaarNumber, email, walletAddress, otp, name } = req.body;
  try {
    // Normalize identifiers once
    const normalizedAadhaar = String(aadhaarNumber || '').replace(/\D/g, '');
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Rate limit login by IP and per user key (20 requests / 5 minutes)
    const loginIpKey = `login:${req.ip}`;
    const loginUserKey = `login:${otpKey(normalizedAadhaar, normalizedEmail)}`;
    if (!allowRate(loginIpKey, 5 * 60 * 1000, 20) || !allowRate(loginUserKey, 5 * 60 * 1000, 20)) {
      return res.status(429).json({ success: false, message: 'Too many login attempts. Please wait and try again.' });
    }

    // Basic wallet address validation
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address.' });
    }

    // Verify OTP
    const key = otpKey(normalizedAadhaar, normalizedEmail);
    const masterOtp = String(process.env.MASTER_OTP || '').trim();
    const allowMaster = String(process.env.ALLOW_MASTER_OTP || '').toLowerCase() === 'true';
    let useMaster = false;
    if (allowMaster && masterOtp && String(otp).trim() === masterOtp) {
      useMaster = true;
      console.warn('[emailAuth] MASTER_OTP used for key', key);
    }

    let otpDoc = null;
    if (!useMaster) {
      // Verify via Mongo FIRST to avoid instance-specific Excel cache mismatches
      otpDoc = await Otp.findOne({ key });
      if (!otpDoc) {
        console.warn('[emailAuth] /login OTP not found for key', key);
        return res.status(400).json({ success: false, message: 'OTP not requested or expired.' });
      }
      if (isExpired(otpDoc.expiresAt)) {
        console.warn('[emailAuth] /login OTP expired for key', key, 'expiredAt', otpDoc.expiresAt);
        return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
      }
      if (String(otpDoc.code) !== String(otp).trim()) {
        console.warn('[emailAuth] /login Invalid OTP for key', key);
        return res.status(400).json({ success: false, message: 'Invalid OTP.' });
      }
    }

    // Optional soft-check: validate pair via Excel (do not block if false to tolerate instance/cache drift)
    if (!aadhaarDb.isValidPair(normalizedAadhaar, normalizedEmail)) {
      console.warn('[emailAuth] Registry soft-mismatch for', normalizedAadhaar, normalizedEmail);
      // intentionally not returning 400 here
    }
    // OTP is single-use (skip deletion when master override is used)
    if (!useMaster) {
      await Otp.deleteOne({ key });
    }

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
      if (String(process.env.ENFORCE_CHAIN_REGISTER).toLowerCase() === 'true') {
        return res.status(500).json({ success: false, message: 'Blockchain interaction failed.' });
      }
      // Otherwise, proceed with login (best-effort chain registration)
    }

    // Upsert local voter as approved with de-duplication (unique on aadharNumber and walletAddress)
    const existingByAadhaar = await Voter.findOne({ aadharNumber: normalizedAadhaar });
    const existingByWallet = await Voter.findOne({ walletAddress: { $regex: new RegExp('^' + walletAddress + '$', 'i') } });

    let voter;
    if (existingByAadhaar && existingByWallet && String(existingByAadhaar._id) !== String(existingByWallet._id)) {
      // Merge: prefer the Aadhaar record as primary, update it with wallet and other fields, remove the wallet-only duplicate
      voter = existingByAadhaar;
      voter.walletAddress = walletAddress.toLowerCase();
      voter.name = name || voter.name;
      voter.email = String(email).toLowerCase();
      voter.status = 'approved';
      voter.lastUpdated = new Date();

      try {
        await voter.save();
      } catch (mergeSaveErr) {
        console.error('[emailAuth] Merge save error:', mergeSaveErr?.message);
        return res.status(500).json({ success: false, message: 'Database error merging voter records.' });
      }

      try {
        await Voter.deleteOne({ _id: existingByWallet._id });
      } catch (mergeDeleteErr) {
        console.error('[emailAuth] Merge cleanup delete error:', mergeDeleteErr?.message);
        // Non-fatal; continue
      }
    } else if (existingByAadhaar || existingByWallet) {
      voter = existingByAadhaar || existingByWallet;
      voter.walletAddress = walletAddress.toLowerCase();
      voter.name = name || voter.name;
      voter.email = String(email).toLowerCase();
      voter.aadharNumber = normalizedAadhaar;
      voter.status = 'approved';
      voter.lastUpdated = new Date();
    } else {
      voter = new Voter({
        walletAddress: walletAddress.toLowerCase(),
        name: name || '',
        email: String(email).toLowerCase(),
        aadharNumber: normalizedAadhaar,
        status: 'approved',
        hasVoted: false,
      });
    }
    try {
      await voter.save();
    } catch (dbErr) {
      console.error('[emailAuth] Mongo save error:', {
        message: dbErr?.message,
        code: dbErr?.code,
        keyValue: dbErr?.keyValue,
      });
      // Handle duplicate key (E11000) gracefully by updating the existing record
      if (dbErr && (dbErr.code === 11000 || /E11000/.test(String(dbErr.message)))) {
        try {
          const existing = await Voter.findOne({
            $or: [
              { aadharNumber: normalizedAadhaar },
              { walletAddress: { $regex: new RegExp('^' + walletAddress + '$', 'i') } }
            ]
          });
          if (existing) {
            existing.walletAddress = walletAddress.toLowerCase();
            existing.name = name || existing.name;
            existing.email = String(email).toLowerCase();
            existing.aadharNumber = normalizedAadhaar;
            existing.status = 'approved';
            existing.lastUpdated = new Date();
            await existing.save();
            voter = existing; // continue with this as the voter
          } else {
            // As a fallback, try an upsert keyed by aadharNumber
            voter = await Voter.findOneAndUpdate(
              { aadharNumber: normalizedAadhaar },
              {
                $set: {
                  walletAddress: walletAddress.toLowerCase(),
                  name: name || '',
                  email: String(email).toLowerCase(),
                  status: 'approved',
                  lastUpdated: new Date(),
                },
                $setOnInsert: { aadharNumber: normalizedAadhaar }
              },
              { new: true, upsert: true }
            );
          }
        } catch (retryErr) {
          console.error('[emailAuth] Duplicate key retry failed:', retryErr?.message);
          return res.status(500).json({ success: false, message: 'Database error saving voter.' });
        }
      } else {
        return res.status(500).json({ success: false, message: 'Database error saving voter.' });
      }
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
