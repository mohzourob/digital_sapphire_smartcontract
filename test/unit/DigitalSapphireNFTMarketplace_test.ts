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

    it("Should create item without price successfully and send event with data", async () => {
      const tokenURI = "test";
      const createItemTransaction = await dsContract["createItem(string)"](
        tokenURI
      );
      const transactionReceipt = await createItemTransaction.wait(1);
      const eventDetails =
        transactionReceipt.events[transactionReceipt.events.length - 1].args;

      assert.equal(eventDetails.tokenURI, tokenURI);
      assert.isAbove(+eventDetails.itemId.toString(), 0);
      assert.isAbove(+eventDetails.tokenId.toString(), 0);
      assert.equal(+eventDetails.seller.toString(), 0);
      assert.equal(createItemTransaction.from, eventDetails.owner);
      assert.equal(+eventDetails.price.toString(), 0);
      assert.equal(eventDetails.sold, false);
    });
  });
} else {
  // eslint-disable-next-line no-unused-expressions
  describe.skip;
}
