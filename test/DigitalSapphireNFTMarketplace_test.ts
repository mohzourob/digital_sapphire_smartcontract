import { assert, expect } from "chai";
import { network, ethers, deployments } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { developmentChains } from "../helper-hardhat-config";

if (developmentChains.includes(network.name)) {
  describe("Unit Test for Digital Sapphire NFTs marketplace", async function () {
    let dsContract: any;
    const oldPrice = 10;
    const newPrice = 30;
    let owner: any, addr1: any, addr2: any;

    before(async () => {
      const DSContract = await ethers.getContractFactory(
        "DigitalSapphireNFTMarketplace"
      );

      [owner, addr1, addr2] = await ethers.getSigners();
      dsContract = await DSContract.connect(owner).deploy();
      await dsContract.deployed();
    });

    it("Should create item without price successfully and send event with data", async () => {
      const tokenURI = "test";
      const createItemTransaction = await dsContract
        .connect(addr1)
        ["createItem(string)"](tokenURI);
      const transactionReceipt = await createItemTransaction.wait(1);
      const eventDetails =
        transactionReceipt.events[transactionReceipt.events.length - 1].args;

      // test event details
      assert.equal(eventDetails.tokenURI, tokenURI);
      assert.isAbove(+eventDetails.itemId.toString(), 0);
      assert.isAbove(+eventDetails.tokenId.toString(), 0);
      assert.equal(+eventDetails.seller.toString(), 0);
      assert.equal(createItemTransaction.from, eventDetails.owner);
      assert.equal(+eventDetails.price.toString(), 0);
      assert.equal(eventDetails.sold, false);

      // test contract items array
      const items = await dsContract.fetchMarketNFTs();
      assert.isArray(items);
      assert.isNotEmpty(items);

      // test item array values
      assert.equal(items[0].tokenURI, tokenURI);
      assert.equal(+items[0].itemId.toString(), 1);
      assert.equal(+items[0].tokenId.toString(), 1);
      assert.equal(+items[0].seller.toString(), 0);
      assert.equal(createItemTransaction.from, items[0].owner);
      assert.equal(+items[0].price.toString(), 0);
      assert.equal(items[0].sold, false);
    });

    it("Should create item with price successfully and send event with data", async () => {
      const tokenURI = "test";
      const createItemTransaction = await dsContract
        .connect(addr1)
        ["createItem(string,uint256)"](tokenURI, oldPrice);

      const transactionReceipt = await createItemTransaction.wait(1);
      const eventDetails =
        transactionReceipt.events[transactionReceipt.events.length - 1].args;

      // test event details
      assert.equal(eventDetails.tokenURI, tokenURI);
      assert.isAbove(+eventDetails.itemId.toString(), 0);
      assert.isAbove(+eventDetails.tokenId.toString(), 0);
      assert.equal(+eventDetails.seller.toString(), 0);
      assert.equal(createItemTransaction.from, eventDetails.owner);
      assert.equal(+eventDetails.price.toString(), oldPrice);
      assert.equal(eventDetails.sold, false);

      // test contract items array
      const items = await dsContract.fetchMarketNFTs();
      assert.isArray(items);
      assert.isNotEmpty(items);

      // test item array values
      assert.equal(items[1].tokenURI, tokenURI);
      assert.equal(+items[1].itemId.toString(), 2);
      assert.equal(+items[1].tokenId.toString(), 2);
      assert.equal(+items[1].seller.toString(), 0);
      assert.equal(createItemTransaction.from, items[1].owner);
      assert.equal(+items[1].price.toString(), oldPrice);
      assert.equal(items[1].sold, false);
    });

    it("Should get marketplace nft successfully", async () => {
      const items = await dsContract.fetchMarketNFTs();

      assert.equal(items.length, 2);
    });

    it("Should update item price successfully", async () => {
      const updateItemPriceTransaction = await dsContract
        .connect(addr1)
        .updateItemPrice(2, newPrice);
      await updateItemPriceTransaction.wait(1);

      const items = await dsContract.fetchMarketNFTs();

      assert.equal(+items[1].price.toString(), newPrice);
    });

    it("Should falied update item price because price not above 0", async () => {
      await expect(
        dsContract.connect(addr1).updateItemPrice(2, 0)
      ).to.be.revertedWith("Price must be at least one wei");
    });

    it("Should falied update item price because item already deleted", async () => {
      const deleteItemTransaction = await dsContract
        .connect(addr1)
        .deleteItem(2);
      await deleteItemTransaction.wait(1);

      await expect(
        dsContract.connect(addr1).updateItemPrice(2, 20)
      ).to.be.revertedWith("This item already deleted!");
    });

    it("Should falied update item price because sender not the owner", async () => {
      await expect(
        dsContract.connect(addr2).updateItemPrice(1, 20)
      ).to.be.revertedWith("UnAuthorized!");
    });

    it("Should buy process falied because item has no price", async () => {
      const itemId = await createItem(dsContract, "AnyString", addr1, 0);

      await expect(
        dsContract.connect(addr2).buyItem(itemId, {
          value: ethers.utils.parseEther("1.0"),
        })
      ).to.be.revertedWith("Not able to buy!");
    });
  });
} else {
  // eslint-disable-next-line no-unused-expressions
  describe.skip;
}

const createItem = async (
  contract: any,
  tokenURI: string,
  address: any,
  price: number
) => {
  let createItemTransaction: any;

  if (price === 0) {
    createItemTransaction = await contract
      .connect(address)
      ["createItem(string)"](tokenURI);
  } else {
    createItemTransaction = await contract
      .connect(address)
      ["createItem(string,uint256)"](tokenURI, price);
  }
  const transactionReceipt = await createItemTransaction.wait(1);
  const eventDetails =
    transactionReceipt.events[transactionReceipt.events.length - 1].args;

  return +eventDetails.itemId.toString();
};
