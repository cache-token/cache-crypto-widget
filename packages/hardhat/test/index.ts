import { expect } from "chai";
import { describe } from "mocha";
import { Wallet, Signer } from "ethers";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { WrapperContract, ERC20 } from "../typechain-types";
import { ContractAddresses, SwapRouterAddress } from "../Addresses";

const testNetwork = "mainnet";
const XAU_USD_PriceFeed = ContractAddresses[testNetwork].XAU_USD_PriceFeed;
const CGT_Address = ContractAddresses[testNetwork].CGT_Address;
const USDC_Address = ContractAddresses[testNetwork].USDC_Address;

const margin = 50;


describe("Wrapper contract test", function() {
  let deployer: Wallet,
      cgtHolder: Signer,
      xTokenHolder: Signer,
      wrapper: WrapperContract,
      cacheGold: ERC20,
      stable: ERC20,
      xToken: ERC20;

  const fixture = async () => {
    [deployer] = await (ethers as any).getSigners();

    const _CacheGold = await ethers.getContractFactory("ERC20");
    cacheGold = _CacheGold.attach(CGT_Address);

    const _Stable = await ethers.getContractFactory("ERC20");
    stable = _Stable.attach(USDC_Address);

    const _XToken = await ethers.getContractFactory("ERC20");
    xToken = _XToken.attach(ContractAddresses[testNetwork].XToken_Address);

    const _Wrapper = await ethers.getContractFactory("WrapperContract");
    wrapper = await _Wrapper.deploy(
      margin,
      XAU_USD_PriceFeed,
      CGT_Address,
      USDC_Address,
      SwapRouterAddress
    ) as WrapperContract;
    await wrapper.deployed();

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ContractAddresses[testNetwork].CGT_Holder],
    });
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ContractAddresses[testNetwork].XToken_Holder],
    });
    cgtHolder = await ethers.getSigner(ContractAddresses[testNetwork].CGT_Holder);
    xTokenHolder = await ethers.getSigner(ContractAddresses[testNetwork].XToken_Holder);
  };

  beforeEach('deploy contracts', async () => {
    await loadFixture(fixture);  
    await cacheGold.connect(cgtHolder).transfer(
      wrapper.address,
      200 * 10 ** (await cacheGold.decimals())
    );
  });

  it('0. wrapper contract deploys successfully', async function () {
    expect(wrapper.address).to.not.be.undefined;
    expect(wrapper.address).to.not.equal(ethers.constants.AddressZero);
  });

  it('1. wrapper contract params are set correctly', async function () {
    expect(await wrapper.margin()).to.equal(margin);
    expect(await wrapper.CGT()).to.equal(CGT_Address);
    expect(await wrapper.stable()).to.equal(USDC_Address);
  });

  it('2. XAU-USD price feed works', async function () {
    const price = await wrapper.getLatestXAU_USDPrice();
    expect(price).to.not.be.undefined;
    expect(price).to.not.equal(0);
    expect(price.toNumber() / 10**8).to.be.above(1700);
  });

  it('3. setters for margin and stable work correctly', async function () {
    const newMargin = 100;
    const newStable = "0x4AEE91e7D6c6e0c4C0ec10b9757B8D19ab7F427C";
    await wrapper.setMargin(newMargin);
    await wrapper.setStable(newStable);

    expect(await wrapper.margin()).to.equal(newMargin);
    expect(await wrapper.stable()).to.equal(newStable);
  });

  it('4. tokens can be swapped for CGT', async function () {
    const amount = 10;
    const initialCGTBalance = (await cacheGold.balanceOf(await xTokenHolder.getAddress())).toNumber();
    const initialUSDCBalance = (await stable.balanceOf(wrapper.address)).toNumber();

    await xToken.connect(xTokenHolder).approve(
      wrapper.address,
      ethers.utils.parseEther(amount.toString())
    );
    await expect(wrapper.connect(xTokenHolder).swapTokensForCGT(
      ContractAddresses[testNetwork].XToken_Address,
      3000,
      ethers.utils.parseEther(amount.toString()).div(10 ** (18 - await xToken.decimals())),
      0,
      0
    )).to.emit(wrapper, 'SwappedTokensForCGT');

    const finalCGTBalance = (await cacheGold.balanceOf(await xTokenHolder.getAddress())).toNumber();
    const finalUSDCBalance = (await stable.balanceOf(wrapper.address)).toNumber();

    expect(
      (finalCGTBalance - initialCGTBalance) / 10 ** (await cacheGold.decimals())
    ).to.be.above(0);
    expect(
      (finalUSDCBalance - initialUSDCBalance) / 10 ** (await stable.decimals())
    ).to.be.above(0);
  });

  it('5. owner can claim stabletokens from the contract', async function () {
    const amount = 10;
    const initialUSDCBalance = (await stable.balanceOf(await deployer.getAddress())).toNumber();

    await xToken.connect(xTokenHolder).approve(
      wrapper.address,
      ethers.utils.parseEther(amount.toString())
    );
    await wrapper.connect(xTokenHolder).swapTokensForCGT(
      ContractAddresses[testNetwork].XToken_Address,
      3000,
      ethers.utils.parseEther(amount.toString()).div(10 ** (18 - await xToken.decimals())),
      0,
      0
    );

    const stableAmountCollected = (await stable.balanceOf(wrapper.address)).toNumber();
    await wrapper.withdrawTokens(USDC_Address);
    const finalUSDCBalance = (await stable.balanceOf(await deployer.getAddress())).toNumber();
    expect(
      finalUSDCBalance - initialUSDCBalance
    ).to.equal(stableAmountCollected);
  });

  it('6. contract correctly quotes CGT amount out', async function () {
    const amount = 10;
    const price = (await wrapper.getLatestXAU_USDPrice()).toNumber() / 10 ** 8;
    const quote = await wrapper.quoteCGTAmountReceived(amount * (10 ** await stable.decimals()));
    expect(
      parseFloat((quote.toNumber() / (10 ** await cacheGold.decimals())).toFixed(await cacheGold.decimals()))
    ).to.equal(
      parseFloat(((amount * (1 - margin/10000)) / price).toFixed(await cacheGold.decimals()))
    );
  });

  it('7. swap reverts for invalid params', async function () {
    const amount = 10;
    await xToken.connect(xTokenHolder).approve(
      wrapper.address,
      ethers.utils.parseEther(amount.toString())
    );

    await expect(wrapper.connect(xTokenHolder).swapTokensForCGT(
      ethers.constants.AddressZero,
      3000,
      ethers.utils.parseEther(amount.toString()).div(10 ** (18 - await xToken.decimals())),
      0,
      0
    )).to.be.revertedWith("Invalid token address");

    await expect(wrapper.connect(xTokenHolder).swapTokensForCGT(
      ContractAddresses[testNetwork].XToken_Address,
      3000,
      0,
      0,
      0
    )).to.be.revertedWith("Invalid amount");

    const amount1 = await xToken.balanceOf(ContractAddresses[testNetwork].XToken_Holder);
    await expect(wrapper.connect(xTokenHolder).swapTokensForCGT(
      ContractAddresses[testNetwork].XToken_Address,
      3000,
      ethers.utils.parseEther((amount1).toString()).add(1).div(10 ** (18 - await xToken.decimals())),
      0,
      0
    )).to.be.revertedWith("STF");
  });

  it('8. swaps can be paused by the owner', async function () {
    const amount = 10;
    await xToken.connect(xTokenHolder).approve(
      wrapper.address,
      ethers.utils.parseEther(amount.toString())
    );

    await wrapper.pause();
    await expect(wrapper.connect(xTokenHolder).swapTokensForCGT(
      ContractAddresses[testNetwork].XToken_Address,
      3000,
      ethers.utils.parseEther(amount.toString()).div(10 ** (18 - await xToken.decimals())),
      0,
      0
    )).to.be.revertedWith("Pausable: paused");
  });

  it('9. swaps can be unpaused by the owner', async function () {
    const amount = 10;
    await xToken.connect(xTokenHolder).approve(
      wrapper.address,
      ethers.utils.parseEther(amount.toString())
    );

    await wrapper.pause();
    await expect(wrapper.connect(xTokenHolder).swapTokensForCGT(
      ContractAddresses[testNetwork].XToken_Address,
      3000,
      ethers.utils.parseEther(amount.toString()).div(10 ** (18 - await xToken.decimals())),
      0,
      0
    )).to.be.revertedWith("Pausable: paused");

    await wrapper.unpause();
    await expect(wrapper.connect(xTokenHolder).swapTokensForCGT(
      ContractAddresses[testNetwork].XToken_Address,
      3000,
      ethers.utils.parseEther(amount.toString()).div(10 ** (18 - await xToken.decimals())),
      0,
      0
    )).to.emit(wrapper, 'SwappedTokensForCGT');
  });
});

