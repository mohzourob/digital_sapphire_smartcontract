import { assert, expect } from "chai";
import { network, ethers, deployments } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { developmentChains } from "../helper-hardhat-config";
import { networkConfig } from "../helper-hardhat-config";

if (developmentChains.includes(network.name)) {
  describe("Test for Digital Sapphire auth files platform", async function () {
    let dsContract: any;
    let owner: any, addr1: any, addr2: any;

    before(async () => {
      const DSContract = await ethers.getContractFactory(
        "DigitalSapphireAuthFilesPlatform"
      );

      [owner, addr1, addr2] = await ethers.getSigners();
      dsContract = await DSContract.connect(owner).deploy(
        networkConfig[1].ethUsdPriceFeed
      );
      await dsContract.deployed();
    });

    it("Should have main three subscribe plans", async () => {
      const subscribePlans = await dsContract
        .connect(owner)
        .getSubscribePlansDetailsForOwner();

      assert.equal(subscribePlans.length, 3, "have three public plans");
    });

    it("Should create new custom plan successfully", async () => {
      const createCustomPlanTransaction = await dsContract
        .connect(owner)
        .addCustomPlan(1, 2, 10);

      await createCustomPlanTransaction.wait(1);

      // get plans by owner
      const subscribePlans = await dsContract
        .connect(owner)
        .getSubscribePlansDetailsForOwner();

      const newPlan = subscribePlans.filter(
        (plan: any) => +plan.planId.toString() === 4
      )[0];

      assert.equal(
        newPlan.numberOfCollections,
        1,
        "check number of collections"
      );
      assert.equal(
        newPlan.numberOfItemsForEveryCollection,
        2,
        "check number of items"
      );
      assert.equal(newPlan.planPriceInUSD, 10, "check plan price");
    });

    it("Should get three subscribe plans and all of them is public", async () => {
      const subscribePlans = await dsContract
        .connect(addr1)
        .getSubscribePlansDetailsForPublic();

      assert.equal(subscribePlans.length, 3, "have three public plans");
      const isAllPbublic = subscribePlans.every(
        (plan: any) => plan.isPrivate === false
      );
      assert.equal(isAllPbublic, true);
    });

    it("Should get subscribe plans for owner", async () => {
      const subscribePlans = await dsContract
        .connect(owner)
        .getSubscribePlansDetailsForOwner();

      // check if return private plans
      const isContainsPrivatePlans = subscribePlans.some(
        (plan: any) => plan.isPrivate === true
      );

      assert.equal(
        isContainsPrivatePlans,
        true,
        "check if there is private plans return"
      );
      assert.equal(subscribePlans.length, 4, "check number of plans");
    });

    it("Should update subscribe plan number of collection successfully", async () => {
      const updateTransaction = await dsContract
        .connect(owner)
        .updatePlanNumberOfCollections(4, 5);
      await updateTransaction.wait(1);
    });

    it("Should update subscribe plan number of collection failed", async ()=>{
      await expect(
        dsContract.connect(owner).updatePlanNumberOfCollections(10, 5), "failed because plan id not exist"
      ).to.be.revertedWith("Plan does not exist");

      await expect(
        dsContract.connect(owner).updatePlanNumberOfCollections(2, 0), "failed because enter invalid number of collection"
      ).to.be.revertedWith("Enter valid number of collections");
    })
  });
} else {
  // eslint-disable-next-line no-unused-expressions
  describe.skip;
}
