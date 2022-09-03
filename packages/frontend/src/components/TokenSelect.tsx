import { Button, Box, Image, useDisclosure, Flex } from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import etherLogo from '../assets/etherLogo.png';
import './styles.css';
import SelectSearch, { fuzzySearch } from 'react-select-search';
import { useEffect, useState } from 'react';
import Axios from 'axios';
type Props = {
  openTokenModal: any;
  value: any;
  image: string;
  button: string;
};

export default function TokenSelect() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>();
  useEffect(() => {
    Axios.get(`https://tokens.uniswap.org/`).then((res) => {
      const newTokenArr = res.data.tokens.map(
        //TODO: Add token type
        (tokens: any, index: number) => ({
          ...tokens,
          value: tokens.symbol,
        })
      );
      setTokens(newTokenArr);
    });
  }, []);

  function renderTokens(
    props: any,
    option: any,
    snapshot: any,
    className: any
  ) {
    const imgStyle = {
      borderRadius: '50%',
      verticalAlign: 'middle',
      marginRight: 10,
    };

    return (
      <button {...props} className={className} type="button">
        <Flex alignItems="center">
          <img
            alt=""
            style={imgStyle}
            width="28"
            height="28"
            src={option.logoURI}
          />
          <span>{option.symbol}</span>
        </Flex>
      </button>
    );
  }
  return (
    <SelectSearch
      className="select-search no-scroll"
      options={tokens.slice(0, 20)}
      renderOption={renderTokens}
      value={selected}
      onChange={(SelectedOptionValue) => {
        window.__selected = SelectedOptionValue.toString();
        setSelected(SelectedOptionValue);
        console.log(window.__selected);
      }}
      search
      placeholder="Search tokens..."
      filterOptions={fuzzySearch}
    />
  );
}
