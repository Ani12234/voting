import React, { useState } from 'react';
import { useAccountContext } from '../context/AccountContext';
import { isMobileUA, openInMetaMaskDeepLink, getInjectedProvider } from '../utils/wallet';

const ConnectWalletButton = ({ className = '', onConnected }) => {
  const { account, connectWallet } = useAccountContext();
  const [busy, setBusy] = useState(false);
  const isMobile = isMobileUA();

  const handleClick = async () => {
    if (account?.address) {
      onConnected?.(account.address);
      return;
    }
    try {
      setBusy(true);
      const eth = getInjectedProvider();
      if (!eth && isMobile) {
        openInMetaMaskDeepLink(window.location.pathname + window.location.search);
        return;
      }
      const { address } = await connectWallet();
      onConnected?.(address);
    } catch (e) {
      console.error('Connect wallet failed:', e);
      // noop; parent UI should handle toasts if needed
    } finally {
      setBusy(false);
    }
  };

  const label = account?.address
    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    : (busy ? 'Connecting...' : (isMobile && !getInjectedProvider() ? 'Open in MetaMask' : 'Connect Wallet'));

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-3 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 ${className}`}
      disabled={busy}
      title={account?.address || ''}
    >
      {label}
    </button>
  );
};

export default ConnectWalletButton;
