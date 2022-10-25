import AppContext from './appContext';
import { useContext, useEffect, useState } from 'react';
import Axios from 'axios';
import { useEthers } from '@usedapp/core';
import { globalState } from '.';
import { useAppContext } from './appContext';
import { getTokenBalance } from '../services/v3service';

export default function TokenSelect() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>('Select a token');
  const [search, setSearch] = useState<any>('');
  const { chainId, account } = useEthers();
  const { setToken } = useAppContext();
  // const signer = library!.getSigner();
  const testWETH = {
    name: 'TestWETH',
    address: '0xf298e212e92Dc2f0859309B5C5E9fDD3E29a9737',
    symbol: 'TWETH',
    decimals: 18,
    chainId: 4,
    logoURI:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
  };
  useEffect(() => {
    Axios.get(`https://tokens.uniswap.org/`).then((res) => {
      const data = res.data.tokens.filter((val: any) => {
        return val.chainId === 137;
      });
      data.push(testWETH);
      console.log(data);
      setTokens(data);
    });
  }, []);
  function toggleFunc() {
    const element = document.getElementById(
      'myDropdown'
    ) as HTMLDivElement | null;
    element!.classList.toggle('show');
  }

  async function onOptionSelect(value: any) {
    setSelected(value.symbol);

    const element = document.getElementById(
      'myDropdown'
    ) as HTMLDivElement | null;
    element!.classList.toggle('show');
  }

  return (
    <>
      <div className="dropdown">
        <button onClick={() => toggleFunc()} className="dropbtn">
          {selected}
        </button>
        <div id="myDropdown" className="dropdown-content">
          <input
            type="text"
            placeholder="Search.."
            id="myInput"
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
          {tokens
            .filter((val) => {
              return (
                val.symbol.toLowerCase().includes(search.toLowerCase()) &&
                val.chainId === 137
              );
            })
            .map((val, index) => {
              return (
                <div
                  onClick={async function (e) {
                    onOptionSelect(val);
                    setToken(val);
                    await getTokenBalance(val, account).then((value) => {
                      console.log(value);
                    });
                  }}
                  key={index}
                  className="optionContainer"
                >
                  {val.logoURI && (
                    <img className="imageContainer" src={val.logoURI} alt="" />
                  )}
                  <a>{val.symbol}</a>
                  {/* (chain ID:{val.chainId}) */}
                </div>
              );
            })
            .slice(0, 10)}
        </div>
      </div>
    </>
  );
}
