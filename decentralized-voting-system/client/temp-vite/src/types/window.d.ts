/// <reference types="web-vitals" />

interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request?: (request: { method: string; params?: any[] }) => Promise<any>;
    on?: (event: string, callback: (accounts: string[]) => void) => void;
    removeListener?: (event: string, callback: (accounts: string[]) => void) => void;
  };
  web3?: any; // for older MetaMask versions
}
