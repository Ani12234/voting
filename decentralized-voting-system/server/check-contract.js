require('dotenv').config();
const { ethers } = require('ethers');
const config = require('config');
const voterRegistryArtifact = require('../artifacts/contracts/VoterRegistry.sol/VoterRegistry.json');

// Get config variables
const SEPOLIA_RPC_URL = config.get('sepoliaRpcUrl');
const VOTER_REGISTRY_ADDRESS = config.get('voterRegistryAddress');

async function checkContract() {
  if (!SEPOLIA_RPC_URL || !VOTER_REGISTRY_ADDRESS) {
    console.error('Error: Please make sure SEPOLIA_RPC_URL and VOTER_REGISTRY_ADDRESS are set in your environment and mapped in config/custom-environment-variables.json.');
    return;
  }

  console.log('--- Contract Connection Test ---');
  console.log('Using RPC URL:', SEPOLIA_RPC_URL);
  console.log('Using Contract Address:', VOTER_REGISTRY_ADDRESS);

  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    
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
