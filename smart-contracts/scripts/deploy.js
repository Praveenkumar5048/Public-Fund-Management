const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy VoterSBT contract
  console.log("Deploying VoterSBT...");
  const SBT = await ethers.getContractFactory("SBT");
  const sbt = await SBT.deploy();
  await sbt.waitForDeployment();
  const sbtAddress = await sbt.getAddress();
  console.log("VoterSBT deployed to:", sbtAddress);

  // Deploy PublicKeyRegistry contract
  console.log("Deploying PublicKeyRegistry...");
  const PublicKeyRegistry = await ethers.getContractFactory("PublicFundManagement");
  const publicKeyRegistry = await PublicKeyRegistry.deploy(sbtAddress);
  await publicKeyRegistry.waitForDeployment();
  const publicKeyRegistryAddress = await publicKeyRegistry.getAddress();
  console.log("PublicKeyRegistry deployed to:", publicKeyRegistryAddress);

  const envContent = `NEXT_PUBLIC_SBT_TOKEN_ADDRESS=${sbtAddress}\n` +
    `NEXT_PUBLIC_PUBLIC_FUND_TREASURY_ADDRESS=${publicKeyRegistryAddress}\n`;

  fs.writeFileSync("C:/Users/DELL/Public-Fund-Management/frontend/.env", envContent);

  console.log(".env file updated successfully!");

  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("SBT:", sbtAddress);
  console.log("PublicKeyRegistry:", publicKeyRegistryAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});