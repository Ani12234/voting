export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    timeout: 10000,
  },
  blockchain: {
    network: import.meta.env.VITE_NETWORK || 'localhost',
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  },
  app: {
    name: 'VoteChain',
    version: '1.0.0',
    theme: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#60A5FA',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
    },
  },
};

// Type definitions for config
export interface Config {
  api: {
    baseUrl: string;
    timeout: number;
  };
  blockchain: {
    network: string;
    contractAddress: string;
  };
  app: {
    name: string;
    version: string;
    theme: {
      primary: string;
      secondary: string;
      accent: string;
      success: string;
      warning: string;
      danger: string;
    };
  };
}
