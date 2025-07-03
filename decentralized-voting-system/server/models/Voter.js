const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    name: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    aadharNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    mobileNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    hasVoted: {
        type: Boolean,
        default: false
    },
    votedPolls: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Poll'
    }],
    registrationDate: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Voter', voterSchema);
