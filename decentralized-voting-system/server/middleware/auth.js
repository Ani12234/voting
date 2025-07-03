const jwt = require('jsonwebtoken');
const config = require('config');
const Voter = require('../models/Voter');
const Admin = require('../models/Admin');

const auth = {}

// General authentication middleware
auth.authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({
                success: false,
                message: 'No token, authorization denied'
            });
        }

        // Verify token
        const secret = config.get('jwtSecret');
        const decoded = jwt.verify(token, secret);

        // The decoded payload should have an 'id' and 'role'
        if (!decoded.id) {
            return res.status(401).json({
                success: false,
                message: 'Token is invalid (malformed payload)'
            });
        }
        
        // Check if user exists and is active
        let user;
        if (decoded.role === 'admin') {
            user = await Admin.findById(decoded.id);
        } else {
            user = await Voter.findById(decoded.id);
        }

        if (!user || !user.isActive) {
            return res.status(401).json({ 
                success: false,
                message: 'User not found or account is inactive' 
            });
        }

        // Add user to request object
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ 
            success: false,
            message: 'Token is not valid or expired' 
        });
    }
};

// Admin role middleware
auth.isAdmin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during admin authentication'
        });
    }
};

// Voter role middleware
auth.isVoter = async (req, res, next) => {
    try {
        if (req.user.role !== 'voter') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Voter privileges required.'
            });
        }
        next();
    } catch (error) {
        console.error('Voter auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during voter authentication'
        });
    }
};

// Check if voter is approved
auth.isApprovedVoter = async (req, res, next) => {
    try {
        if (req.user.status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Your account is pending approval or has been rejected.'
            });
        }
        next();
    } catch (error) {
        console.error('Voter approval check error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking voter approval status'
        });
    }
};

module.exports = auth;
