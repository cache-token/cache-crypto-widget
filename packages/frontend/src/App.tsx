import { HashRouter, Routes, Route } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultWallets, darkTheme, RainbowKitProvider, Theme } from '@rainbow-me/rainbowkit';
import { chain, configureChains, createClient, WagmiConfig } from 'wagmi';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';

import { IAppConfig } from './models/Base';
import { getAppConfig } from './helpers/Utilities';
import Widget from './components/Widget';

const config: IAppConfig = getAppConfig();

const theme = createTheme({
  palette: {
    primary: {
      main: '#F1F5F9',
      contrastText: '#2345DC',
    },
    secondary: {
      main: '#F7B600',
      contrastText: '#000000',
    }
  },
  typography: {
    fontFamily: [
      'Ubuntu',
      'sans-serif'
    ].join(','),
  }
});

const { chains, provider } = configureChains(
  [chain.polygon],
  [
    alchemyProvider({ apiKey: config.NETWORK.ALCHEMY_API_KEY }),
    publicProvider()
  ]
);

const { connectors } = getDefaultWallets({
  appName: 'CGT Widget',
  chains
});

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider
});

const rainbowDarkTheme: Theme = {
  ...darkTheme({
    borderRadius: 'small'
  }),
  colors: {
    ...darkTheme().colors,
    accentColor: '#F7B600',
    connectButtonBackground: '#F7B600',
    connectButtonText: '#000000',
  } as any
};

function App() {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains} theme={rainbowDarkTheme}>
        <ThemeProvider theme={theme}>
          <div className="AppContainer">
            <HashRouter>
              <Routes>
                <Route path="/" element={
                  <Widget />
                } />
              </Routes>
            </HashRouter>
          </div>
        </ThemeProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;

(window as any).ethereum?.on('chainChanged', () => {
  window.location.reload();
});
