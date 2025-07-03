require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
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

// MongoDB Connection
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
}

// MongoDB connection options
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4
};

// Connect to MongoDB
mongoose.set('strictQuery', false); // To suppress deprecation warning
mongoose.connect(uri, mongoOptions)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/voters', require('./routes/voters'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/otp', require('./routes/otp'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
