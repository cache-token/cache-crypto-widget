export type Token = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
};
export interface globalState {
  token: Token;
  value: number;
  tokenBalance: string;
  CGTBalance: string;
  errorMsg: string;
  setErrorMsg: React.Dispatch<React.SetStateAction<string>>;
  setToken: React.Dispatch<React.SetStateAction<Token>>;
  setTokenBalance: React.Dispatch<React.SetStateAction<string>>;
  setCGTBalance: React.Dispatch<React.SetStateAction<string>>;
  setValue: React.Dispatch<React.SetStateAction<number>>;
}
