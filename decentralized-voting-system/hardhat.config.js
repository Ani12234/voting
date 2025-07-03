require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

// Ensure the private key has the '0x' prefix
let adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
if (adminPrivateKey && !adminPrivateKey.startsWith('0x')) {
  adminPrivateKey = '0x' + adminPrivateKey;
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  paths: {
    artifacts: './artifacts',
    sources: "./contracts",
    cache: "./cache",
    tests: "./test"
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: adminPrivateKey ? [adminPrivateKey] : [],
    },
  },
};
