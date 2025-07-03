const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Voter = require('../models/Voter');
const auth = require('../middleware/auth');

// Get all pending registrations
router.get('/voters/pending', auth.authenticate, auth.isAdmin, async (req, res) => {
    try {
        const pendingVoters = await Voter.find({ status: 'pending' })
            .select('-__v')
            .sort({ registrationDate: -1 });
            
        res.json({
            success: true,
            count: pendingVoters.length,
            voters: pendingVoters
        });
    } catch (error) {
        console.error('Error fetching pending voters:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending voters',
            error: error.message
        });
    }
});

// Update voter status (approve/reject)
router.patch('/voters/:id/status', [
    auth.authenticate,
    auth.isAdmin,
    body('status').isIn(['approved', 'rejected']).withMessage('Invalid status')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const { status } = req.body;
        const voter = await Voter.findById(req.params.id);
        
        if (!voter) {
            return res.status(404).json({
                success: false,
                message: 'Voter not found'
            });
        }

        // Update voter status
        voter.status = status;
        voter.lastUpdated = Date.now();
        await voter.save();

        // TODO: If approved, register voter on the blockchain
        // This would interact with your smart contract

        res.json({
            success: true,
            message: `Voter ${status} successfully`,
            voter: {
                id: voter._id,
                walletAddress: voter.walletAddress,
                status: voter.status,
                lastUpdated: voter.lastUpdated
            }
        });
    } catch (error) {
        console.error('Error updating voter status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating voter status',
            error: error.message
        });
    }
});

// Get all voters (with filters)
router.get('/voters', auth.authenticate, auth.isAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        
        if (status) {
            filter.status = status;
        }
        
        const voters = await Voter.find(filter)
            .select('-__v')
            .sort({ registrationDate: -1 });
            
        res.json({
            success: true,
            count: voters.length,
            voters
        });
    } catch (error) {
        console.error('Error fetching voters:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching voters',
            error: error.message
        });
    }
});

module.exports = router;
