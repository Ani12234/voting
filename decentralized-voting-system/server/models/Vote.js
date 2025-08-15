const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
    poll: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Poll',
        required: true
    },
    voter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Voter',
        required: true
    },
    optionText: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { collection: 'votes' });

// Enforce one-vote-per-poll at the DB level
voteSchema.index({ poll: 1, voter: 1 }, { unique: true, name: 'uniq_poll_voter' });

module.exports = mongoose.model('Vote', voteSchema);
