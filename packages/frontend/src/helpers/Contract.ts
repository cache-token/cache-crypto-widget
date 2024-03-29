import { Wallet } from "@ethersproject/wallet";
import { ethers } from "ethers";
import { isAddress } from "ethers/lib/utils";

import { IContract } from "../models/Contract";
import { IAppConfig } from "../models/Base";
import { getAppConfig } from "./Utilities";

const config: IAppConfig = getAppConfig();

export const getABIs = (contractList: Array<IContract>) => {
  let accumulator: any = [];
  const contractAddresses = config.CONTRACTS_ADDRESS as any;
  contractList.forEach((contract: IContract) => {
    const loadedContract = [
      contract.contractAddress ? contract.contractAddress : contractAddresses[contract.contractName],
      require(`../contracts/${contract.contractName}.json`)
    ];
    accumulator.push(loadedContract);
  });
  return accumulator;
}

export const getABI = (contractName: string) => {
  const abi = require(`../contracts/${contractName}.json`)
  return abi;
}

export const getContractAddressByName = (name: string): string => {
  const contractAddresses = config.CONTRACTS_ADDRESS as any;
  return contractAddresses[name];
}

export const getContractByName = (name: string, wallet: Wallet): ethers.Contract => {
  const contractAddress: string = getContractAddressByName(name);
  const contract = new ethers.Contract(contractAddress, getABIs([{ contractName: name, contractAddress }])[0][1], wallet);
  return contract;
}

export const getContractByAddressName = (address: string, name: string, wallet: Wallet): ethers.Contract => {
  if (!isAddress(address)) {
    return {} as any;
  }
  const contract = new ethers.Contract(address, getABIs([{ contractName: name, contractAddress: address }])[0][1], wallet);
  return contract;
}
