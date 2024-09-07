// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract VotingToken is ERC20, Ownable, ReentrancyGuard {
    // Address of the faucet, can be used to distribute tokens
    address public faucetAddress;
    uint256 public constant MAX_FAUCET_AMOUNT = 100 * 10 ** 18;
    // Mapping to track the last time an address received tokens
    mapping(address => uint256) public lastFaucetTime;
    // 24-hour time lock in seconds (24 hours = 86400 seconds)
    uint256 public constant TIMELOCK = 86400;

    event TokensMinted(address indexed recipient, uint256 amount);
    event FaucetToAddress(address indexed recipient, uint256 time, uint256 amount);

    constructor(
        address _faucetAddress
    ) ERC20("Voting Token", "VOTETK") Ownable(msg.sender) {
        faucetAddress = _faucetAddress;
    }

    modifier onlyFaucetOrOwner() {
        require(
            msg.sender == faucetAddress || msg.sender == owner(),
            "Caller is not the faucet nor the owner"
        );
        _;
    }

    //Only allow address to be faucetted once every 24 hours
    modifier faucetCooldown(address recipient) {
        require(
            block.timestamp >= lastFaucetTime[recipient] + TIMELOCK,
            "Faucet can only be used once every 24 hours"
        );
        _;
    }

    // Only the owner of the contract can mint new tokens
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function setFaucetAddress(address _faucetAddress) public onlyOwner {
        faucetAddress = _faucetAddress;
    }

    function faucet(
        address recipient,
        uint256 amount
    ) public nonReentrant onlyFaucetOrOwner faucetCooldown(recipient) {
        require(amount <= MAX_FAUCET_AMOUNT, "Faucet limit exceeded");
        _mint(recipient, amount);
        lastFaucetTime[recipient] = block.timestamp;
        emit TokensMinted(recipient, amount);
        emit FaucetToAddress(recipient, block.timestamp, amount);
    }

    function getLastFaucetTime(address account) public view returns (uint256) {
        return lastFaucetTime[account];
    }
}
