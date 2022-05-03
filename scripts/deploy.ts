import { ethers, getNamedAccounts } from "hardhat";

async function main() {
  const { deployer } = await getNamedAccounts();
  console.log(deployer);
  // We get the contract to deploy
  const DigitalSapphire = await ethers.getContractFactory(
    `DigitalSapphireNFTMarketplace`
  );
  const digitalSapphire = await DigitalSapphire.deploy();

  await digitalSapphire.deployed();

  console.log("Greeter deployed to:", digitalSapphire.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
