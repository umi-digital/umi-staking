//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/**
 * Umi token staking
 */
contract UmiTokenFarm is Context, Ownable, ReentrancyGuard {

    using Address for address;
    using SafeMath for uint256;

    // stake token
    ERC20 public umiToken;

    // The deposit balances of users(store address->(depositId->amount))
    mapping(address => mapping(uint256 => uint256)) public balances;
    // The dates of users' deposits(store address->(depositId->timestamp))
    mapping(address => mapping(uint256 => uint256)) public depositDates;
    // The dates of users' withdrawal requests
    mapping(address => mapping(uint256 => uint256))
        public withdrawalRequestsDates;
    // The last deposit id(store address->last deposit id)
    mapping(address => uint256) public lastDepositIds;
    // The total staked amount
    uint256 public totalStaked;

    // APY (in percentage)
    uint256 public apy = 1e17; // 10%, 0.1 ether
    // one year
    uint256 private constant YEAR = 365 days;

    constructor(address _tokenAddress, uint256 _apy) {
        require(
            _tokenAddress.isContract(),
            "_tokenAddress is not a contract address"
        );
        umiToken = ERC20(_tokenAddress);
        apy = _apy;
    }

    /**
     * get umi token address
     */
    function getUmiTokenAddress() public view returns (address) {
        return address(umiToken);
    }

    /**
     * get umi token name
     */
    function getUmiTokenName() public view returns (string memory) {
        return umiToken.name();
    }

    /**
     * get umi token symbol
     */
    function getUmiTokenSymbol() public view returns (string memory) {
        return umiToken.symbol();
    }

    function getUmiTokenTotalSupply() public view returns (uint256) {
        return umiToken.totalSupply();
    }

    /**
     * get apy
     */
    function getApy() public view returns (uint256) {
        return apy * 1e17;
    }

    function setLastDepositIds() public returns (uint256) {
        return ++lastDepositIds[msg.sender];
    }

    function getLastDepositIds(address _address) public view returns (uint256) {
        return lastDepositIds[_address];
    }

    function getBalanceOfAccount(address account)
        public
        view
        returns (uint256)
    {
        return umiToken.balanceOf(account);
    }

    function deposit(uint256 _amount) public {
        deposit(++lastDepositIds[msg.sender], _amount);
    }

    /**
     * @dev This method is used to deposit tokens to the deposit opened before.
     * It calls the internal "_deposit" method and transfers tokens from sender to contract.
     * Sender must approve tokens first.
     *
     * Instead this, user can use the simple "transfer" method of STAKE token contract to make a deposit.
     * Sender's approval is not needed in this case.
     *
     * Note: each call updates the deposit date so be careful if you want to make a long staking.
     *
     * @param _depositId User's unique deposit ID.
     * @param _amount The amount to deposit.
     */
    function deposit(uint256 _depositId, uint256 _amount) public {
        require(
            _depositId > 0 && _depositId <= lastDepositIds[msg.sender],
            "wrong deposit id"
        );
        _deposit(msg.sender, _depositId, _amount);
        require(
            umiToken.transferFrom(msg.sender, address(this), _amount),
            "transfer failed"
        );
    }

    /**
     * @dev Calls internal "_mint" method, increases the user balance, and updates the deposit date.
     * @param _sender The address of the sender.
     * @param _id User's unique deposit ID.
     * @param _amount The amount to deposit.
     */
    function _deposit(
        address _sender,
        uint256 _id,
        uint256 _amount
    ) internal nonReentrant {
        require(_amount > 0, "deposit amount should be more than 0");
        uint256 newBalance = balances[_sender][_id].add(_amount);
        balances[_sender][_id] = newBalance;
        totalStaked = totalStaked.add(_amount);
        depositDates[_sender][_id] = _now();
    }

    /**
     * @return Returns current timestamp.
     */
    function _now() internal view returns (uint256) {
        // Note that the timestamp can have a 900-second error:
        // https://github.com/ethereum/wiki/blob/c02254611f218f43cbb07517ca8e5d00fd6d6d75/Block-Protocol-2.0.md
        return block.timestamp; // solium-disable-line security/no-block-members
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getTotalStaked() public view returns(uint256) {
        return totalStaked;
    }

    function approve(address spender, uint256 _amount) public {
        umiToken.approve(spender, _amount);
    }

}
