export interface IAppConfig {
  NETWORK: {
    CHAIN_ID: number;
    NAME: string;
    RPC_URL: string;
    BLOCK_EXPLORER: string;
    ALCHEMY_API_KEY: string;
  },
  CONTRACTS_ADDRESS: {
    CGT: string;
    USDC: string;
    CGTSwap: string;
  }
}
