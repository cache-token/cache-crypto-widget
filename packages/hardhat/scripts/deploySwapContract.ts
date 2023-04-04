import fs from "fs";
import * as hre from "hardhat";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { CGTSwap } from "../typechain-types";
import config from "../config/config.dev.json";

const ContractAddresses = config.ContractAddresses;

const margin = 300;
const deployNetwork = "mainnet";

async function main() {
  const _CGTSwap = await ethers.getContractFactory("CGTSwap");
  const wrapper = (await _CGTSwap.deploy(
    margin,
    ContractAddresses[deployNetwork].XAU_USD_PriceFeed,
    ContractAddresses[deployNetwork].CGT_Address,
    ContractAddresses[deployNetwork].USDC_Address
  )) as CGTSwap;
  await wrapper.deployed();

  console.log("CGTSwap contract deployed to:", wrapper.address);
  return {
    CGTSwap: wrapper,
  };
}

async function verify(contractAddress: string, ...args: Array<any>) {
  console.log("verifying", contractAddress, ...args);
  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [...args],
  });
}

function saveFrontendFiles(contract: Contract, contractName: string) {
  console.log("Adding to frontend", contractName);
  fs.appendFileSync(
    `../frontend/src/contractAddress.ts`,
    `export const ${contractName} = '${contract.address}'\n`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(async (deployedData) => {
    // await verify(deployedData.WrapperContract.address);
    saveFrontendFiles(deployedData.CGTSwap, "CGTSwap");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });