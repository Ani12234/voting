require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const web3 = require('web3');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-frontend-domain.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(express.json());

// Handle preflight requests
app.options('*', cors());
app.get("/", (req, res) => {
    res.json({ status: 'Server is running' });
}); 

// JWT Authentication Middleware
const auth = (req, res, next) => {
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Connect to Database
connectDB().catch(console.error);

// Routes


app.use('/api/auth', require('./routes/auth'));
app.use('/api/voters', require('./routes/voters'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/invoice', require('./routes/invoice'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Export the Express API for Vercel
module.exports = app;

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
}
