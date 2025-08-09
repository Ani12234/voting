const mongoose = require('mongoose');

// Key format: `${aadhaarNumber}:${email.toLowerCase()}` after normalization
const otpSchema = new mongoose.Schema({
  key: { type: String, required: true, index: true, unique: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Keep updatedAt fresh on save
otpSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Otp', otpSchema);
