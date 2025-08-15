export function isMobileUA() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function getInjectedProvider() {
  const eth = typeof window !== 'undefined' ? window.ethereum : undefined;
  if (!eth) return undefined;
  // Some browsers inject multiple providers
  if (eth.providers && Array.isArray(eth.providers)) {
    // Prefer MetaMask if available
    const mm = eth.providers.find((p) => p.isMetaMask);
    return mm || eth.providers[0];
  }
  return eth;
}

export function inMetaMaskInApp() {
  const eth = getInjectedProvider();
  return Boolean(eth && eth.isMetaMask);
}

// Build a MetaMask Mobile deep link to the current dapp.
// If VITE_PUBLIC_DAPP_HOST is set (e.g. app.example.com), we use that host. Otherwise we fall back to window.location.host.
// NOTE: localhost/127.0.0.1 won't work in MetaMask Mobile deep link.
export function buildMetaMaskDeepLink(targetPath = '/') {
  let host = import.meta.env.VITE_PUBLIC_DAPP_HOST || (typeof window !== 'undefined' ? window.location.host : '');
  if (!host) host = '';
  // Strip protocol if accidentally included
  host = host.replace(/^https?:\/\//, '');
  const sanitizedPath = String(targetPath || '/').replace(/^\//, '');
  return `https://metamask.app.link/dapp/${host}/${sanitizedPath}`.replace(/\/$/, '');
}

export function openInMetaMaskDeepLink(targetPath = '/') {
  const url = buildMetaMaskDeepLink(targetPath);
  window.location.href = url;
}
