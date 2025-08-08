require('dotenv').config();

console.log('=== Simple Config Check ===');
console.log('1. INFURA_URL:', process.env.INFURA_URL ? 'Set' : 'Not set');
console.log('2. VOTER_REGISTRY_ADDRESS:', process.env.VOTER_REGISTRY_ADDRESS || 'Not set');
console.log('3. ADMIN_WALLET_ADDRESS:', process.env.ADMIN_WALLET_ADDRESS || 'Not set');
console.log('4. ADMIN_PRIVATE_KEY:', process.env.ADMIN_PRIVATE_KEY ? 'Set (first 5 chars: ' + process.env.ADMIN_PRIVATE_KEY.substring(0, 5) + '...)' : 'Not set');
