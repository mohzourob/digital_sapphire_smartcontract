import { expect } from "chai";
import { ethers } from "hardhat";

describe("Greeter", function () {
  it("Should return the new greeting once it's changed", async function () {
    const DigitalSapphire = await ethers.getContractFactory("DigitalSapphireNFTMarketplace");
    const digitalSapphire = await DigitalSapphire.deploy();
    await digitalSapphire.deployed();


    await digitalSapphire["createItem(string)"]("strin");
    let items = await digitalSapphire.fetchMarketNFTs();
    console.log(items);

    await digitalSapphire.deleteItem(1);

     items = await digitalSapphire.fetchMarketNFTs();
    console.log(items);



    // expect(await greeter.greet()).to.equal("Hello, world!");

    // const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

    // // wait until the transaction is mined
    // await setGreetingTx.wait();

    // expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});
