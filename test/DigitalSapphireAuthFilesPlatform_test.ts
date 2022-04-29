import { assert, expect } from "chai";
import { network, ethers, deployments } from "hardhat";
import moment from "moment";
// eslint-disable-next-line node/no-missing-import
import { developmentChains, networkConfig } from "../helper-hardhat-config";

if (developmentChains.includes(network.name)) {
  describe("Test for Digital Sapphire auth files platform", async function () {
    let dsContract: any;
    let owner: any, addr1: any;

    before(async () => {
      const DSContract = await ethers.getContractFactory(
        "DigitalSapphireAuthFilesPlatform"
      );

      [owner, addr1] = await ethers.getSigners();
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

      const subscribePlans = await dsContract
        .connect(owner)
        .getSubscribePlansDetailsForOwner();

      const plan = subscribePlans[3];
      assert.equal(plan.numberOfCollections, 5);
    });

    it("Should update subscribe plan number of collection failed", async () => {
      await expect(
        dsContract.connect(owner).updatePlanNumberOfCollections(10, 5),
        "failed because plan id not exist"
      ).to.be.revertedWith("Plan does not exist");

      await expect(
        dsContract.connect(owner).updatePlanNumberOfCollections(2, 0),
        "failed because enter invalid number of collection"
      ).to.be.revertedWith("Enter valid number of collections");
    });

    it("Should update subscribe plan number of items every collection successfully", async () => {
      const updateTransaction = await dsContract
        .connect(owner)
        .updatePlanNumerOfItemsForEveryCollection(4, 100);
      await updateTransaction.wait(1);

      const subscribePlans = await dsContract
        .connect(owner)
        .getSubscribePlansDetailsForOwner();

      const plan = subscribePlans[3];
      assert.equal(plan.numberOfItemsForEveryCollection, 100);
    });

    it("Should update subscribe plan number of items every collection failed", async () => {
      await expect(
        dsContract
          .connect(owner)
          .updatePlanNumerOfItemsForEveryCollection(10, 5),
        "failed because plan id not exist"
      ).to.be.revertedWith("Plan does not exist");

      await expect(
        dsContract
          .connect(owner)
          .updatePlanNumerOfItemsForEveryCollection(2, 0),
        "failed because enter invalid number of items"
      ).to.be.revertedWith("Enter valid number of items");
    });

    it("Should update subscribe plan price in USD every collection successfully", async () => {
      const updateTransaction = await dsContract
        .connect(owner)
        .updatePlanPriceInUSD(4, 100);
      await updateTransaction.wait(1);

      const subscribePlans = await dsContract
        .connect(owner)
        .getSubscribePlansDetailsForOwner();

      const plan = subscribePlans[3];
      assert.equal(plan.planPriceInUSD, 100);
    });

    it("Should update subscribe plan price in USD every collection failed", async () => {
      await expect(
        dsContract.connect(owner).updatePlanPriceInUSD(10, 5),
        "failed because plan id not exist"
      ).to.be.revertedWith("Plan does not exist");

      await expect(
        dsContract.connect(owner).updatePlanPriceInUSD(2, 0),
        "failed because enter invalid price in USD"
      ).to.be.revertedWith("Enter valid price in USD");
    });

    it("Should delete plan failed because plan does not exist", async () => {
      await expect(dsContract.connect(owner).deletePlan(10)).to.be.revertedWith(
        "Plan does not exist"
      );
    });

    it("should delete plan failed because its not custom plan", async () => {
      await expect(dsContract.connect(owner).deletePlan(2)).to.be.revertedWith(
        "Invalid plan"
      );
    });

    it("Should delete plan sucessfully", async () => {
      const deletePlanTransaction = await dsContract
        .connect(owner)
        .deletePlan(4);
      await deletePlanTransaction.wait(1);

      const subscribePlans = await dsContract
        .connect(owner)
        .getSubscribePlansDetailsForOwner();

      const isExist = subscribePlans.indexOf(
        (plan: any) => +plan.planId.toString() === 4
      );

      assert.equal(isExist, -1);
    });

    it("Should delete plan failed because it already deleted", async () => {
      await expect(dsContract.connect(owner).deletePlan(4)).to.be.revertedWith(
        "Plan already deleted."
      );
    });

    it("Should user subscribe in plan successfully", async () => {
      // 1. create the plan
      const createCustomPlanTransaction = await dsContract
        .connect(owner)
        .addCustomPlan(1, 1, 50);
      await createCustomPlanTransaction.wait(1);

      const ETHPriceInUSD = +(await dsContract.getEthPriceInUSD()).toString();
      const UDSPriceInETH = (
        50 /
        (ETHPriceInUSD / 1000000000000000000)
      ).toString();

      await dsContract.connect(addr1).userSubscribeInPlan(5, {
        value: ethers.utils.parseEther(UDSPriceInETH),
      });

      const userPlan = await dsContract
        .connect(addr1)
        .userGetHisSubscribePlan();

      assert.equal(userPlan.numberOfCollections, 1);
      assert.equal(userPlan.numberOfItemsForEveryCollection, 1);
      assert.equal(userPlan.planPriceInUSD, 50);

      const blockDate = moment
        .unix(+userPlan.expireAt.toString())
        .format("YYYY-MM-DD");

      const dateAfter30Days = moment().add(30, "days");

      const isSameDate = moment(dateAfter30Days).isSame(blockDate, "date");

      assert.equal(isSameDate, true);
    });

    it("Should failed to subscribe new plan because plan does not exist", async () => {
      await expect(
        dsContract.connect(addr1).userSubscribeInPlan(10, {
          value: ethers.utils.parseEther("0.017"),
        })
      ).to.be.revertedWith("Plan does not exist");
    });

    it("Should failed to subscribe new plan because no enough eth", async () => {
      await expect(
        dsContract.connect(addr1).userSubscribeInPlan(5, {
          value: ethers.utils.parseEther("0.001"),
        })
      ).to.be.revertedWith("You need to spend more ETH!");
    });

    it("Should create new item successfully", async () => {
      const createItemTransaction = await dsContract
        .connect(addr1)
        .createItem("Thisisstring");
      await createItemTransaction.wait(1);

      const userItems = await dsContract.connect(addr1).userGetHisItems();

      assert(userItems[0].owner.toString(), addr1.address);
      assert(userItems[0].tokenURI, "Thisisstring");
    });

    it("Should create new item failed because user does not subscribe in plan", async () => {
      await expect(
        dsContract.connect(owner).createItem("testest")
      ).to.be.revertedWith("Re-submit ur plan");
    });

    it("Should create new item failed because user does not has enough number of items in plan", async () => {
      await expect(
        dsContract.connect(addr1).createItem("testest")
      ).to.be.revertedWith("You need to upgrade your plan!");
    });

    it("Should get his items successfully", async () => {
      const userItems = await dsContract.connect(addr1).userGetHisItems();

      assert.equal(userItems.length, 1);
      assert.equal(
        userItems.every((i: any) => i.owner.toString() === addr1.address),
        true
      );
    });

    it("Should create collection successfully", async ()=>{
      const createCollectionTransaction = await dsContract.connect(addr1).userCreateCollection();
      await createCollectionTransaction.wait(1);

      const numberOfCollections = await dsContract.connect(addr1).getNumberOfCollectionOwnerHas();
      assert.equal(numberOfCollections, 1);
    })
  });
} else {
  // eslint-disable-next-line no-unused-expressions
  describe.skip;
}
