require('dotenv').config();
const { ethers } = require('ethers');
const voterRegistryArtifact = require('../artifacts/contracts/VoterRegistry.sol/VoterRegistry.json');

// Check for required environment variables
const requiredEnvVars = ['INFURA_URL', 'VOTER_REGISTRY_ADDRESS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please add them to your .env file');
    process.exit(1);
}

// Get environment variables
const INFURA_URL = process.env.INFURA_URL;
const VOTER_REGISTRY_ADDRESS = process.env.VOTER_REGISTRY_ADDRESS;

async function checkContract() {
  console.log('--- Contract Connection Test ---');
  console.log('Using RPC URL:', INFURA_URL);
  console.log('Using Contract Address:', VOTER_REGISTRY_ADDRESS);
  
  // Validate contract address format
  if (!ethers.isAddress(VOTER_REGISTRY_ADDRESS)) {
    console.error('❌ Invalid contract address format');
    return;
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(INFURA_URL);
    
    console.log('\n1. Checking network connection...');
    const network = await provider.getNetwork();
    console.log('   Connected to network:', network.name, '(Chain ID:', network.chainId.toString() + ')');

    console.log('\n2. Checking for contract code...');
    const code = await provider.getCode(VOTER_REGISTRY_ADDRESS);
    if (code === '0x') {
      console.error('   Error: No contract code found at the provided address. The address is likely incorrect or the contract is not deployed on Sepolia.');
      return;
    }
    console.log('   Contract code found at the address.');

    console.log('\n3. Interacting with the contract...');
    const contract = new ethers.Contract(VOTER_REGISTRY_ADDRESS, voterRegistryArtifact.abi, provider);
    
    console.log('   Calling the "admin()" function...');
    const adminAddress = await contract.admin();
    
    console.log('\n--- Success! ---');
    console.log('The admin address of the contract is:', adminAddress);
    console.log('Connection to the smart contract was successful.');

  } catch (error) {
    console.error('\n--- Error ---');
    console.error('An error occurred during the test:', error.message);
  }
}

checkContract();
