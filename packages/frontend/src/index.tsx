import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { DAppProvider } from '@usedapp/core';
import { ApolloProvider } from 'react-apollo';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { HttpLink } from 'apollo-link-http';
import { getAppConfig } from './helpers';
import { IAppConfig } from './models';

const config: IAppConfig = getAppConfig();
const client = new ApolloClient({
  link: new HttpLink({
    uri: config.UNISWAP_SUBGRAPH,
  }),
  cache: new InMemoryCache(),
});

ReactDOM.render(
  <React.StrictMode>
    <DAppProvider config={{}}>
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    </DAppProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
