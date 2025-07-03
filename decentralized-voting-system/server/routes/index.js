const express = require('express');
const router = express.Router();


// Import all route files
const authRoutes = require('./auth');
const voterRoutes = require('./voters');
const adminRoutes = require('./admin');
const pollRoutes = require('./polls');

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/voters', voterRoutes);
router.use('/admin', adminRoutes);
router.use('/polls', pollRoutes);

module.exports = router;
