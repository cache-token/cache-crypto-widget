export declare global {
  interface Window {
    __selected: Token;
    __imageSelected: string;
    __button: string;
  }
  type Token = {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
  };
}
