import {
  Flex,
  Box,
  Image,
  Text,
  Button,
  Input,
  useDisclosure,
} from '@chakra-ui/react';
import { SettingsIcon, ChevronDownIcon, ArrowDownIcon } from '@chakra-ui/icons';
import SwapButton from './SwapButton';
import TokenSelect from './TokenSelect';
// import TokenModal from './Modal/TokenModal';
import { useState } from 'react';
import logo from '../assets/logo.svg';
import { formatEther } from 'ethers/lib/utils';
import { useEtherBalance, useEthers } from '@usedapp/core';
import Identicon from './Identicon';
type Props = {
  handleOpenModal: any;
};
export default function Trade({ handleOpenModal }: Props) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [value, setValue] = useState<number>(0);
  const { account } = useEthers();
  const etherBalance = useEtherBalance(account);

  return (
    <Box
      w="30.62rem"
      mx="auto"
      mt="5.25rem"
      boxShadow="rgb(0 0 0 / 1%) 0px 0px 1px, rgb(0 0 0 / 4%) 0px 4px 8px, rgb(0 0 0 / 4%) 0px 16px 24px, rgb(0 0 0 / 1%) 0px 24px 32px;
}"
      borderRadius="1.37rem"
    >
      {/* <TokenModal isOpen={isOpen} onClose={onClose} /> */}

      <Flex
        alignItems="center"
        p="1.5rem 1.25rem 1.5rem"
        bg="#191b1d"
        justifyContent="space-between"
        borderRadius="1.37rem 1.37rem 0 0"
      >
        <Text color="white" fontWeight="500">
          Swap
        </Text>
        <SettingsIcon
          color="white"
          fontSize="1.25rem"
          cursor="pointer"
          _hover={{ color: 'rgb(128,128,128)' }}
        />
      </Flex>
      {account && (
        <Flex alignItems="center" justifyContent="center" bg="#191b1d" py="0">
          <Box px="5">
            <Text color="white" fontSize="md">
              {etherBalance && parseFloat(formatEther(etherBalance)).toFixed(0)}{' '}
              ETH
            </Text>
          </Box>
          <Button
            onClick={handleOpenModal}
            bg="#191b1d"
            border="0.06rem solid rgb(247, 248, 250)"
            _hover={{
              border: '0.06rem',
              borderStyle: 'solid',
              borderColor: 'rgb(211,211,211)',
            }}
            borderRadius="xl"
            m="0.06rem"
            px={3}
            h="2.37rem"
          >
            <Text color="white" fontSize="md" fontWeight="medium" mr="2">
              {account &&
                `${account.slice(0, 6)}...${account.slice(
                  account.length - 4,
                  account.length
                )}`}
            </Text>
            <Identicon />
          </Button>
        </Flex>
      )}

      <Box p="1rem" bg="#191b1d" borderRadius="0 0 1.37rem 1.37rem">
        <Flex
          alignItems="center"
          justifyContent="space-between"
          bg="#212429"
          p="1.75rem 1rem 1.75rem"
          borderRadius="1.25rem"
          border="none"
        >
          <Box>
            <TokenSelect />
          </Box>
          <Box>
            <Input
              placeholder="0.0"
              fontWeight="500"
              fontSize="1.5rem"
              width="100%"
              size="19rem"
              textAlign="right"
              bg="#212429"
              outline="none"
              border="none"
              focusBorderColor="none"
              type="number"
              color="white"
              onChange={function (e) {
                let token2Value = 0;
                if (e.target.value !== undefined) {
                  // token2Value =
                  //   Number(e.target.value) *
                  //  (window.__price1 / window.__price2);
                }
                setValue(token2Value);
              }}
            />
          </Box>
        </Flex>

        <Flex
          alignItems="center"
          justifyContent="space-between"
          bg="#212429"
          pos="relative"
          p="1.75rem 1rem 1.75rem"
          borderRadius="1.25rem"
          mt="0.25rem"
          border="none"
        >
          <Box width={'50%'}>
            <Flex gap={2} alignItems="center">
              <Image height={35} width={35} src={logo} />
              <Text color="white" as="b" fontSize="md">
                CGT
              </Text>
            </Flex>
          </Box>
          <Flex
            alignItems="center"
            justifyContent="center"
            bg="#191b1f"
            p="0.3rem"
            borderRadius="0.75rem"
            pos="relative"
            top="-3rem"
            left="2.5rem"
          >
            <ArrowDownIcon
              bg="#212429"
              color="#7e8497"
              h="1.5rem"
              width="1.5rem"
              padding="0.2rem"
              borderRadius="0.4rem"
            />
          </Flex>
          <Box>
            <Input
              placeholder="0.0"
              fontSize="1.5rem"
              width="100%"
              size="19rem"
              textAlign="right"
              bg="#212429"
              outline="none"
              border="none"
              focusBorderColor="none"
              type="number"
              color="white"
              value={value}
            />
          </Box>
        </Flex>
        <Box color="black">
          <div>
            {/* 1 CGT = {window.__price2 / window.__price1} {window.__selected} */}
          </div>
        </Box>
        <SwapButton />
      </Box>
    </Box>
  );
}
