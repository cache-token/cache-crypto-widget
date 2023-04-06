import { useEffect, useState } from "react";

import {
  Button, CircularProgress, Dialog, FormControl, IconButton, InputAdornment, Skeleton, Step, StepLabel, Stepper, TextField
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useContractRead, useContractWrite, useNetwork, useSigner } from "wagmi";
import { formatUnits, parseUnits } from "ethers/lib/utils";

import { IFormControl } from "../models/Form";
import { getAppConfig } from "../helpers/Utilities";
import { IAppConfig } from "../models/Base";
import { Transition } from "./Transition";
import SnackbarMessage from "./Snackbar";
import { ISnackbarConfig } from "../models/Material";
import { getABI, getContractByName } from "../helpers/Contract";
import { errorHandler, pollingTransaction } from "../helpers/Wallet";

const Widget = () => {
  const config: IAppConfig = getAppConfig();

  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { data: signer } = useSigner();

  const [isNotEnoughBalance, setIsNotEnoughBalance] = useState<boolean>(false);
  const [isConfirmation, setIsConfirmation] = useState<boolean>(false);
  const [isTryAgain, setIsTryAgain] = useState<boolean>(false);
  const [isSwapCompleted, setIsSwapCompleted] = useState<boolean>(false);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [disableForm, setDisableForm] = useState<boolean>(false);
  const [confirmationStep, setConfirmationStep] = useState<number>(0);
  const [confirmationMessage, setConfirmationMessage] = useState<string>('');
  const [usdcReceive, setUsdcReceive] = useState<number>();
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const [snackbar, setSnackbar] = useState<ISnackbarConfig>({
    isOpen: false
  } as ISnackbarConfig);
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

  const { data: cgtAllowance } = useContractRead({
    addressOrName: config.CONTRACTS_ADDRESS.CGT,
    contractInterface: getABI('Token'),
    functionName: 'allowance',
    chainId: config.NETWORK.CHAIN_ID,
    args: [
      address,
      config.CONTRACTS_ADDRESS.CGTSwap
    ],
    watch: true
  });

  const {
    data: approveCgtResult, error: approveCgtError, write: approveCgtWrite
  } = useContractWrite({
    addressOrName: config.CONTRACTS_ADDRESS.CGT,
    contractInterface: getABI('Token'),
    functionName: 'approve',
    mode: 'recklesslyUnprepared'
  });

  const { data: usdcBalanceData } = useBalance({
    addressOrName: address?.toString(),
    token: config.CONTRACTS_ADDRESS.USDC,
    chainId: config.NETWORK.CHAIN_ID,
    watch: true
  });

  const {
    data: swapResult, error: swapError, write: swapWrite
  } = useContractWrite({
    addressOrName: config.CONTRACTS_ADDRESS.CGTSwap,
    contractInterface: getABI('CGTSwap'),
    functionName: 'swap',
    mode: 'recklesslyUnprepared'
  });

  const getPrice = async () => {
    const cgtSwapContract = getContractByName('CGTSwap', signer as any);
    const usdcAmount = await cgtSwapContract.quoteStablecoinAmount(parseUnits(amountControl.value, cgtBalanceData?.decimals));
    setUsdcReceive(+formatUnits(usdcAmount, usdcBalanceData?.decimals));
    setIsFetching(false);
  }

  useEffect(() => {
    if (+amountControl.value) {
      setIsFetching(true);
      const timeOutId = setTimeout(() => getPrice(), 500);
      return () => clearTimeout(timeOutId);
    } else {
      setUsdcReceive(0);
      setIsFetching(false);
    }
    // eslint-disable-next-line
  }, [amountControl]);

  useEffect(() => {
    if (!isNotEnoughBalance && !amountControl.invalid && +amountControl.value && +amountControl.value > 0) {
      setIsFormValid(true);
    } else {
      setIsFormValid(false);
    }
  }, [amountControl, isNotEnoughBalance]);

  useEffect(() => {
    if (chain?.id === config.NETWORK.CHAIN_ID) {
      if (cgtBalanceData && amountControl.value && +amountControl.value > +formatUnits(cgtBalanceData.value, cgtBalanceData.decimals)) {
        setIsNotEnoughBalance(true);
      } else {
        setIsNotEnoughBalance(false);
      }
    }
    // eslint-disable-next-line
  }, [amountControl, chain, cgtBalanceData]);

  useEffect(() => {
    if (approveCgtResult?.hash) {
      setSnackbar({
        isOpen: true,
        timeOut: 500000,
        type: 'warning',
        message: 'Transaction is processing'
      });
      pollingTransaction(approveCgtResult.hash, approveCGTCompleted);
    }
    // eslint-disable-next-line
  }, [approveCgtResult]);

  useEffect(() => {
    if (approveCgtError) {
      setConfirmationMessage('Something went wrong. Please try again.');
      setIsTryAgain(true);
      setDisableForm(false);
      errorHandler(approveCgtError, setSnackbar);
    }
  }, [approveCgtError]);

  useEffect(() => {
    if (swapResult?.hash) {
      setSnackbar({
        isOpen: true,
        timeOut: 500000,
        type: 'warning',
        message: 'Transaction is processing'
      });
      pollingTransaction(swapResult.hash, swapCompleted);
    }
  }, [swapResult]);

  useEffect(() => {
    if (swapError) {
      setConfirmationMessage('Something went wrong. Please try again.');
      setIsTryAgain(true);
      setDisableForm(false);
      errorHandler(swapError, setSnackbar);
    }
  }, [swapError]);

  const approveCGT = () => {
    setDisableForm(true);
    if (cgtAllowance?.gte(parseUnits(amountControl.value.toString(), cgtBalanceData?.decimals))) {
      swap();
    } else {
      setConfirmationStep(0);
      setIsConfirmation(true);
      setIsTryAgain(false);
      setIsSwapCompleted(false);
      setConfirmationMessage('Waiting for transaction confirmation...');
      approveCgtWrite?.({
        recklesslySetUnpreparedArgs: [
          config.CONTRACTS_ADDRESS.CGTSwap,
          parseUnits(amountControl.value.toString(), cgtBalanceData?.decimals),
          {
            gasLimit: 100000
          }
        ]
      });
    }
  }

  const approveCGTCompleted = (status: number) => {
    if (status === 1) {
      setTimeout(() => {
        swap();
      }, 5000);
      setSnackbar({
        isOpen: false,
        type: 'warning',
        message: ''
      } as any);
    } else if (status === 0) {
      setConfirmationMessage('Something went wrong. Please try again.');
      setIsTryAgain(true);
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
    swapWrite?.({
      recklesslySetUnpreparedArgs: [
        parseUnits(amountControl.value, cgtBalanceData?.decimals),
        {
          gasLimit: 300000
        }
      ]
    });
  }

  const swapCompleted = (status: number) => {
    if (status === 1) {
      setIsSwapCompleted(true);
      setConfirmationMessage('Transaction successfully.');
      setConfirmationStep(2);
      setSnackbar({
        isOpen: true,
        timeOut: 5000,
        type: 'success',
        message: 'Transaction successfully.'
      });
      setAmountControl({
        value: '',
        invalid: true
      });
      setDisableForm(false);
    } else if (status === 0) {
      setConfirmationMessage('Something went wrong. Please try again.');
      setIsTryAgain(true);
      setDisableForm(false);
      setSnackbar({
        isOpen: true,
        timeOut: 5000,
        type: 'error',
        message: 'Transaction Failed'
      });
    }
  }

  const tryAgain = () => {
    if (confirmationStep === 0) {
      approveCGT();
      setDisableForm(true);
    } else if (confirmationStep === 1) {
      swap();
      setDisableForm(true);
    }
  }

  return (
    <>
      <div className="WidgetContainer">
        <div className="WidgetHeader">
          {isConnected && chain?.id === config.NETWORK.CHAIN_ID ? <ConnectButton /> : <div></div>}
        </div>
        <span className="WidgetTitle">Swap CGT for USDC</span>
        <div className="WidgetContent">
          <div className="WidgetContentSection">
            {isConnected && chain?.id === config.NETWORK.CHAIN_ID ?
              <div className="WidgetBalanceContainer">
                {cgtBalanceData ?
                  <>
                    <span className="WidgetBalanceText">Balance:</span>
                    <span className="WidgetBalanceText">{`${formatUnits(cgtBalanceData.value, cgtBalanceData.decimals)} ${cgtBalanceData.symbol}`}</span>
                  </> : <Skeleton width={100} height={30} variant="text" />
                }
              </div> : <></>
            }
            <div className="WidgetAmountContainer">
              <div className="WidgetAmountButton">
                <>
                  <img width={28} height={28} src="cache-gold-icon.png" alt="Token Icon" />
                  <span className="WidgetAmountButtonText">CGT</span>
                </>
              </div>
              <div className="WidgetAmountControl">
                <FormControl required fullWidth>
                  <TextField color="secondary"
                    error={isNotEnoughBalance}
                    value={amountControl.value}
                    disabled={(cgtBalanceData && !+cgtBalanceData?.value) || disableForm || !isConnected || chain?.unsupported}
                    type="text"
                    placeholder="Amount"
                    InputProps={{
                      endAdornment:
                        <InputAdornment position="end">
                          <Button className="WidgetMaxAmountButton" color="secondary" variant="contained"
                            disabled={(cgtBalanceData && !+cgtBalanceData?.value) || disableForm || !isConnected || chain?.unsupported}
                            onClick={() => {
                              if (cgtBalanceData && +cgtBalanceData?.value) {
                                setAmountControl({
                                  value: formatUnits(cgtBalanceData?.value, cgtBalanceData.decimals),
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
                {usdcBalanceData ?
                  <>
                    <span className="WidgetBalanceText">Balance:</span>
                    <span className="WidgetBalanceText">{`${formatUnits(usdcBalanceData.value, usdcBalanceData.decimals)} ${usdcBalanceData.symbol}`}</span>
                  </> : <Skeleton width={100} height={30} variant="text" />
                }
              </div> : <div className="WidgetBalanceContainer"></div>
            }
            <div className="WidgetAmountContainer">
              <div className="WidgetAmountButton">
                <>
                  <img width={28} height={28} src="usd-icon.png" alt="Token Icon" />
                  <span className="WidgetAmountButtonText">USDC</span>
                </>
              </div>
              <div className="WidgetAmountControl">
                <div className="WidgetCGTAmount">
                {!isFetching ?
                  <span className="WidgetCGTAmountText">{usdcReceive}</span> : <Skeleton width={100} height={30} variant="text" />
                }
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="WidgetActions">
          {isConnected && chain?.id === config.NETWORK.CHAIN_ID ?
            <Button className="WidgetActionsButton" color="secondary" variant="contained"
              disabled={!isFormValid || disableForm || isFetching}
              onClick={approveCGT}>
              {disableForm ?
                <CircularProgress color="secondary" size={25} /> : <></>
              }
              Swap
            </Button> :
            <ConnectButton />
          }
          {isNotEnoughBalance ? <span className="WidgetErrorMessage">Token balance is currently insufficient</span> : <></>}
        </div>
      </div>

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
