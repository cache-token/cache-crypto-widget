import ERC20ABI from './ERC20ABI.json';
import {
  AlphaRouter,
  ProviderBlockHeaderError,
} from '@uniswap/smart-order-router';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { ethers, BigNumber } from 'ethers';

const V3_SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const chainId = 4; //rinkeby network

export const router = (provider: any) =>
  new AlphaRouter({ chainId: chainId, provider: provider });
const token0 = ({ address0, decimals0, symbol0, name0 }: any) =>
  new Token(chainId, address0, decimals0, symbol0, name0);

const name1 = 'USD Coin (rinkeby)';
const symbol1 = 'USDC';
const decimals1 = 6;
const address1 = '0xeb8f08a975Ab53E34D8a0330E0D34de942C95926'; //contract address of testnet USDC
const token1 = new Token(chainId, address1, decimals1, symbol1, name1);

export const gettoken0Contract = ({ provider, address }: any) =>
  new ethers.Contract(address, ERC20ABI, provider);
export const getUSDCContract = (provider: any) =>
  new ethers.Contract(address1, ERC20ABI, provider);
