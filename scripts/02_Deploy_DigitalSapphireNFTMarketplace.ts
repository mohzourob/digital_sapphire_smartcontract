import { network, ethers } from "hardhat";

import { networkConfig, developmentChains } from "../helper-hardhat-config";

import { verify, sleep } from "../helper-functions";

async function main() {
  const [deployer] = await ethers.getSigners();

  const DigitalSapphireNFT = await ethers.getContractFactory(
    `DigitalSapphireNFTMarketplace`
  );

  const dsNFT = await DigitalSapphireNFT.connect(deployer).deploy();

  await dsNFT.deployed();
  console.log("dsNFT deployed to:", dsNFT.address);

  await sleep(120000);

  // Verify the deployment
  if (!developmentChains.includes(network.name)) {
    console.log("Verifying...");
    await verify(dsNFT.address, []);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
