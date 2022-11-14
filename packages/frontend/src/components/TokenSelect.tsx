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

  useEffect(() => {
    Axios.get(`https://tokens.uniswap.org/`).then((res) => {
      const data = res.data.tokens.filter((val: any) => {
        return val.chainId === 137;
      });
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
            className="dropdown-search"
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
          <div style={{ paddingTop: '30px' }}>
            {tokens
              .filter((val) => {
                return (
                  val.symbol.toLowerCase().includes(search.toLowerCase()) &&
                  val.chainId === 137 &&
                  val.symbol !== 'MATIC'
                );
              })
              .map((val, index) => {
                return (
                  <div
                    onClick={async function (e) {
                      onOptionSelect(val);
                      setToken(val);
                      // await getTokenBalance(val, account).then((value) => {
                      //   console.log(value);
                      // });
                    }}
                    key={index}
                    className="optionContainer"
                  >
                    {val.logoURI && (
                      <img
                        className="imageContainer"
                        src={val.logoURI}
                        alt=""
                      />
                    )}
                    <a>{val.symbol}</a>
                    {/* (chain ID:{val.chainId}) */}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </>
  );
}
