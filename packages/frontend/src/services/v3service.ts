import ERC20ABI from './ERC20ABI.json';
import {
  AlphaRouter,
  ProviderBlockHeaderError,
} from '@uniswap/smart-order-router';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { ethers, BigNumber } from 'ethers';
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
// const address1 = '0xeb8f08a975Ab53E34D8a0330E0D34de942C95926'; //contract address of  USDC
// const USDC = new Token(chainId, address1, decimals1, symbol1, name1);

const name1 = 'Dai Stablecoin';
const symbol1 = 'DAI';
const decimals1 = 18;
const address1 = '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735'; //contract address of  USDC
const DAI = new Token(chainId, address1, decimals1, symbol1, name1);

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
  //create DAI/XTOKEN pool
  const pool = new Pool(
    DAI,
    XTOKEN,
    3000,
    '1283723400872544054280619964098219',
    '8390320113764730804',
    193868
  );
  const token0Balance = CurrencyAmount.fromRawAmount(DAI, '5000000000');
  const routeToRatioResponse = await router.routeToRatio(
    token0Balance,
    currencyAmount,
    new Position({
      pool,
      tickLower: -60,
      tickUpper: 60,
      liquidity: 1,
    }),
    {
      ratioErrorTolerance: new Percent(1, 100),
      maxIterations: 6,
    },
    {
      swapOptions: {
        recipient: walletAddress,
        slippageTolerance: new Percent(5, 100),
        deadline: 100,
      },
      addLiquidityOptions: {
        tokenId: 10,
      },
    }
  );
  const route = await router.route(currencyAmount, DAI, TradeType.EXACT_INPUT, {
    recipient: walletAddress,
    slippageTolerance: percentSlippage,
    deadline: 15,
  });

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

  // const CGTamt = await WContract.quoteCGTAmountReceived(
  //   ethers.utils.parseEther(quoteAmountOut.toString())
  // );
  // return [transaction, ethers.utils.formatUnits(CGTamt, 8), ratio];
  return [transaction, quoteAmountOut, ratio];
};
