import { ethers } from "hardhat";
import { WrapperContract } from "../typechain-types";
import { WrapperContract as WrapperContractAddress } from "../contractAddress";

const newStableTokenAddress = "";

async function main() {
  const _Wrapper = await ethers.getContractFactory("WrapperContract");
  const wrapper: WrapperContract = _Wrapper.attach(WrapperContractAddress);

  await wrapper.setStable(newStableTokenAddress);
  console.log("Updated stabletoken address:", await wrapper.stable());
}

main()
.then(() => {
  process.exit(0);
})
.catch((error) => {
  console.error(error);
  process.exit(1);
});