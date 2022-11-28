import { Button, Box } from '@chakra-ui/react';
import { useEtherBalance, useEthers } from '@usedapp/core';
import wrapperContractAbi from '../wrapperContract.json';
import { useAppContext } from './appContext';

export default function SwapButton({ txLoading }: any) {
  const { activateBrowserWallet, account } = useEthers();
  const { token, tokenBalance, value } = useAppContext();
  function handleConnectWallet() {
    activateBrowserWallet();
  }

  return account ? (
    token.name ? (
      parseFloat(tokenBalance) < value ? (
        <Box mt="0.5rem">
          <Button
            color="black"
            bg="#fbd03bbf"
            width="100%"
            p="1.62rem"
            disabled={true}
            borderRadius="1.25rem"
          >
            Insufficent Balance
          </Button>
        </Box>
      ) : !value ? (
        <Box mt="0.5rem">
          <Button
            color="black"
            bg="#fbd03bbf"
            width="100%"
            p="1.62rem"
            disabled={true}
            borderRadius="1.25rem"
          >
            Enter an Amount
          </Button>
        </Box>
      ) : (
        <Box mt="0.5rem">
          <Button
            color="black"
            bg="#fbd03b"
            width="100%"
            p="1.62rem"
            disabled={value === 0 || txLoading}
            borderRadius="1.25rem"
            _hover={{ bg: '#fbd03bbf' }}
          >
            SWAP
          </Button>
        </Box>
      )
    ) : (
      <Box mt="0.5rem">
        <Button
          color="black"
          bg="#fbd03bbf"
          width="100%"
          p="1.62rem"
          borderRadius="1.25rem"
        >
          Please select token
        </Button>
      </Box>
    )
  ) : (
    <Box mt="0.5rem">
      <Button
        onClick={handleConnectWallet}
        color="black"
        bg="#fbd03b"
        width="100%"
        p="1.62rem"
        borderRadius="1.25rem"
        _hover={{ bg: '#fbd03bbf' }}
      >
        Connect Wallet
      </Button>
    </Box>
  );
}
