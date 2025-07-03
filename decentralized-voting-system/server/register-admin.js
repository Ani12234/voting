require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

// --- IMPORTANT --- 
// Replace these placeholders with your desired admin credentials before running the script.
const ADMIN_WALLET_ADDRESS = '0x3471336301Fb210c486BFA5C7e2800249409d0b2';
const ADMIN_PASSWORD = 'Anirudh#455';
// -----------------

const registerAdmin = async () => {
  if (ADMIN_WALLET_ADDRESS === 'YOUR_ETHEREUM_WALLET_ADDRESS' || ADMIN_PASSWORD === 'YOUR_SECURE_PASSWORD') {
    console.error('ERROR: Please replace the placeholder credentials in the register-admin.js file before running.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI not found in .env file.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected.');

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
