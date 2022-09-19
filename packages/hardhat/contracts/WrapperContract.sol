// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';


/// @title CACHE-Widget Wrapper Contract
/// @notice Contract to swap ERC20 tokens for CGT based on Chainlink XAU price feed
/// @dev Contract uses UniswapV3 SwapRouter and Chainlink data feed
contract WrapperContract is Ownable, Pausable {
    uint32 constant GRAM_PER_TROY_OUNCE = 311034768;
    uint64 constant CONVERSION_FACTOR = 10**10;

    AggregatorV3Interface internal priceFeed;

    // margin in basis points
    uint16 public margin;
    // fees collected in stable tokens
    uint256 public totalFeesCollected;

    IERC20 public stable;
    IERC20 public immutable CGT;
    ISwapRouter public immutable swapRouter;

    event SwappedTokensForCGT(
        address sender,
        address tokenIn,
        uint256 CGTAmount   
    );

    /**
     * @dev Set margin, datafeed, CGT, stable and SwapRouter
     */
    constructor(
        uint16 _margin,
        address _dataFeedAddress,
        IERC20 _CGT,
        IERC20 _stable,
        ISwapRouter _swapRouter
    ) {
        require(_dataFeedAddress != address(0), "Invalid datafeed address");
        require(address(_CGT) != address(0), "Invalid CGT address");
        require(address(_stable) != address(0), "Invalid stabletoken address");
        require(address(_swapRouter) != address(0), "Invalid SwapRouter address");

        margin = _margin;
        priceFeed = AggregatorV3Interface(_dataFeedAddress);
        CGT = _CGT;
        stable = _stable;
        swapRouter = _swapRouter;
    }

    /// @notice Sets new value for margin in basis points
    function setMargin(uint16 _margin) external onlyOwner {
        margin = _margin;
    }

    /// @notice Sets new stable token
    function setStable(IERC20 _stable) external onlyOwner {
        stable = _stable;
    }

    /// @notice Pause token swaps
    function pause() external onlyOwner {
        _requireNotPaused();
        _pause();
    }

    /// @notice Unpause token swaps
    function unpause() external onlyOwner {
        _requirePaused();
        _unpause();
    }

    /**
     * @notice Swap ERC20 tokens for CGT
     * @dev Uses UniswapV3 SwapRouter to swap tokens for stabletokens
     * @param tokenIn address of input ERC20 token
     * @param poolFee fees of the Uniswap pool in basis points
     * @param amountIn input amount of ERC20 tokens
     * @param stableAmountOutMinimum mininmum output amount of stable tokens
     * @param sqrtPriceLimitX96 Uniswap pool price change parameter
     */
    function swapTokensForCGT(
        address tokenIn,
        uint24 poolFee,
        uint256 amountIn,
        uint256 stableAmountOutMinimum,
        uint160 sqrtPriceLimitX96
    ) 
        external 
        whenNotPaused
    {
        require(tokenIn != address(0), "Invalid token address");
        require(amountIn > 0, "Invalid amount");

        TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: address(stable),
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: stableAmountOutMinimum,
                sqrtPriceLimitX96: sqrtPriceLimitX96
            });
        uint256 amountOut = swapRouter.exactInputSingle(params);
        totalFeesCollected += (amountOut * margin) / 10000;
        uint256 netStableTokenAmount = (amountOut * (10000 - margin)) / 10000;
        // Multiplication by a factor of 10000000 in order to peform division by 311034768
        uint256 pricePerGram = (uint256(getLatestXAU_USDPrice()) * 10**7) / GRAM_PER_TROY_OUNCE;
        // Decimal conversion of amount in stabletokens to equivalent CGT amount as per the price
        uint256 CGTAmount = (netStableTokenAmount * CONVERSION_FACTOR) / pricePerGram;

        TransferHelper.safeTransfer(address(CGT), msg.sender, CGTAmount);
        emit SwappedTokensForCGT(msg.sender, tokenIn, CGTAmount);
    }

    /// @notice Transfers tokens from the contract to the owner
    function withdrawTokens(IERC20 token) external onlyOwner {
        require(address(token) != address(0), "Invalid token address");
        token.transfer(
            owner(), 
            token.balanceOf(address(this))
        );
    }

    /**
     * @notice Calculate estimated amount of CGT received
     * @dev Uses Chainlink XAU price feed
     * @param stableAmountIn input amount of stable tokens
     * @return estimated CGT amount out
     */
    function quoteCGTAmountReceived(uint256 stableAmountIn) external view returns (uint256) {
        uint256 netStableTokenAmount = (stableAmountIn * (10000 - margin)) / 10000;
        uint256 pricePerGram = (uint256(getLatestXAU_USDPrice()) * 10**7) / GRAM_PER_TROY_OUNCE;
        uint256 CGTAmount = (netStableTokenAmount * CONVERSION_FACTOR) / pricePerGram;
        return CGTAmount;
    }

    /**
     * @notice Returns the latest XAU-USD price
     * @dev Calls XAU-USD data feed
     * @return XAU-USD price per troy oz
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