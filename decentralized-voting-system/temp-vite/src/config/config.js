export const VOTING_CONTRACT_ADDRESS = import.meta.env.VITE_VOTING_CONTRACT_ADDRESS;
export const VOTER_REGISTRY_CONTRACT_ADDRESS = import.meta.env.VITE_VOTER_REGISTRY_CONTRACT_ADDRESS;

export const NETWORK = {
  chainId: '0x5', // Mainnet chain ID in hex
  chainIdNumber: 5,
  chainName: 'Sepolia',
  rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL,
  blockExplorerUrl: 'https://sepolia.etherscan.io',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    decimals: 18
  }
};
