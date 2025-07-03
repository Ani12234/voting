const { ethers } = require('ethers');

async function checkContract() {
  // Use the RPC URL from your .env file
  const provider = new ethers.JsonProvider(process.env.REACT_APP_RPC_URL);
  
  const contractAddress = process.env.REACT_APP_VOTING_CONTRACT_ADDRESS;
  console.log('Checking contract at:', contractAddress);
  
  try {
    // Check if the address is a valid Ethereum address
    if (!ethers.isAddress(contractAddress)) {
      console.error('Invalid contract address');
      return;
    }
    
    // Get the contract code
    const code = await provider.getCode(contractAddress);
    console.log('Contract code length:', code.length);
    
    if (code === '0x') {
      console.error('No contract code found at this address. The contract may not be deployed or the address is incorrect.');
      return;
    }
    
    // Get the network information
    const network = await provider.getNetwork();
    console.log('Network:', network.name, 'Chain ID:', network.chainId);
    
    // Get the latest block number
    const blockNumber = await provider.getBlockNumber();
    console.log('Latest block number:', blockNumber);
    
    console.log('Contract exists at the specified address!');
    
  } catch (error) {
    console.error('Error checking contract:', error);
  }
}

checkContract();
