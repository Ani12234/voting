const { ethers } = require('ethers');
require('dotenv').config({ path: './client/.env' });

async function checkContract() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.REACT_APP_RPC_URL);
    const contractAddress = process.env.REACT_APP_VOTING_CONTRACT_ADDRESS;
    
    console.log('Checking contract at:', contractAddress);
    console.log('Using RPC URL:', process.env.REACT_APP_RPC_URL);
    
    // Check if address is valid
    if (!ethers.isAddress(contractAddress)) {
      console.error('Invalid contract address');
      return;
    }
    
    // Get the network
    const network = await provider.getNetwork();
    console.log('Connected to network:', network.name, 'Chain ID:', network.chainId);
    
    // Get the latest block number
    const blockNumber = await provider.getBlockNumber();
    console.log('Latest block number:', blockNumber);
    
    // Check contract code
    const code = await provider.getCode(contractAddress);
    console.log('Contract code length:', code.length);
    
    if (code === '0x') {
      console.error('❌ No contract code found at this address. The contract may not be deployed or the address is incorrect.');
      console.log('Possible solutions:');
      console.log('1. Verify the contract address is correct');
      console.log('2. Make sure the contract is deployed to the Sepolia testnet');
      console.log('3. Check that you are connected to the correct network');
    } else {
      console.log('✅ Contract found at the specified address!');
      console.log('Contract code starts with:', code.substring(0, 50) + '...');
    }
    
  } catch (error) {
    console.error('Error checking contract:', error);
  }
}

checkContract();
