import { ChakraProvider, useDisclosure } from '@chakra-ui/react';
import theme from './theme';
// import Header from './components/Header';
// import ConnectButton from './components/ConnectButton';
import AccountModal from './components/Modal/AccountModal';
import Swap from './components/Swap';
import '@fontsource/inter';
import './global.css';
import { Token } from './components';
import { useEffect, useState } from 'react';
import AppContext from './components/appContext';

function App() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [t, setT] = useState<Token>({
    address: '',
    name: '',
    symbol: '',
    decimals: 0,
    chainId: 0,
  });
  const [tBal, setTBal] = useState('');
  const [CGTBal, setCGTBal] = useState('');
  const [value, setValue] = useState<number>(0);
  const [alertMsg, setalertMsg] = useState('');

  const values = {
    token: t,
    setToken: setT,
    tokenBalance: tBal,
    CGTBalance: CGTBal,
    setTokenBalance: setTBal,
    setCGTBalance: setCGTBal,
    value: value,
    setValue: setValue,
    alertMsg: alertMsg,
    setalertMsg: setalertMsg,
  };
  useEffect(() => {
    if (alertMsg) {
      const timer = setTimeout(() => {
        setalertMsg('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [alertMsg]);
  return (
    <AppContext.Provider value={values}>
      <ChakraProvider theme={theme}>
        {/* <Header>
        <ConnectButton handleOpenModal={onOpen} />
        <AccountModal isOpen={isOpen} onClose={onClose} />
      </Header> */}
        <Swap handleOpenModal={onOpen} />
        <AccountModal isOpen={isOpen} onClose={onClose} />
        {/* <Test /> */}
      </ChakraProvider>
    </AppContext.Provider>
  );
}

export default App;
