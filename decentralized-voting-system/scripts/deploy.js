const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // Deploy VoterRegistry contract
  const VoterRegistry = await ethers.getContractFactory("VoterRegistry");
  const voterRegistry = await VoterRegistry.deploy();
  await voterRegistry.waitForDeployment();
  console.log("VoterRegistry deployed to:", await voterRegistry.getAddress());

  // Deploy Voting contract, passing the VoterRegistry address to the constructor
  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(await voterRegistry.getAddress());
  await voting.waitForDeployment();
  console.log("Voting contract deployed to:", await voting.getAddress());

  console.log("Deployment complete.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
