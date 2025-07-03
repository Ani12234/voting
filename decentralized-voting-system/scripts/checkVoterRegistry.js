const { ethers } = require('ethers');
require('dotenv').config({ path: '../server/.env' });

const voterRegistryABI = [
    {
      "inputs": [],
      "name": "admin",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "authorizedContract",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
];

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const voterRegistryAddress = process.env.VOTER_REGISTRY_ADDRESS;

const voterRegistryContract = new ethers.Contract(voterRegistryAddress, voterRegistryABI, provider);

async function checkContractState() {
  try {
    console.log(`Checking VoterRegistry contract at: ${voterRegistryAddress}`);

    const admin = await voterRegistryContract.admin();
    console.log(`The admin of the contract is: ${admin}`);

    const authorizedContract = await voterRegistryContract.authorizedContract();
    console.log(`The authorized contract is: ${authorizedContract}`);

  } catch (error) {
    console.error('Error checking contract state:', error);
  }
}

checkContractState();
