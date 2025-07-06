const express = require('express');
const router = express.Router();
const Vote = require('../models/Vote');
const Poll = require('../models/Poll');
const Voter = require('../models/Voter');
const generateInvoice = require('../utils/generateInvoice');
const auth = require('../middleware/auth');

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

module.exports = router;
