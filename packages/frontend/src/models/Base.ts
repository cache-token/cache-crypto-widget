export interface IAppConfig {
  NETWORK: {
    CHAIN_ID: number;
    NAME: string;
    RPC_URL: string;
    BLOCK_EXPLORER: string;
    ALCHEMY_API_KEY: string;
    NATIVE: string;
  },
  CONTRACTS_ADDRESS: {
    Wrapper: string;
    CGT: string;
    USDC: string;
    WMATIC: string;
  }
}
