require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const web3 = require('web3');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'] // Allow x-auth-token
}));
app.use(express.json());

// Handle preflight requests
app.options('*', cors());

// JWT Authentication Middleware
const auth = (req, res, next) => {
    // Get token from header, supporting both 'x-auth-token' and 'Authorization: Bearer'
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

    // Check if no token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded; // Use req.user which is more generic for voters and admins
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Connect to Database
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/voters', require('./routes/voters'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/invoice', require('./routes/invoice'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
