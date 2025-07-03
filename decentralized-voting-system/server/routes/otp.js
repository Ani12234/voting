const express = require('express');
const router = express.Router();
const twilio = require('twilio');

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// In-memory storage for OTPs (for demonstration purposes)
const otpStore = {};

// Send OTP
router.post('/send-otp', async (req, res) => {
    const { mobileNumber } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        await client.messages.create({
            body: `Your OTP for voter registration is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `+91${mobileNumber}`
        });

        otpStore[mobileNumber] = otp;
        res.status(200).json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});

// Verify OTP
router.post('/verify-otp', (req, res) => {
    const { mobileNumber, otp } = req.body;

    if (otpStore[mobileNumber] && otpStore[mobileNumber] === otp) {
        delete otpStore[mobileNumber]; // OTP is single-use
        res.status(200).json({ success: true, message: 'OTP verified successfully' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
});

module.exports = router;
