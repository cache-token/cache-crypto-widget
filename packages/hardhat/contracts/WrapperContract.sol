// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';


/// @title CACHE-Widget Wrapper Contract
/// @notice Contract to swap ERC20 tokens for CGT based on Chainlink XAU price feed
/// @dev Contract uses UniswapV3 SwapRouter and Chainlink data feed
contract WrapperContract is Ownable {
    AggregatorV3Interface internal priceFeed;

    // margin in basis points
    uint16 public margin;
    // fees collected in USDC
    uint256 public totalFeesCollected;

    IERC20 public immutable CGT;
    IERC20 public immutable USDC;
    ISwapRouter public immutable swapRouter;

    event SwappedTokensForCGT(
        address sender,
        address tokenIn,
        uint256 CGTAmount   
    );

    /**
     * @dev Set margin, datafeed, CGT, USDC and SwapRouter
     */
    constructor(
        uint16 _margin,
        address _dataFeedAddress,
        IERC20 _CGT,
        IERC20 _USDC,
        ISwapRouter _swapRouter
    ) {
        require(_dataFeedAddress != address(0), "Invalid datafeed address");
        require(address(_CGT) != address(0), "Invalid CGT address");
        require(address(_USDC) != address(0), "Invalid USDC address");
        require(address(_swapRouter) != address(0), "Invalid SwapRouter address");

        margin = _margin;
        priceFeed = AggregatorV3Interface(_dataFeedAddress);
        CGT = _CGT;
        USDC = _USDC;
        swapRouter = _swapRouter;
    }

    /// @notice Sets new value for margin in basis points
    function setMargin(uint16 _margin) external onlyOwner {
        margin = _margin;
    }

    /**
     * @notice Swap ERC20 tokens for CGT
     * @dev Uses UniswapV3 SwapRouter to swap tokens for USDC
     * @param tokenIn address of input ERC20 token
     * @param poolFee fees of the Uniswap pool in basis points
     * @param amountIn input amount of ERC20 tokens
     * @param USDCAmountOutMinimum mininmum output amount of USDC tokens
     * @param sqrtPriceLimitX96 Uniswap pool price change parameter
     */
    function swapTokensForCGT(
        address tokenIn,
        uint24 poolFee,
        uint256 amountIn,
        uint256 USDCAmountOutMinimum,
        uint160 sqrtPriceLimitX96
    ) external {
        require(tokenIn != address(0), "Invalid token address");
        require(amountIn > 0, "Invalid amount");

        TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: address(USDC),
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: USDCAmountOutMinimum,
                sqrtPriceLimitX96: sqrtPriceLimitX96
            });
        uint256 amountOut = swapRouter.exactInputSingle(params);
        totalFeesCollected += (amountOut * margin) / 10000;
        uint256 netUSDCAmount = (amountOut * (10000 - margin)) / 10000;
        uint256 CGTAmount = ((netUSDCAmount * 100) * 10 ** 8) / uint256(getLatestXAU_USDPrice());

        TransferHelper.safeTransfer(address(CGT), msg.sender, CGTAmount);
        emit SwappedTokensForCGT(msg.sender, tokenIn, CGTAmount);
    }

    /// @notice Transfers tokens from the contract to the owner
    function withdrawTokens(address tokenAddress) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        IERC20(tokenAddress).transfer(
            owner(), 
            IERC20(tokenAddress).balanceOf(address(this))
        );
    }

    /**
     * @notice Calculate estimated amount of CGT received
     * @dev Uses Chainlink XAU price feed
     * @param USDC_AmountIn input amount of USDC tokens
     * @return estimated CGT amount out
     */
    function quoteCGTAmountReceived(uint256 USDC_AmountIn) external view returns (uint256) {
        uint256 netUSDCAmount = (USDC_AmountIn * (10000 - margin)) / 10000;
        uint256 CGTAmount = ((netUSDCAmount * 100) * 10 ** 8) / uint256(getLatestXAU_USDPrice());
        return CGTAmount;
    }

    /**
     * @notice Returns the latest XAU-USD price
     * @dev Calls XAU-USD data feed
     * @return XAU-USD price
     */
    function getLatestXAU_USDPrice() public view returns (int256) {
        (
            /*uint80 roundID*/,
            int price,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = priceFeed.latestRoundData();
        return price;
    }
}