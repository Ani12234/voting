require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const web3 = require('web3');
const path = require('path');

const app = express();

// Set JWT secret if not in environment
if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET not set in environment. Using default secret.');
    process.env.JWT_SECRET = 'your_jwt_secret';
}

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle preflight requests
app.options('*', cors());

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
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
};

// Connect to MongoDB
mongoose.set('strictQuery', false);
mongoose.connect(uri, mongoOptions)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// API Routes
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
    // Set static folder
    app.use(express.static(path.join(__dirname, '../client/build')));

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', err);
    // Close server & exit process
    // server.close(() => process.exit(1));
});
