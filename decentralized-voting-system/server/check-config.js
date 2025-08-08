require('dotenv').config();

console.log('=== Current Configuration ===');
console.log('Network URL:', process.env.INFURA_URL ? 'Set (ending with ' + process.env.INFURA_URL.split('/').pop() + ')' : 'Not set');
console.log('Contract Address:', process.env.VOTER_REGISTRY_ADDRESS || 'Not set');
console.log('Admin Wallet:', process.env.ADMIN_WALLET_ADDRESS || 'Not set');
console.log('Using Private Key:', process.env.ADMIN_PRIVATE_KEY ? 'Set (first 10 chars: ' + process.env.ADMIN_PRIVATE_KEY.substring(0, 10) + '...)' : 'Not set');

// Check if we can create a provider
if (process.env.INFURA_URL) {
  try {
    const { ethers } = require('ethers');
    const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
    const network = provider.network;
    console.log('\n=== Network Info ===');
    console.log('Network Name:', network.name);
    console.log('Chain ID:', network.chainId);
    
    // Check wallet balance if we have the address
    if (process.env.ADMIN_WALLET_ADDRESS) {
      console.log('\n=== Wallet Info ===');
      (async () => {
        try {
          const balance = await provider.getBalance(process.env.ADMIN_WALLET_ADDRESS);
          console.log('Wallet Balance:', ethers.formatEther(balance), 'ETH/ETH-equivalent');
          console.log('Note: If balance shows 0, please check:');
          console.log('1. The wallet address is correct for this network');
          console.log('2. The wallet has been funded on this network');
          console.log('3. The INFURA_URL is pointing to the correct network');
        } catch (err) {
          console.error('Error checking balance:', err.message);
        }
      })();
    }
  } catch (err) {
    console.error('Error initializing provider:', err.message);
  }
}
