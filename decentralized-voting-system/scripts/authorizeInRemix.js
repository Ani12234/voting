// Usage:
// 1) Open Remix (https://remix.ethereum.org), connect to Injected Provider (MetaMask) on the correct network.
// 2) Open the Browser Console (F12) OR Remix's built-in console.
// 3) Paste this entire script and press Enter. It will prompt for addresses.
//    - Or set the two constants below directly and skip prompts.
//
// This script will:
// - Connect to MetaMask via ethers v6 BrowserProvider
// - Read current authorizedContract from VoterRegistry
// - If different, send a tx to authorize your Voting contract

(async () => {
  try {
    console.log('[authorizeInRemix] Starting...');

    // ===== Optional: hardcode here to avoid prompts =====
    // Prefill with your newly deployed addresses (can still be overridden by prompts)
    let VOTER_REGISTRY_ADDRESS = '0x0aF0c36F624D6D2875fAc427460fB9Fbd8571Ea1';
    let VOTING_CONTRACT_ADDRESS = '0x16fA1C5E54575c5d6141409509fDe2D4F0b91CfA';

    // ===== Prompt for addresses if not provided =====
    if (!VOTER_REGISTRY_ADDRESS) {
      VOTER_REGISTRY_ADDRESS = (typeof window !== 'undefined' && window.prompt)
        ? window.prompt('Enter VoterRegistry address:')
        : '';
    }
    if (!VOTING_CONTRACT_ADDRESS) {
      VOTING_CONTRACT_ADDRESS = (typeof window !== 'undefined' && window.prompt)
        ? window.prompt('Enter Voting contract address to authorize:')
        : '';
    }

    if (!VOTER_REGISTRY_ADDRESS || !VOTING_CONTRACT_ADDRESS) {
      throw new Error('Both VOTER_REGISTRY_ADDRESS and VOTING_CONTRACT_ADDRESS are required.');
    }

    // Normalize addresses to valid checksum or lowercase to avoid v5 mixed-case errors
    const normalize = (addr) => {
      if (!addr) return addr;
      try {
        if (ethers?.utils?.getAddress) {
          return ethers.utils.getAddress(addr); // v5 checksum
        }
        if (ethers?.getAddress) {
          return ethers.getAddress(addr); // v6 checksum
        }
      } catch (_) {
        // fallback: lowercase to satisfy v5 (rejects bad checksum but accepts all-lowercase)
      }
      return String(addr).toLowerCase();
    };

    VOTER_REGISTRY_ADDRESS = normalize(VOTER_REGISTRY_ADDRESS);
    VOTING_CONTRACT_ADDRESS = normalize(VOTING_CONTRACT_ADDRESS);

    // Display
    console.log('[authorizeInRemix] Registry:', VOTER_REGISTRY_ADDRESS);
    console.log('[authorizeInRemix] Voting  :', VOTING_CONTRACT_ADDRESS);

    if (!window?.ethereum) {
      throw new Error('No injected provider found. Open in a browser with MetaMask (Injected Provider).');
    }

    // Detect ethers version and choose appropriate provider API (v6 vs v5)
    let provider, signer, chainId, signerAddress;
    try {
      const v = (ethers && ethers.version) ? String(ethers.version) : '';
      const isV6 = v.startsWith('6');
      if (isV6 && ethers.BrowserProvider) {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        const net = await provider.getNetwork();
        chainId = net.chainId?.toString();
        signerAddress = await signer.getAddress();
      } else {
        // Fallback to ethers v5
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        const net = await provider.getNetwork();
        chainId = (net && (net.chainId || net.chainId?.toString)) ? String(net.chainId) : undefined;
        signerAddress = await signer.getAddress();
      }
    } catch (e) {
      // Final fallback for very old Remix envs
      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      const net = await provider.getNetwork();
      chainId = String(net.chainId);
      signerAddress = await signer.getAddress();
    }

    console.log('[authorizeInRemix] Connected chain:', chainId);
    console.log('[authorizeInRemix] Signer address:', signerAddress);

    const voterRegistryABI = [
      {
        inputs: [ { internalType: 'address', name: '_contract', type: 'address' } ],
        name: 'authorizeContract',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [],
        name: 'admin',
        outputs: [ { internalType: 'address', name: '', type: 'address' } ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [],
        name: 'authorizedContract',
        outputs: [ { internalType: 'address', name: '', type: 'address' } ],
        stateMutability: 'view',
        type: 'function',
      },
    ];

    const registry = new ethers.Contract(VOTER_REGISTRY_ADDRESS, voterRegistryABI, signer);

    const admin = await registry.admin();
    console.log('[authorizeInRemix] Registry admin:', admin);

    const current = await registry.authorizedContract();
    console.log('[authorizeInRemix] Current authorizedContract:', current);

    if (current && current.toLowerCase() === VOTING_CONTRACT_ADDRESS.toLowerCase()) {
      console.log('[authorizeInRemix] Already authorized. Nothing to do.');
      return;
    }

    console.log('[authorizeInRemix] Sending tx to authorize... confirm in MetaMask');
    const tx = await registry.authorizeContract(VOTING_CONTRACT_ADDRESS);
    console.log('[authorizeInRemix] Tx sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('[authorizeInRemix] Tx confirmed in block', receipt?.blockNumber);

    const updated = await registry.authorizedContract();
    console.log('[authorizeInRemix] New authorizedContract:', updated);
    if (updated.toLowerCase() !== VOTING_CONTRACT_ADDRESS.toLowerCase()) {
      console.warn('[authorizeInRemix] Warning: updated value does not match target.');
    } else {
      console.log('[authorizeInRemix] Success.');
    }
  } catch (err) {
    console.error('[authorizeInRemix] Failed:', err);
  }
})();

// This script is designed to be run in the Remix IDE JavaScript VM or Injected Provider environment.
// Follow the instructions provided by Cascade to run this script.

(async () => {
    try {
        console.log("Starting authorization script...");

        // Address of the VoterRegistry contract you want to interact with
        const voterRegistryAddress = "0xad076bf830b5e173e3c0b356568e9f0211227730";

        // Address of the Voting contract to authorize
        const votingContractAddress = "0xd6906e4b28eee46fb2f5fded4f52309c6bd1b64c";

        // ABI for the VoterRegistry contract, specifically for the authorizeContract function
        const voterRegistryABI = [{
            "inputs": [{
                "internalType": "address",
                "name": "_contract",
                "type": "address"
            }],
            "name": "authorizeContract",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [],
            "name": "admin",
            "outputs": [{
                "internalType": "address",
                "name": "",
                "type": "address"
            }],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "authorizedContract",
            "outputs": [{
                "internalType": "address",
                "name": "",
                "type": "address"
            }],
            "stateMutability": "view",
            "type": "function"
        }];

        // Create a contract instance using the 'ethers' object provided by Remix
        const signer = (new ethers.providers.Web3Provider(web3Provider)).getSigner()
        const voterRegistry = new ethers.Contract(voterRegistryAddress, voterRegistryABI, signer);

        console.log(`VoterRegistry contract loaded at: ${voterRegistryAddress}`);
        console.log(`Attempting to authorize Voting contract at: ${votingContractAddress}`);

        const admin = await voterRegistry.admin();
        console.log(`Current admin: ${admin}`);

        const currentAuthorized = await voterRegistry.authorizedContract();
        console.log(`Current authorized contract: ${currentAuthorized}`);

        if (currentAuthorized.toLowerCase() === votingContractAddress.toLowerCase()) {
            console.log("Voting contract is already authorized. No action needed.");
            return;
        }

        console.log("Sending transaction to authorize the contract... Please confirm in MetaMask.");
        const tx = await voterRegistry.authorizeContract(votingContractAddress);

        console.log(`Transaction sent. Hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");

        await tx.wait();

        console.log("Transaction confirmed!");

        const newAuthorizedContract = await voterRegistry.authorizedContract();
        console.log(`Successfully updated authorized contract to: ${newAuthorizedContract}`);

    } catch (error) {
        console.error("Script failed:", error);
    }
})();
