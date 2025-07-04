const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    options: [{
        text: String,
        votes: { type: Number, default: 0 }
    }],
    duration: {
        type: Number,
        required: true
    },
    blockchainId: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date,
        required: true
    }
});

module.exports = mongoose.model('Poll', pollSchema);
