import { Button, Box, Image, useDisclosure, Flex } from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import etherLogo from '../assets/etherLogo.png';
import './styles.css';
import SelectSearch, { fuzzySearch } from 'react-select-search';
import { useEffect, useState } from 'react';
import Axios from 'axios';
import { useEthers } from '@usedapp/core';
import { gettoken0Contract } from '../services/v3service';
type Props = {
  openTokenModal: any;
  value: any;
  image: string;
  button: string;
};

export default function TokenSelect() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>('Select a token');
  const [search, setSearch] = useState<any>('');
  const { chainId, library } = useEthers();
  // const signer = library!.getSigner();
  useEffect(() => {
    Axios.get(`https://tokens.uniswap.org/`).then((res) => {
      setTokens(res.data.tokens);
    });
  }, []);
  function myFunction() {
    const element = document.getElementById(
      'myDropdown'
    ) as HTMLDivElement | null;
    element!.classList.toggle('show');
  }

  function onOptionSelect(value: any) {
    console.log(value);
    setSelected(value.symbol);
    const element = document.getElementById(
      'myDropdown'
    ) as HTMLDivElement | null;
    element!.classList.toggle('show');
  }

  // function renderTokens(
  //   props: any,
  //   option: any,
  //   snapshot: any,
  //   className: any
  // ) {
  //   const imgStyle = {
  //     borderRadius: '50%',
  //     verticalAlign: 'middle',
  //     marginRight: 10,
  //   };

  //   return (
  //     <button {...props} className={className} type="button">
  //       <Flex alignItems="center">
  //         <img
  //           alt=""
  //           style={imgStyle}
  //           width="28"
  //           height="28"
  //           src={option.logoURI}
  //         />
  //         <span>{option.symbol}</span>
  //       </Flex>
  //     </button>
  //   );
  // }
  return (
    // <SelectSearch
    //   className="select-search no-scroll"
    //   options={tokens.slice(0, 20)}
    //   renderOption={renderTokens}
    //   value={selected}
    //   onChange={(SelectedOptionValue: any) => {
    //     window.__selected.name = SelectedOptionValue.toString();
    //     setSelected(SelectedOptionValue);
    //     // console.log(SelectedOption);
    //     console.log(window.__selected);
    //   }}
    //   search
    //   placeholder="Search tokens..."
    //   filterOptions={fuzzySearch}
    // />
    <>
      <div className="dropdown">
        <button onClick={() => myFunction()} className="dropbtn">
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
              return val.name.toLowerCase().includes(search.toLowerCase());
            })
            .map((val, index) => {
              return (
                <div
                  onClick={() => {
                    onOptionSelect(val);
                  }}
                  key={index}
                  className="optionContainer"
                >
                  {/* {val.logoURI && (
                    <img className="imageContainer" src={val.logoURI} alt="" />
                  )} */}
                  <a>{val.symbol}</a>
                </div>
              );
            })
            .slice(0, 10)}
        </div>
      </div>
    </>
  );
}
