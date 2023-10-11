// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    // Mapping to store the last minting time for each user
    mapping(address => uint256) private lastMintingTime;
    uint256 minBalance = 150 * 10 ** 18;
    uint256 mintAmount = 150 * 10 ** 18;

    // Time duration of 24 hours
    uint256 private constant DAY_IN_SECONDS = 86400;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) public {
        // Check if 24 hours have passed since the last minting
        require(amount <= mintAmount, "maximum mint amount exceeded");
        require(
            block.timestamp >= lastMintingTime[to] + DAY_IN_SECONDS,
            "Can only mint once per day"
        );
        require(balanceOf(to) < minBalance, "You've the sufficient balance");

        // Mint tokens
        _mint(to, amount);

        // Update last minting time
        lastMintingTime[to] = block.timestamp;
    }

    function setMintAmount(uint256 _newamount) public onlyOwner {
        mintAmount = _newamount;
    }

    function getLastMintingTime(address user) public view returns (uint256) {
        return lastMintingTime[user];
    }

    function getMintAmount() public view returns (uint256) {
        return mintAmount;
    }
}
