require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

// Load environment variables
require('dotenv').config();

// Get admin credentials from environment variables
const ADMIN_WALLET_ADDRESS = process.env.ADMIN_WALLET_ADDRESS;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const registerAdmin = async () => {
  // Validate required environment variables
  const requiredEnvVars = ['MONGODB_URI', 'ADMIN_WALLET_ADDRESS', 'ADMIN_PASSWORD'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please set these variables in your .env file');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI not found in .env file.');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      family: 4,
      retryWrites: true,
      w: 'majority'
    });
    console.log('✅ MongoDB Connected Successfully');

    const existingAdmin = await Admin.findOne({ walletAddress: ADMIN_WALLET_ADDRESS.toLowerCase() });
    if (existingAdmin) {
      console.log('Admin with this wallet address already exists.');
      return;
    }

    console.log('Creating new admin...');
    const admin = new Admin({
      walletAddress: ADMIN_WALLET_ADDRESS,
      password: ADMIN_PASSWORD,
    });

    await admin.save();
    console.log(`✅ Admin created successfully!\n   Wallet: ${admin.walletAddress}`);

  } catch (error) {
    console.error('Failed to register admin:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

registerAdmin();
