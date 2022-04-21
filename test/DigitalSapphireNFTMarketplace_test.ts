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

    it("Should get user items success", async () => {
      const userItems = await dsContract.connect(addr1).fetchNFTsForOwner();

      const isAllOwneredByUser = userItems.every(
        (i: any) => i.owner === addr1.address
      );

      assert.equal(isAllOwneredByUser, true);
    });

    it("Should update item price successfully", async () => {
      const updateItemPriceTransaction = await dsContract
        .connect(addr1)
        .updateItemPrice(2, newPrice);
      await updateItemPriceTransaction.wait(1);

      const items = await dsContract.fetchMarketNFTs();

      assert.equal(+items[1].price.toString(), newPrice);
    });

    it("Should failed update item price because price not above 0", async () => {
      await expect(
        dsContract.connect(addr1).updateItemPrice(2, 0)
      ).to.be.revertedWith("Price must be at least one wei");
    });

    it("Should failed update item price because item already deleted", async () => {
      const deleteItemTransaction = await dsContract
        .connect(addr1)
        .deleteItem(2);
      await deleteItemTransaction.wait(1);

      await expect(
        dsContract.connect(addr1).updateItemPrice(2, 20)
      ).to.be.revertedWith("This item already deleted!");
    });

    it("Should failed update item price because sender not the owner", async () => {
      await expect(
        dsContract.connect(addr2).updateItemPrice(1, 20)
      ).to.be.revertedWith("UnAuthorized!");
    });

    it("should buy process success", async () => {
      const itemId = await createItem(dsContract, "AnyString", addr1, 10);
      const itemPrice = "10.0";
      const feeValue = 0.025;

      const {
        addr1: addr1BalanceBefore,
        addr2: addr2BalanceBefore,
        owner: ownerBalanceBefore,
      } = await getAddressBalancesInEth(
        addr1.address,
        addr2.address,
        owner.address
      );

      const buyTransaction = await dsContract.connect(addr2).buyItem(itemId, {
        value: ethers.utils.parseEther(itemPrice),
      });

      await buyTransaction.wait(1);

      const items = await dsContract.fetchMarketNFTs();

      const item = items.filter((i: any) => +i.itemId.toString() === itemId)[0];

      assert.equal(item.seller, addr1.address);
      assert.equal(item.owner, addr2.address);
      assert.equal(item.sold, true);

      // check balances

      const {
        addr1: addr1BalanceAfter,
        addr2: addr2BalanceAfter,
        owner: ownerBalanceAfter,
      } = await getAddressBalancesInEth(
        addr1.address,
        addr2.address,
        owner.address
      );

      assert.equal(
        (+ownerBalanceBefore + +itemPrice * feeValue).toFixed(10),
        (+ownerBalanceAfter).toFixed(10),
        "Owner balance check"
      );

      assert.equal(
        (+addr1BalanceBefore + (+itemPrice - +itemPrice * feeValue)).toFixed(
          10
        ),
        (+addr1BalanceAfter).toFixed(10),
        "Address 1 balance check"
      );

      assert.equal(
        (+addr2BalanceBefore - +itemPrice).toFixed(10),
        (+addr2BalanceAfter).toFixed(10),
        "Address 2 balance check"
      );
    });

    it("Should get bought items success for user", async () => {
      const userItems = await dsContract
        .connect(addr2)
        .fetchNFTsBoughtForOwner();

      const isAllBoughtByUser = userItems.every(
        (i: any) => i.owner === addr2.address && i.sold === true
      );

      assert.equal(isAllBoughtByUser, true);
    });

    it("Should buy process failed because item has no price", async () => {
      const itemId = await createItem(dsContract, "AnyString", addr1, 0);

      await expect(
        dsContract.connect(addr2).buyItem(itemId, {
          value: ethers.utils.parseEther("1.0"),
        })
      ).to.be.revertedWith("Not able to buy!");
    });

    it("Should buy process failed because value less than item price", async () => {
      const itemId = await createItem(dsContract, "AnyString", addr1, 10);

      await expect(
        dsContract.connect(addr2).buyItem(itemId, {
          value: ethers.utils.parseEther("1.0"),
        })
      ).to.be.revertedWith("Please submit asking price in order to countinue");
    });

    it("Should buy process failed because item already sold", async () => {
      const itemId = await createItem(dsContract, "AnyString", addr1, 10);

      const buyTransaction = await dsContract.connect(addr2).buyItem(itemId, {
        value: ethers.utils.parseEther("10.0"),
      });

      await buyTransaction.wait(1);

      await expect(
        dsContract.connect(addr2).buyItem(itemId, {
          value: ethers.utils.parseEther("10.0"),
        })
      ).to.be.revertedWith("Item already sold");
    });

    it("Should buy failed because you are the owner of this item", async () => {
      const itemId = await createItem(dsContract, "AnyString", addr1, 10);

      await expect(
        dsContract.connect(addr1).buyItem(itemId, {
          value: ethers.utils.parseEther("10.0"),
        })
      ).to.be.revertedWith("You are the owner of this token!");
    });

    it("Should buy failed because item already deleted", async () => {
      const itemId = await createItem(dsContract, "AnyString", addr1, 10);

      const deleteItemTransaction = await dsContract
        .connect(addr1)
        .deleteItem(itemId);
      await deleteItemTransaction.wait(1);

      await expect(
        dsContract.connect(addr2).buyItem(itemId, {
          value: ethers.utils.parseEther("10.0"),
        })
      ).to.be.revertedWith("This item already deleted!");
    });

    it("Should delete item success", async () => {
      const itemId = await createItem(dsContract, "AnyString", addr1, 10);

      const deleteItemTransaction = await dsContract
        .connect(addr1)
        .deleteItem(itemId);
      await deleteItemTransaction.wait(1);

      const items = await dsContract.fetchMarketNFTs();

      let item = items.filter((i: any) => +i.itemId.toString() === itemId)[0];

      assert.equal(item._isDeleted, true);

      const userItems = await dsContract.connect(addr1).fetchNFTsForOwner();

      item = userItems.filter((i: any) => +i.itemId.toString() === itemId);

      assert.equal(item.length, 0);
    });

    it("Should delete item failed because he not the owner", async () => {
      const itemId = await createItem(dsContract, "AnyString", addr1, 10);

      await expect(
        dsContract.connect(addr2).deleteItem(itemId)
      ).to.be.revertedWith("UnAuthorized!");
    });

    it("Should delete item failed because this item already sold", async () => {
      const itemId = await createItem(dsContract, "AnyString", addr1, 10);

      const deleteItemTransaction = await dsContract
        .connect(addr1)
        .deleteItem(itemId);
      await deleteItemTransaction.wait(1);

      await expect(
        dsContract.connect(addr1).deleteItem(itemId)
      ).to.be.revertedWith("This item already deleted!");
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

const getAddressBalancesInEth = async (
  addr1: string,
  addr2: string,
  owner: string
) => {
  const firstAddressBalanceInWei = (+(await ethers.provider.getBalance(
    addr1
  ))).toLocaleString("fullwide", { useGrouping: false });

  const firstAddressBalanceInEth = ethers.utils.formatEther(
    firstAddressBalanceInWei
  );

  const secondAddressBalanceInWei = (+(await ethers.provider.getBalance(
    addr2
  ))).toLocaleString("fullwide", { useGrouping: false });

  const secondAddressBalanceInEth = ethers.utils.formatEther(
    secondAddressBalanceInWei
  );

  const ownerAddressBalanceInWei = (+(await ethers.provider.getBalance(
    owner
  ))).toLocaleString("fullwide", { useGrouping: false });

  const ownerAddressBalanceInEth = ethers.utils.formatEther(
    ownerAddressBalanceInWei
  );

  return {
    addr1: firstAddressBalanceInEth,
    addr2: secondAddressBalanceInEth,
    owner: ownerAddressBalanceInEth,
  };
};
