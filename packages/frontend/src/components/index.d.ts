export type Token = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
};
export interface globalState {
  token: Token;
  setToken: React.Dispatch<React.SetStateAction<Token>>;
  tokenBalance: string;
  CGTBalance: string;
  setTokenBalance: React.Dispatch<React.SetStateAction<string>>;
  setCGTBalance: React.Dispatch<React.SetStateAction<string>>;
}
