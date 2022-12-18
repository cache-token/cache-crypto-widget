import { useEffect, useState } from "react";

import {
  Button, CircularProgress, Dialog, FormControl, IconButton, InputAdornment, ListItemIcon, ListItemText, Menu,
  MenuItem, Skeleton, Step, StepLabel, Stepper, TextField
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
// import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';

import JSBI from 'jsbi';
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useNetwork, useProvider, useSigner } from "wagmi";
import { CurrencyAmount, Token, TradeType } from "@uniswap/sdk-core";
import { AlphaRouter } from "@uniswap/smart-order-router";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { TransactionResponse } from "@ethersproject/providers";

import cgtImage from '../assets/images/cgt_icon.png';
import { IFormControl } from "../models/Form";
import { getAppConfig } from "../helpers/Utilities";
import { IAppConfig } from "../models/Base";
import { Transition } from "./Transition";
import SnackbarMessage from "./Snackbar";
import { ISnackbarConfig } from "../models/Material";
import { IToken } from "../models/Token";
import { getContractByAddressName, getContractByName } from "../helpers/Contract";
import { errorHandler, pollingTransaction } from "../helpers/Wallet";

const Widget = () => {
  const config: IAppConfig = getAppConfig();

  const { address, isConnected } = useAccount();
  const provider = useProvider();
  const { chain } = useNetwork();
  const { data: signer } = useSigner();

  const [isNotEnoughBalance, setIsNotEnoughBalance] = useState<boolean>(false);
  const [isExceedBalance, setIsExceedBalance] = useState<boolean>(false);
  const [isNotSupportedToken, setIsNotSupportedToken] = useState<boolean>(false);
  const [isConfirmation, setIsConfirmation] = useState<boolean>(false);
  const [isFetchingCgtAmount, setIsFetchingCgtAmount] = useState<boolean>(false);
  const [isFetchingTokenBalance, setIsFetchingTokenBalance] = useState<boolean>(false);
  const [isTryAgain, setIsTryAgain] = useState<boolean>(false);
  const [isSwapCompleted, setIsSwapCompleted] = useState<boolean>(false);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [disableForm, setDisableForm] = useState<boolean>(false);
  
  const [decimals, setDecimals] = useState<number>(0);
  const [confirmationStep, setConfirmationStep] = useState<number>(0);
  const [cgtReceive, setCgtReceive] = useState<number>(0);

  const [balance, setBalance] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('');
  const [confirmationMessage, setConfirmationMessage] = useState<string>('');

  const [tokens, setTokens] = useState<Array<IToken>>([]);

  const [tokensDropdownEl, setTokensDropdownEl] = useState<null | HTMLElement>(null);
  const openTokensDropdownEl = Boolean(tokensDropdownEl);

  const [snackbar, setSnackbar] = useState<ISnackbarConfig>({
    isOpen: false
  } as ISnackbarConfig);

  const [tokenControl, setTokenControl] = useState<IFormControl>({
    value: '',
    invalid: true
  });
  const [amountControl, setAmountControl] = useState<IFormControl>({
    value: '',
    invalid: true
  });

  const { data: cgtBalanceData } = useBalance({
    addressOrName: address?.toString(),
    token: config.CONTRACTS_ADDRESS.CGT,
    chainId: config.NETWORK.CHAIN_ID,
    watch: true
  });

  const { data: cgtWrapperBalanceData } = useBalance({
    addressOrName: config.CONTRACTS_ADDRESS.Wrapper,
    token: config.CONTRACTS_ADDRESS.CGT,
    chainId: config.NETWORK.CHAIN_ID,
    watch: true
  });

  const uniswapRouter = new AlphaRouter({ chainId: config.NETWORK.CHAIN_ID, provider: provider });

  useEffect(() => {
    fetch('https://tokens.uniswap.org/')
      .then((response) => response.json())
      .then((data: any) => {
        if (data && data.tokens) {
          const tks = data.tokens.filter((token: IToken) => token.chainId === config.NETWORK.CHAIN_ID && token.symbol !== config.NETWORK.NATIVE);
          setTokens(tks);
          const wmatic = tks.find((token: IToken) => token.address === config.CONTRACTS_ADDRESS.WMATIC);
          if (wmatic) {
            setTokenControl({
              value: wmatic,
              invalid: false
            });
          }
        }
      });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (tokenControl.value && address && chain?.id === config.NETWORK.CHAIN_ID) {
      getTokenBalance();
    }
    // eslint-disable-next-line
  }, [tokenControl, address]);

  useEffect(() => {
    if (tokenControl.value) {
      setIsExceedBalance(false);
      setIsNotSupportedToken(false);
      setCgtReceive(0);
    }
    // eslint-disable-next-line
  }, [tokenControl]);

  useEffect(() => {
    if (+amountControl.value) {
      setIsFetchingCgtAmount(true);
      const timeOutId = setTimeout(() => getPrice(), 500);
      return () => clearTimeout(timeOutId);
    } else {
      setCgtReceive(0);
      setIsFetchingCgtAmount(false);
    }
    // eslint-disable-next-line
  }, [amountControl]);

  useEffect(() => {
    if (amountControl.value && balance && +amountControl.value > +balance) {
      setIsNotEnoughBalance(true);
    } else {
      setIsNotEnoughBalance(false);
    }
  }, [amountControl, balance]);

  useEffect(() => {
    if (!isNotEnoughBalance && !tokenControl.invalid && !amountControl.invalid && +amountControl.value && +amountControl.value > 0) {
      setIsFormValid(true);
    } else {
      setIsFormValid(false);
    }
  }, [tokenControl, amountControl, isNotEnoughBalance]);

  const openTokensDropdown = (event: React.MouseEvent<HTMLButtonElement>) => {
    setTokensDropdownEl(event.currentTarget);
  };

  const closeTokensDropdown = () => {
    setTokensDropdownEl(null);
  };

  const tryAgain = () => {
    if (confirmationStep === 0) {
      approve();
    } else if (confirmationStep === 1) {
      swap();
    }
  }

  const getTokenBalance = async () => {
    setIsFetchingTokenBalance(true);
    const tokenContract = getContractByAddressName(tokenControl.value?.address, 'Token', provider as any);
    const bl = await tokenContract.balanceOf(address);
    const dcm = await tokenContract.decimals();
    setBalance((formatUnits(bl, dcm)));
    setSymbol(tokenControl.value?.symbol);
    setDecimals(dcm);
    setIsFetchingTokenBalance(false);
  };

  const getPrice = async () => {
    if (tokenControl.value.symbol === 'USDC') {
      setIsNotSupportedToken(true);
      setIsFetchingCgtAmount(false);
      return;
    }
    try {
      const currencyAmount = CurrencyAmount.fromRawAmount(new Token(config.NETWORK.CHAIN_ID, tokenControl.value.address, decimals as any), JSBI.BigInt(parseUnits(amountControl.value + '', decimals as any)));
      const route = await uniswapRouter.route(
        currencyAmount,
        new Token(config.NETWORK.CHAIN_ID, config.CONTRACTS_ADDRESS.USDC, 6),
        TradeType.EXACT_INPUT
      );
      const quoteAmountOut = parseFloat(route!.quote.toFixed(6));
      const wrContract = getContractByName('Wrapper', provider as any);
      const cgtAmt = await wrContract.quoteCGTAmountReceived(parseUnits(quoteAmountOut + '', 6));
      setCgtReceive(cgtAmt);
      if (cgtAmt?.gte(cgtWrapperBalanceData?.value)) {
        setIsExceedBalance(true);
      } else {
        setIsExceedBalance(false);
      }
      setIsNotSupportedToken(false);
      setIsFetchingCgtAmount(false);
    } catch (error) {
      setIsNotSupportedToken(true);
      setIsFetchingCgtAmount(false);
    }
  }

  const approve = async () => {
    setDisableForm(true);
    const tokenContract = getContractByAddressName(tokenControl.value?.address, 'Token', signer as any);
    const allowance = await tokenContract.allowance(address?.toString(), config.CONTRACTS_ADDRESS.Wrapper);
    if (allowance?.gte(parseUnits(amountControl.value.toString(), decimals))) {
      swap();
    } else {
      setConfirmationStep(0);
      setIsConfirmation(true);
      setIsTryAgain(false);
      setIsSwapCompleted(false);
      setConfirmationMessage('Waiting for transaction confirmation...');
      tokenContract.approve(config.CONTRACTS_ADDRESS.Wrapper, parseUnits(amountControl.value.toString(), decimals))
        .then((transactionResponse: TransactionResponse) => {
          setSnackbar({
            isOpen: true,
            timeOut: 500000,
            type: 'warning',
            message: 'Transaction is processing'
          });
          pollingTransaction(transactionResponse.hash, approveCompleted);
        }, (err: any) => {
          setConfirmationMessage('Something went wrong. Please try again.');
          setIsTryAgain(true);
          setDisableForm(false);
          errorHandler(err, setSnackbar);
        });
    }
  }

  const approveCompleted = (status: number) => {
    if (status === 1) {
      swap();
      setSnackbar({
        isOpen: false,
        type: 'warning',
        message: ''
      } as any);
    } else if (status === 0) {
      setDisableForm(false);
      setSnackbar({
        isOpen: true,
        timeOut: 5000,
        type: 'error',
        message: 'Approve failed'
      });
    }
  }

  const swap = () => {
    setConfirmationStep(1);
    setIsConfirmation(true);
    setIsTryAgain(false);
    setIsSwapCompleted(false);
    setConfirmationMessage('Waiting for transaction confirmation...');
    const wrapperContract = getContractByName('Wrapper', signer as any);
    wrapperContract.swapTokensForCGT(tokenControl.value?.address, 3000, parseUnits(amountControl.value.toString(), decimals), 0, 0)
      .then((transactionResponse: TransactionResponse) => {
        setSnackbar({
          isOpen: true,
          timeOut: 500000,
          type: 'warning',
          message: 'Transaction is processing'
        });
        pollingTransaction(transactionResponse.hash, swapCompleted);
      }, (err: any) => {
        setConfirmationMessage('Something went wrong. Please try again.');
        setIsTryAgain(true);
        setDisableForm(false);
        errorHandler(err, setSnackbar);
      });
  }

  const swapCompleted = (status: number) => {
    if (status === 1) {
      setTimeout(() => {
        setDisableForm(false);
        setIsSwapCompleted(true);
        setConfirmationMessage('Transaction Success!');
        setConfirmationStep(2);
        setAmountControl({
          value: '',
          invalid: true
        });
        setSnackbar({
          isOpen: true,
          timeOut: 5000,
          type: 'success',
          message: 'Transaction Success!'
        });
        getTokenBalance();
      }, 6000)
    } else if (status === 0) {
      setDisableForm(false);
      setSnackbar({
        isOpen: true,
        timeOut: 5000,
        type: 'error',
        message: 'Transaction Failed'
      });
    }
  }

  return (
    <>
      <div className="WidgetContainer">
        <div className="WidgetHeader">
          {isConnected && chain?.id === config.NETWORK.CHAIN_ID ? <ConnectButton /> : <div></div>}
          {/* <IconButton aria-label="theme" color="primary" size="medium">
            <LightModeOutlinedIcon fontSize="medium" />
          </IconButton> */}
        </div>
        <span className="WidgetTitle">Buying CGT with token</span>
        <div className="WidgetContent">
          <div className="WidgetContentSection">
            {isConnected && chain?.id === config.NETWORK.CHAIN_ID ?
              <div className="WidgetBalanceContainer">
                {balance && symbol && !isFetchingTokenBalance ?
                  <>
                    <span className="WidgetBalanceText">Balance:</span>
                    <span className="WidgetBalanceText">{balance.toLocaleString()} {symbol}</span>
                  </> : <Skeleton width={100} height={30} variant="text" />
                }
              </div> : <></>
            }
            <div className="WidgetAmountContainer">
              <Button className="WidgetAmountButton" id="token-dropdown"
                onClick={openTokensDropdown}
                disabled={isFetchingCgtAmount}
              >
                {tokenControl.value ?
                  <>
                    <img width={24} height={24} src={tokenControl.value.logoURI} alt="" />
                    <span className="WidgetAmountButtonText">{tokenControl.value.symbol}</span>
                    <ExpandMoreIcon fontSize="medium" />
                  </> : <Skeleton width={80} height={40} variant="text" />
                }
              </Button>
              <div className="WidgetAmountControl">
                <FormControl required fullWidth>
                  <TextField color="secondary"
                    error={isNotEnoughBalance}
                    value={amountControl.value}
                    disabled={!+balance || disableForm || isFetchingTokenBalance}
                    type="text"
                    placeholder="Amount"
                    InputProps={{
                      endAdornment:
                        <InputAdornment position="end">
                          <Button className="WidgetMaxAmountButton" color="secondary" variant="contained"
                            disabled={!+balance || disableForm || isFetchingTokenBalance}
                            onClick={() => {
                              if (+balance) {
                                setAmountControl({
                                  value: +balance,
                                  invalid: false
                                });
                              } else {
                                setAmountControl({
                                  value: '',
                                  invalid: true
                                });
                              }
                            }}>Max</Button>
                        </InputAdornment>,
                    }}
                    onChange={(e) => {
                      setAmountControl({
                        value: e.target.value,
                        invalid: false
                      });
                    }}
                  />
                </FormControl>
              </div>
            </div>
          </div>
          <div className="WidgetArrowDownContainer">
            <div className="WidgetArrowDown">
              <div className="WidgetArrowDownInner">
                <ArrowDownwardOutlinedIcon />
              </div>
            </div>
          </div>
          <div className="WidgetContentSection">
            {isConnected && chain?.id === config.NETWORK.CHAIN_ID ?
              <div className="WidgetBalanceContainer">
                {cgtBalanceData ?
                  <>
                    <span className="WidgetBalanceText">Balance:</span>
                    <span className="WidgetBalanceText">{(+formatUnits(cgtBalanceData.value, cgtBalanceData.decimals)).toFixed(3).toLocaleString()} {cgtBalanceData.symbol}</span>
                  </> : <Skeleton width={100} height={30} variant="text" />
                }
              </div> : <div className="WidgetBalanceContainer"></div>
            }
            <div className="WidgetAmountContainer">
              <div className="WidgetAmountButton">
                <>
                  <img width={28} height={28} src={cgtImage} alt="Token Icon" />
                  <span className="WidgetAmountButtonText">CGT</span>
                </>
              </div>
              <div className="WidgetAmountControl">
                <div className="WidgetCGTAmount">
                  {isFetchingCgtAmount ?
                    <Skeleton width={120} height={40} variant="text" /> :
                    <span className="WidgetCGTAmountText">{formatUnits(cgtReceive, cgtBalanceData?.decimals)}</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="WidgetActions">
          {isConnected && chain?.id === config.NETWORK.CHAIN_ID ?
            <Button className="WidgetActionsButton" color="secondary" variant="contained"
              disabled={!isFormValid || disableForm || isFetchingCgtAmount || isNotSupportedToken}
              onClick={approve}>
              {disableForm ?
                <CircularProgress color="secondary" size={25} /> : <></>
              }
              Swap
            </Button> :
            <ConnectButton />
          }
          {isNotEnoughBalance ? <span className="WidgetErrorMessage">Token balance is currently insufficient</span> : <></>}
          {isExceedBalance ? <span className="WidgetErrorMessage">{`Please try again with a lower ${tokenControl.value?.symbol} token amount`}</span> : <></>}
          {isNotSupportedToken ? <span className="WidgetErrorMessage">Please try again with another token</span> : <></>}
        </div>
      </div>

      <Menu
        id="token-dropdown"
        anchorEl={tokensDropdownEl}
        open={openTokensDropdownEl}
        onClose={closeTokensDropdown}
        className="WidgetTokenDropdown"
      >
        {tokens.length > 0 && tokens.map((token: IToken) =>
          <MenuItem key={token.address} selected={token.address === tokenControl.value?.address} onClick={() => {
            if (token.address !== tokenControl.value?.address) {
              setTokenControl({
                value: token,
                invalid: false
              });
              setAmountControl({
                value: '',
                invalid: true
              });
            }
            closeTokensDropdown();
          }}>
            <ListItemIcon>
              <img width={24} height={24} src={token.logoURI} alt="" />
            </ListItemIcon>
            <ListItemText>{token?.symbol}</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Dialog
        className="TransactionsConfirmationDialog"
        open={isConfirmation}
        TransitionComponent={Transition}
        keepMounted
      >
        <div className="TransactionsConfirmationContainer">
          <div className="TransactionsConfirmationHeaderContainer">
            <IconButton onClick={() => {
              setIsConfirmation(false);
            }}>
              <CloseIcon color="primary" />
            </IconButton>
          </div>
          <div className="TransactionsConfirmationContentContainer">
            {!isTryAgain && !isSwapCompleted ?
              <CircularProgress color="secondary" size={50} /> : <></>
            }
            {isSwapCompleted ?
              <CheckCircleIcon className="CompletedColor" fontSize="large" /> : <></>
            }
            {isTryAgain ?
              <ErrorIcon className="ErrorColor" fontSize="large" /> : <></>
            }
            <span className="TransactionsConfirmationMessage">{confirmationMessage}</span>
            <Stepper className="TransactionsConfirmationStepper" activeStep={confirmationStep} alternativeLabel>
              <Step>
                <StepLabel>Approve Amount</StepLabel>
              </Step>
              <Step>
                <StepLabel>Swap Token</StepLabel>
              </Step>
            </Stepper>
          </div>
          {isTryAgain ?
            <div className="TransactionsConfirmationActionsContainer">
              <Button color="secondary" variant="contained" onClick={tryAgain}>
                Try again
              </Button>
            </div> : <></>
          }
        </div>
      </Dialog>
      <SnackbarMessage snackbar={snackbar} setSnackbar={setSnackbar} />
    </>
  );
}

export default Widget;
