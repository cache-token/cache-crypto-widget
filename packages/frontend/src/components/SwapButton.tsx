import { Button, Box } from '@chakra-ui/react';
import { useEtherBalance, useEthers } from '@usedapp/core';
import wrapperContractAbi from '../wrapperContract.json';
import { ethers } from 'ethers';
type Props = {
  handleOpenModal: any;
};

export default function SwapButton() {
  const { activateBrowserWallet, account } = useEthers();
  const etherBalance = useEtherBalance(account);

  function handleConnectWallet() {
    activateBrowserWallet();
  }

  return account ? (
    window.__selected ? (
      <Box mt="0.5rem">
        <Button
          color="white"
          bg="rgb(255,140,0)"
          width="100%"
          p="1.62rem"
          borderRadius="1.25rem"
          _hover={{ bg: 'rgb(255,165,0)' }}
        >
          Swap
        </Button>
      </Box>
    ) : (
      <Box mt="0.5rem">
        <Button
          color="white"
          bg="rgb(255,140,0)"
          width="100%"
          p="1.62rem"
          borderRadius="1.25rem"
          _hover={{ bg: 'rgb(255,165,0)' }}
        >
          Please select token
        </Button>
      </Box>
    )
  ) : (
    <Box mt="0.5rem">
      <Button
        onClick={handleConnectWallet}
        color="white"
        bg="rgb(255,140,0)"
        width="100%"
        p="1.62rem"
        borderRadius="1.25rem"
        _hover={{ bg: 'rgb(255,165,0)' }}
      >
        Connect Wallet
      </Button>
    </Box>
  );
}
