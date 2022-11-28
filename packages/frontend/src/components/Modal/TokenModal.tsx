import {
  Box,
  Button,
  Flex,
  Link,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Text,
  Input,
} from '@chakra-ui/react';
import Axios from 'axios';
import { useEffect, useState } from 'react';

type Props = {
  isOpen: any;
  onClose: any;
};

export default function TokenModal({ isOpen, onClose }: Props) {
  const [search, setSearch] = useState<any>('');
  const [crypto, setCrypto] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>('');
  useEffect(() => {
    Axios.get(`https://tokens.uniswap.org/`).then((res) => {
      setCrypto(res.data.tokens);
    });
  }, []);
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay />
      <ModalContent
        background="white"
        border="0.06rem"
        borderStyle="solid"
        borderColor="gray.300"
        borderRadius="3xl"
      >
        <ModalHeader color="black" px={4} fontSize="lg" fontWeight="medium">
          Select A Token
        </ModalHeader>
        <ModalCloseButton
          color="black"
          fontSize="sm"
          _hover={{
            color: 'gray.600',
          }}
        />
        <ModalBody pt={0} px={4}>
          <Box
            borderRadius="3xl"
            border="0.06rem"
            borderStyle="solid"
            borderColor="gray.300"
            px={5}
            pt={4}
            pb={2}
            mb={3}
          >
            <input
              placeholder="Search Token name"
              width="100%"
              type="text"
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              color="black"
            />
          </Box>
          {/*<Box color="black" display="flex">*/}
          {/*    <img src={imageToShow} alt="logo" width="50px" />*/}
          {/*    <span>{tokenNameToShow}</span>*/}
          {/*</Box>*/}

          <div id="customers" className="App">
            <table>
              <thead>
                <tr>
                  <td>Name</td>
                  <td>Symbol</td>
                </tr>
              </thead>
              <tbody>
                {crypto
                  .filter((val) => {
                    return val.name
                      .toLowerCase()
                      .includes(search.toLowerCase());
                  })
                  .map((val) => {
                    let hidden = false;
                    // if (
                    //   window.__button === 'button2' &&
                    //   val.name === window.__selected
                    // ) {
                    //   hidden = true;
                    // }
                    return (
                      <>
                        <tr
                          id={val.name}
                          // style={{
                          //   backgroundColor:
                          //     val.name === window.__selected ? '#fbd03b' : '',
                          // }}
                          hidden={hidden}
                          onClick={function (e) {
                            // window.__selected = val.name;
                            // window.__imageSelected = val.logoURI;

                            setSelected(val.name);
                          }}
                        >
                          <td className="logo">
                            <a href="/">
                              <img src={val.logoURI} alt="logo" width="30px" />
                            </a>
                            <span>{val.name}</span>
                          </td>
                          <td className="symbol">{val.symbol}</td>
                        </tr>
                      </>
                    );
                  })
                  .slice(0, 8)}
              </tbody>
            </table>
          </div>
        </ModalBody>

        <ModalFooter
          justifyContent="flex-start"
          background="rgb(237, 238, 242)"
          borderBottomLeftRadius="3xl"
          borderBottomRightRadius="3xl"
          p={6}
        >
          {/* <Text color="black" fontWeight="medium" fontSize="md">
            Manage Token List
          </Text> */}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
