import ERC20ABI from './ERC20ABI.json';
import {
  AlphaRouter,
  ProviderBlockHeaderError,
} from '@uniswap/smart-order-router';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { ethers, BigNumber, Signer } from 'ethers';
import JSBI from 'jsbi';
import { WrapperContract } from '../contractAddress';
import wrapperContract from './WrapperContract.json';
import { Pool, Position } from '@uniswap/v3-sdk';

const V3_SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const chainId = 4; //rinkeby network

const provider = new ethers.providers.Web3Provider(window.ethereum);
const router = new AlphaRouter({ chainId: chainId, provider: provider });

// const name1 = 'USD Coin';
// const symbol1 = 'USDC';
// const decimals1 = 6;
// const address1 = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; //contract address of  USDC
// const USDC = new Token(chainId, address1, decimals1, symbol1, name1);

const name1 = 'TestUSDC';
const symbol1 = 'TUSDC';
const decimals1 = 6;
const address1 = '0x4A697C0852f1B59fc6E58C55d3D84899A1a6F151'; //contract address of  USDC
const TUSDC = new Token(chainId, address1, decimals1, symbol1, name1);

export const gettoken0Contract = (address: any) =>
  new ethers.Contract(address, ERC20ABI, provider);

export const getUSDCContract = () =>
  new ethers.Contract(address1, ERC20ABI, provider);

export const getTokenBalance = async (token: any, account: any) => {
  //@ts-ignore

  if (typeof window !== 'undefined') {
    const { ethereum } = window;
    if (!ethereum) {
      return;
    }
    try {
      const XtokenContract = gettoken0Contract(token.address);

      const xTokenBalance = await XtokenContract.balanceOf(account);
      console.log(ethers.utils.formatUnits(xTokenBalance, token.decimals));
      return ethers.utils.formatUnits(xTokenBalance, token.decimals);
    } catch (error) {
      console.log(error);
    }
  }
};
export const getCGTBalance = async (account: any) => {
  //@ts-ignore

  if (typeof window !== 'undefined') {
    const { ethereum } = window;
    if (!ethereum) {
      return;
    }
    try {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const CGTContract = new ethers.Contract(
        '0x5d20692Be3324110E4D258D4ec0d129Dc39040E5',
        ERC20ABI,
        signer
      );
      const CGTbalContract = await CGTContract.balanceOf(WrapperContract);
      const cgtbalance = await CGTContract.balanceOf(account);
      return [
        ethers.utils.formatUnits(cgtbalance, 8),
        ethers.utils.formatUnits(CGTbalContract, 8),
      ];
    } catch (error) {
      console.log(error);
    }
  }
};
export const swap = async (
  token: any,
  walletAddress: string,
  amount: string
) => {
  const signer = provider.getSigner();
  const XtokenContract = new ethers.Contract(token.address, ERC20ABI, signer);

  const WContract = new ethers.Contract(
    WrapperContract,
    wrapperContract.abi,
    signer
  );
  console.log(await WContract.stable());
  console.log(XtokenContract);
  await XtokenContract.connect(signer)
    .approve(WrapperContract, ethers.utils.parseEther(amount.toString()))
    .then(async (txRes: any) => {
      console.log(txRes);
    });

  WContract.connect(signer).swapTokensForCGT(
    token.address,
    3000,
    ethers.utils
      .parseEther(amount.toString())
      .div(10 ** (18 - (await XtokenContract.decimals()))),
    0,
    0
  );
};
export const getPrice = async (
  inputAmount: number,
  walletAddress: string,
  token: any
) => {
  const XTOKEN = new Token(
    chainId,
    token.address,
    token.decimals,
    token.symbol,
    token.name
  );
  const percentSlippage = new Percent(25, 100);
  const wei = ethers.utils.parseUnits(inputAmount.toString(), token.decimals);
  const currencyAmount = CurrencyAmount.fromRawAmount(XTOKEN, JSBI.BigInt(wei));

  const route = await router.route(
    currencyAmount,
    TUSDC,
    TradeType.EXACT_INPUT,
    {
      recipient: walletAddress,
      slippageTolerance: percentSlippage,
      deadline: 15,
    }
  );

  const transaction = {
    data: route!.methodParameters!.calldata,
    to: V3_SWAP_ROUTER_ADDRESS,
    value: BigNumber.from(route!.methodParameters!.value),
    from: walletAddress,
    gasPrice: BigNumber.from(route!.gasPriceWei),
    gasLimit: ethers.utils.hexlify(1000000),
  };

  const quoteAmountOut = parseFloat(route!.quote.toFixed(6));
  const ratio = inputAmount / quoteAmountOut;
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const WContract = new ethers.Contract(
    WrapperContract,
    wrapperContract.abi,
    signer
  );

  const CGTamt = await WContract.quoteCGTAmountReceived(
    ethers.utils.parseUnits(quoteAmountOut.toString(), 6)
  );
  return [transaction, ethers.utils.formatUnits(CGTamt, 8), ratio];
};
