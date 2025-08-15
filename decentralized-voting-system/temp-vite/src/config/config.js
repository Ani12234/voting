// Normalize addresses to lowercase to avoid ethers v6 mixed-case checksum errors (v6 accepts all-lowercase or valid checksum)
const envVoting = import.meta.env.VITE_VOTING_CONTRACT_ADDRESS || '0x16fa1c5e54575c5d6141409509fde2d4f0b91cfa';
const envRegistry = import.meta.env.VITE_VOTER_REGISTRY_CONTRACT_ADDRESS || '0x0af0c36f624d6d2875fac427460fb9fbd8571ea1';

export const VOTING_CONTRACT_ADDRESS = String(envVoting).toLowerCase();
export const VOTER_REGISTRY_CONTRACT_ADDRESS = String(envRegistry).toLowerCase();

export const NETWORK = {
  // Sepolia
  chainId: '0xaa36a7', // 11155111 in hex
  chainIdNumber: 11155111,
  chainName: 'Sepolia',
  rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL,
  blockExplorerUrl: 'https://sepolia.etherscan.io',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    decimals: 18
  }
};
