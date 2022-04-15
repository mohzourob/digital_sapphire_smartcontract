import { assert, expect } from "chai";
import { network, ethers, deployments } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { developmentChains } from "../../helper-hardhat-config";

console.log(network.name);
if (developmentChains.includes(network.name)) {
  console.log("here");
  describe("Unit Test for Digital Sapphire NFTs marketplace", async function () {
    let dsContract: any;

    before(async () => {
      const DSContract = await ethers.getContractFactory(
        "DigitalSapphireNFTMarketplace"
      );
      dsContract = await DSContract.deploy();
      await dsContract.deployed();
    });

    it("Should", async () => {
      const x = await dsContract["createItem(string)"]("test");
      console.log(x);
    });
  });
} else {
  // eslint-disable-next-line no-unused-expressions
  describe.skip;
}
