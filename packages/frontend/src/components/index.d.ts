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
}
