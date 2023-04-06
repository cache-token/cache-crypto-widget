export interface IChainInfo {
  name: string;
  chainId: number;
  blockExplorer: string;
  rpcUrl: string;
  symbol: string;
  explorerName: string;
  faucet?: string;
}
