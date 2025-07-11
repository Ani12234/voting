// This script is designed to be run in the Remix IDE JavaScript VM or Injected Provider environment.
// Follow the instructions provided by Cascade to run this script.

(async () => {
    try {
        console.log("Starting authorization script...");

        // Address of the VoterRegistry contract you want to interact with
        const voterRegistryAddress = "0x12ca1ea9c3907b6e362ec9ea709d56c2e6866a6a";

        // Address of the Voting contract to authorize
        const votingContractAddress = "0xa0a2b330c3feec7c95ee3083937fe04273a21460";

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
