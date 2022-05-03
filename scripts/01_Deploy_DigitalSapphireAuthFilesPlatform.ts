import { network, ethers } from "hardhat";

import { networkConfig, developmentChains } from "../helper-hardhat-config";

import { verify, sleep } from "../helper-functions";

async function main() {
  const [deployer] = await ethers.getSigners();

  const chainId: any = network.config.chainId;

  const ethUsdPriceFeed = networkConfig[chainId].ethUsdPriceFeed;

  const DigitalSapphireAuth = await ethers.getContractFactory(
    `DigitalSapphireAuthFilesPlatform`
  );

  const dsAuthFile = await DigitalSapphireAuth.connect(deployer).deploy(
    ethUsdPriceFeed
  );

  await dsAuthFile.deployed();
  console.log("dsAuthFile deployed to:", dsAuthFile.address);

  await sleep(120000);

  // Verify the deployment
  if (!developmentChains.includes(network.name)) {
    console.log("Verifying...");
    await verify(dsAuthFile.address, [ethUsdPriceFeed]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
