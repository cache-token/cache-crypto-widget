import { expect } from "chai";
import { describe } from "mocha";
import { Wallet, Signer } from "ethers";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { CGTSwap, ERC20 } from "../typechain-types";
import config from "../config/config.dev.json";

const ContractAddresses = config.ContractAddresses;

const testNetwork = "mainnet";
const XAU_USD_PriceFeed = ContractAddresses[testNetwork].XAU_USD_PriceFeed;
const CGT_Address = ContractAddresses[testNetwork].CGT_Address;
const USDC_Address = ContractAddresses[testNetwork].USDC_Address;

const margin = 300;

describe("CGTSwap test", function () {
  let deployer: Wallet,
      wallet1: Wallet,
      cgtHolder: Signer,
      stableHolder: Signer,
      wrapper: CGTSwap,
      cacheGold: ERC20,
      stable: ERC20;

  const fixture = async () => {
    [deployer, wallet1] = await (ethers as any).getSigners();

    const _CacheGold = await ethers.getContractFactory("ERC20");
    cacheGold = _CacheGold.attach(CGT_Address);

    const _Stable = await ethers.getContractFactory("ERC20");
    stable = _Stable.attach(USDC_Address);

    const _SwapContract = await ethers.getContractFactory("CGTSwap");
    wrapper = (await _SwapContract.deploy(
      margin,
      XAU_USD_PriceFeed,
      CGT_Address,
      USDC_Address
    )) as CGTSwap;
    await wrapper.deployed();

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ContractAddresses[testNetwork].CGT_Holder],
    });
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ContractAddresses[testNetwork].USDC_Holder],
    });
    cgtHolder = await ethers.getSigner(
      ContractAddresses[testNetwork].CGT_Holder
    );
    stableHolder = await ethers.getSigner(
      ContractAddresses[testNetwork].USDC_Holder
    );
  };

  beforeEach("deploy contracts", async () => {
    await loadFixture(fixture);
    await cacheGold
      .connect(cgtHolder)
      .transfer(wallet1.address, 200 * 10 ** (await cacheGold.decimals()));
    await stable
      .connect(stableHolder)
      .transfer(wrapper.address, 2000 * 10 ** (await stable.decimals()));
  });

  it("0. wrapper contract deploys successfully", async function () {
    expect(wrapper.address).to.not.be.undefined;
    expect(wrapper.address).to.not.equal(ethers.constants.AddressZero);
  });

  it("1. wrapper contract params are set correctly", async function () {
    expect(await wrapper.margin()).to.equal(margin);
    expect(await wrapper.CGT()).to.equal(CGT_Address);
    expect(await wrapper.stable()).to.equal(USDC_Address);
  });

  it("2. XAU-USD price feed works", async function () {
    const price = await wrapper.getLatestXAU_USDPrice();
    expect(price).to.not.be.undefined;
    expect(price).to.not.equal(0);
    expect(price.toNumber() / 10 ** 8).to.be.above(1700);
  });

  it("3. setters for margin and stable work correctly", async function () {
    const newMargin = 100;
    const newStable = "0x4AEE91e7D6c6e0c4C0ec10b9757B8D19ab7F427C";
    await wrapper.setMargin(newMargin);
    await wrapper.setStable(newStable);

    expect(await wrapper.margin()).to.equal(newMargin);
    expect(await wrapper.stable()).to.equal(newStable);
  });

  it("4. CGT can be swapped for stablecoin", async function () {
    const amount = 10;
    const initialUSDCBalance = (
      await stable.balanceOf(wallet1.address)
    ).toNumber();
    const initialCGTBalance = (
      await cacheGold.balanceOf(wrapper.address)
    ).toNumber();

    await cacheGold
      .connect(wallet1)
      .approve(
        wrapper.address, 
        ethers.utils
          .parseEther(amount.toString())
          .add(1)
          .div(10 ** (18 - (await cacheGold.decimals())))
      );
    await expect(
      wrapper
        .connect(wallet1)
        .swap(
          ethers.utils
            .parseEther(amount.toString())
            .div(10 ** (18 - (await cacheGold.decimals()))),
        )
    ).to.emit(wrapper, "SwappedCGTForStable");

    const finalCGTBalance = (
      await cacheGold.balanceOf(wrapper.address)
    ).toNumber();
    const finalUSDCBalance = (
      await stable.balanceOf(wallet1.address)
    ).toNumber();

    expect(
      (finalCGTBalance - initialCGTBalance) / 10 ** (await cacheGold.decimals())
    ).to.be.above(0);
    expect(
      (finalUSDCBalance - initialUSDCBalance) / 10 ** (await stable.decimals())
    ).to.be.above(0);
  });

  it("5. owner can claim CGT from the contract", async function () {
    const amount = 10;
    const initialCGTBalance = (
      await cacheGold.balanceOf(await deployer.getAddress())
    ).toNumber();

    await cacheGold
      .connect(wallet1)
      .approve(
        wrapper.address, 
        ethers.utils
          .parseEther(amount.toString())
          .add(1)
          .div(10 ** (18 - (await cacheGold.decimals())))
      );
    await expect(
      wrapper
        .connect(wallet1)
        .swap(
          ethers.utils
            .parseEther(amount.toString())
            .div(10 ** (18 - (await cacheGold.decimals()))),
        )
    ).to.emit(wrapper, "SwappedCGTForStable");

    const CGTAmountCollected = (
      await cacheGold.balanceOf(wrapper.address)
    ).toNumber();
    await wrapper.withdrawTokens(CGT_Address, CGTAmountCollected);
    const finalCGTBalance = (
      await cacheGold.balanceOf(await deployer.getAddress())
    ).toNumber();
    expect(Math.round((finalCGTBalance - initialCGTBalance) / 10 ** (await cacheGold.decimals()))).to.equal(
      Math.round(CGTAmountCollected / 10 ** (await cacheGold.decimals()))
    );
  });

  it("6. contract correctly quotes stablecoin amount out", async function () {
    const amount = 10;
    const price =
      (await wrapper.getLatestXAU_USDPrice()).toNumber() / (31.10348 * 10 ** 8);
    const quote = await wrapper.quoteStablecoinAmount(
      amount * 10 ** (await cacheGold.decimals())
    );
    expect(
      parseFloat(
        (quote.toNumber() / 10 ** (await stable.decimals())).toFixed(
          2
        )
      )
    ).to.equal(
      parseFloat(
        ((amount * price *  (1 - margin / 10000))).toFixed(
          2
        )
      )
    );
  });

  it("7. swap reverts for invalid params", async function () {
    const amount = 10;
    await cacheGold
      .connect(wallet1)
      .approve(
        wrapper.address, 
        ethers.utils
            .parseEther(amount.toString())
            .div(10 ** (18 - (await cacheGold.decimals())))
      );

    await expect(
      wrapper
        .connect(wallet1)
        .swap(0)
    ).to.be.revertedWith("Invalid amount");
  });

  it("8. swaps can be paused by the owner", async function () {
    const amount = 10;
    await cacheGold
      .connect(wallet1)
      .approve(wrapper.address, ethers.utils.parseEther(amount.toString()));

    await wrapper.pause();
    await expect(
      wrapper
        .connect(wallet1)
        .swap(
          ethers.utils
            .parseEther(amount.toString())
            .div(10 ** (18 - (await cacheGold.decimals()))),
        )
    ).to.be.revertedWith("Pausable: paused");
  });

  it("9. swaps can be unpaused by the owner", async function () {
    const amount = 10;
    await cacheGold
      .connect(wallet1)
      .approve(wrapper.address, ethers.utils.parseEther(amount.toString()));

    await wrapper.pause();
    await expect(
      wrapper
        .connect(wallet1)
        .swap(
          ethers.utils
            .parseEther(amount.toString())
            .div(10 ** (18 - (await cacheGold.decimals()))),
        )
    ).to.be.revertedWith("Pausable: paused");

    await wrapper.unpause();
    await expect(
      wrapper
        .connect(wallet1)
        .swap(
          ethers.utils
            .parseEther(amount.toString())
            .div(10 ** (18 - (await cacheGold.decimals())))
        )
    ).to.emit(wrapper, "SwappedCGTForStable");
  });

  it("10. stablecoin address can be set by owner", async function () {
    const USDT_Address = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    await wrapper.setStable(USDT_Address);
    expect(await wrapper.stable()).to.equal(USDT_Address);
  });

  it("11. stablecoin balance in the contract can be viewed", async function () {
    const balance = await wrapper.getStablecoinBalance();
    expect(balance.toNumber() / 10 ** await stable.decimals()).to.equal(2000);
  });

  it("12. owner can withdraw fee accrued in the contract", async function () {
    const amount = 10;
    const initialUSDCBalance = (
      await stable.balanceOf(deployer.address)
    ).toNumber();

    await cacheGold
      .connect(wallet1)
      .approve(
        wrapper.address, 
        ethers.utils
          .parseEther(amount.toString())
          .add(1)
          .div(10 ** (18 - (await cacheGold.decimals())))
      );
    await expect(
      wrapper
        .connect(wallet1)
        .swap(
          ethers.utils
            .parseEther(amount.toString())
            .div(10 ** (18 - (await cacheGold.decimals()))),
        )
    ).to.emit(wrapper, "SwappedCGTForStable");

    const feeCollected = (
      await wrapper.totalFeeCollected()).toNumber() / 
      10 ** (await stable.decimals()
    );

    await wrapper.withdrawFeeCollected();
    const newFeeCollected = (
      await wrapper.totalFeeCollected()).toNumber() / 
      10 ** (await stable.decimals()
    );

    const finalUSDCBalance = (
      await stable.balanceOf(deployer.address)
    ).toNumber();

    expect(newFeeCollected).to.equal(0);
    expect(
      (finalUSDCBalance - initialUSDCBalance) / 10 ** (await stable.decimals())
    ).to.equal(feeCollected);
  });
});
