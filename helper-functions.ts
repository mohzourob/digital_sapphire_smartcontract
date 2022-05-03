import { run } from "hardhat";

export const verify = async (contractAddress: any, args: any) => {
  console.log("Verifying contract...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e: any) {
    if (e?.message?.toLowerCase().includes("already verified")) {
      console.log("Already verified!");
    } else {
      console.log(e);
    }
  }
};

// eslint-disable-next-line promise/param-names
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
