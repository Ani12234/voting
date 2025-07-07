const jwt = require('jsonwebtoken');
require('dotenv').config();
const Admin = require('../models/Admin');
const Voter = require('../models/Voter');

// Check for required environment variables
if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not defined in environment variables');
    process.exit(1);
}

const auth = {};

// General-purpose authentication middleware
auth.authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({
                success: false,
                message: 'No token provided, authorization denied.'
            });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Standardize the payload to handle both { user: { id, role } } and { id, role } structures
        const payload = decoded.user && decoded.user.id ? decoded.user : decoded;

        if (!payload.id || !payload.role) {
             return res.status(401).json({
                success: false,
                message: 'Token is invalid because it has a malformed payload.'
            });
        }

        // Fetch user from the database based on the role specified in the token
        let user;
        if (payload.role === 'admin') {
            user = await Admin.findById(payload.id);
        } else if (payload.role === 'voter') {
            user = await Voter.findById(payload.id);
        } else {
            return res.status(401).json({
                success: false,
                message: 'Token contains an invalid user role.'
            });
        }

        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'User associated with this token was not found.' 
            });
        }

        // Create a plain user object for the request and ensure the role from the token is used
        req.user = user.toObject();
        req.user.id = user._id.toString(); // Ensure id is consistently available
        req.user.role = payload.role;
        req.token = token;
        next();

    } catch (error) {
        console.error('Authentication middleware error:', error.name, error.message);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token is not valid or has expired. Please log in again.' 
            });
        }

        res.status(500).json({
            success: false,
            message: 'An unexpected server error occurred during authentication.'
        });
    }
};

// Middleware to authorize admin-only routes
auth.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges are required.'
    });
};

// Middleware to authorize voter-only routes
auth.isVoter = (req, res, next) => {
    if (req.user && req.user.role === 'voter') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied. Voter privileges are required.'
    });
};

// Middleware to check if a voter's registration has been approved
auth.isApprovedVoter = (req, res, next) => {
    // This middleware should run after isVoter to ensure req.user is a voter
    if (req.user && req.user.status === 'approved') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied. Your registration has not been approved by an admin yet.'
    });
};

module.exports = auth;
