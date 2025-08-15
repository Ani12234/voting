const express = require('express');
const router = express.Router();
const Vote = require('../models/Vote');
const Poll = require('../models/Poll');
const Voter = require('../models/Voter');
const generateInvoice = require('../utils/generateInvoice');
const auth = require('../middleware/auth');
const { setChallenge, getChallenge, deleteChallenge } = require('../utils/challenges');
const { makeNonce, buildChallenge, verifySignature, derivePassword } = require('../utils/signature');
const { encryptPdfBuffer } = require('../utils/pdfEncrypt');

// GET /invoice/:voteId - Generate and download a vote invoice
router.get('/:voteId', auth.authenticate, async (req, res) => {
    try {
        const vote = await Vote.findById(req.params.voteId);

        if (!vote) {
            return res.status(404).json({ message: 'Vote not found.' });
        }

        // Ensure the logged-in user is the one who cast the vote
        if (vote.voter.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only download your own invoices.' });
        }

        const poll = await Poll.findById(vote.poll);
        const voter = await Voter.findById(vote.voter);

        if (!poll || !voter) {
            return res.status(404).json({ message: 'Associated poll or voter not found.' });
        }

        const pdfBuffer = await generateInvoice(vote, poll, voter);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${vote._id}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ message: 'Server error while generating invoice.' });
    }
});

// GET /invoice/:voteId/challenge - Issue a nonce-based challenge for the wallet to sign
router.get('/:voteId/challenge', auth.authenticate, async (req, res) => {
    try {
        const vote = await Vote.findById(req.params.voteId);
        if (!vote) {
            return res.status(404).json({ message: 'Vote not found.' });
        }
        if (vote.voter.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const voter = await Voter.findById(vote.voter);
        if (!voter || !voter.walletAddress) {
            return res.status(404).json({ message: 'Voter wallet not found.' });
        }

        const nonce = makeNonce();
        const challenge = buildChallenge(voter.walletAddress, String(vote._id), nonce);
        const key = `${vote._id}:${voter.walletAddress.toLowerCase()}`;
        setChallenge(key, { nonce, challenge }, 5 * 60 * 1000);
        return res.json({ address: voter.walletAddress, voteId: String(vote._id), challenge });
    } catch (e) {
        console.error('Challenge error:', e);
        return res.status(500).json({ message: 'Server error creating challenge.' });
    }
});

// POST /invoice/:voteId/download - Verify signature, encrypt PDF with derived password, return base64
router.post('/:voteId/download', auth.authenticate, async (req, res) => {
    try {
        const { address, signature } = req.body || {};
        if (!address || !signature) {
            return res.status(400).json({ message: 'address and signature required' });
        }

        const vote = await Vote.findById(req.params.voteId);
        if (!vote) return res.status(404).json({ message: 'Vote not found.' });
        if (vote.voter.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied.' });
        }
        const voter = await Voter.findById(vote.voter);
        if (!voter || !voter.walletAddress) {
            return res.status(404).json({ message: 'Voter wallet not found.' });
        }
        if (voter.walletAddress.toLowerCase() !== String(address).toLowerCase()) {
            return res.status(400).json({ message: 'Address mismatch.' });
        }

        const key = `${vote._id}:${voter.walletAddress.toLowerCase()}`;
        const stored = getChallenge(key);
        if (!stored) {
            return res.status(400).json({ message: 'Challenge expired or not found. Request a new challenge.' });
        }

        const { nonce, challenge } = stored;
        const ok = await verifySignature(voter.walletAddress, signature, challenge);
        if (!ok) {
            return res.status(400).json({ message: 'Invalid signature.' });
        }

        // Derive password deterministically from signature + voteId
        const password = derivePassword({ address: voter.walletAddress, voteId: String(vote._id), signature });

        // Create the invoice PDF
        const poll = await Poll.findById(vote.poll);
        if (!poll) return res.status(404).json({ message: 'Poll not found.' });
        const pdfBuffer = await generateInvoice(vote, poll, voter);

        let encrypted;
        try {
            encrypted = await encryptPdfBuffer(pdfBuffer, password);
        } catch (encErr) {
            console.error('PDF encryption failed, returning unencrypted PDF:', encErr.message);
            // Fallback: still return the PDF but mark notEncrypted
            return res.json({
                password,
                notEncrypted: true,
                filename: `invoice-${vote._id}.pdf`,
                pdfBase64: pdfBuffer.toString('base64')
            });
        }

        // Return as base64 + password so client can save and the reader will prompt for password
        return res.json({
            password,
            filename: `invoice-${vote._id}.pdf`,
            pdfBase64: encrypted.toString('base64')
        });
    } catch (e) {
        console.error('Secure invoice download error:', e);
        return res.status(500).json({ message: 'Server error during secure invoice download.' });
    } finally {
        // Invalidate challenge after attempt
        try {
            const user = await Voter.findById(req.user.id);
            if (user && user.walletAddress) {
                deleteChallenge(`${req.params.voteId}:${user.walletAddress.toLowerCase()}`);
            }
        } catch {}
    }
});

module.exports = router;
