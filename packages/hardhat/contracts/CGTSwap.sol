// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CGTSwap is Ownable, Pausable, ReentrancyGuard {
    AggregatorV3Interface internal priceFeed;
    // Stablecoin has 6 decimal places whereas CGT has 8
    uint256 private constant DECIMAL_FACTOR = 10 ** (8-6); 

    // margin in basis points
    uint16 public margin;
    // fees collected in stablecoin
    uint256 public totalFeeCollected;

    IERC20 public stable;
    IERC20 public immutable CGT;

    event SwappedCGTForStable(
        address sender,
        address stable,
        uint256 CGTAmount   
    );

    constructor(
        uint16 _margin,
        address _dataFeedAddress,
        IERC20 _CGT,
        IERC20 _stable
    ) {
        require(_dataFeedAddress != address(0), "Invalid datafeed address");
        require(address(_CGT) != address(0), "Invalid CGT address");
        require(address(_stable) != address(0), "Invalid stabletoken address");

        margin = _margin;
        priceFeed = AggregatorV3Interface(_dataFeedAddress);
        CGT = _CGT;
        stable = _stable;
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
     * @notice Swap CGT for stablecoin
     * @param amountIn input amount of CGT
     */
    function swap(uint256 amountIn) 
        external 
        whenNotPaused
        nonReentrant
    {
        require(amountIn > 0, "Invalid amount");
        _swap(amountIn);
    }

    /// @notice Transfers fee collected from the contract to the owner
    function withdrawFeeCollected() external onlyOwner {
        TransferHelper.safeTransfer(
            address(stable), 
            owner(),
            totalFeeCollected
        );
        totalFeeCollected = 0;
    }

    /**
     * @notice Transfers tokens from the contract to the owner
     * @param token address of token to withdraw
     * @param amount amount of tokens to withdraw
     */
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token address");
        TransferHelper.safeTransfer(
            token, 
            owner(),
            amount
        );
    }

    /**
     * @notice Calculate estimated amount of stablecoin received
     * @dev Uses Chainlink XAU price feed
     * @param amountIn input amount of CGT
     * @return estimated stablecoin amount out
     */
    function quoteStablecoinAmount(uint256 amountIn) public view returns (uint256) {
        uint256 stableAmount = (amountIn * uint256(getLatestXAU_USDPrice()) * 3215075) / (10**8 * 10**8);
        uint256 adjustedAmount = (stableAmount / DECIMAL_FACTOR) + round(stableAmount, DECIMAL_FACTOR);
        uint256 netStablecoinAmount = (adjustedAmount * (10000 - margin)) / 10000;
        return netStablecoinAmount;
    }

    /**
     * @notice View stablecoin balance of the contract
     * @return stablecoin balance
     */
    function getStablecoinBalance() public view returns (uint256) {
        return stable.balanceOf(address(this));
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

    function _swap(uint256 amountIn) private {
        TransferHelper.safeTransferFrom(address(CGT), msg.sender, address(this), amountIn);
        uint256 amountOut = quoteStablecoinAmount(amountIn);
        totalFeeCollected += (amountOut *  margin) / (10000 - margin);

        require(amountOut <= stable.balanceOf(address(this)), "Insufficient stablecoin available");
        TransferHelper.safeTransfer(address(stable), msg.sender, amountOut);
        emit SwappedCGTForStable(msg.sender, address(stable), amountIn);
    }

    /// @dev Rounds the token a and returns 1 if it is to be rounded up
    /// @param a the token amount, m the number of decimals to round at
    function round(uint256 a, uint256 m) private pure returns (uint) {
        if(a % m >= m/2)
            return 1;
        return 0;
    }
}