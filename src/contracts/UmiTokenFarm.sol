//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./IERC20Mintable.sol";

/**
 * Umi token staking
 */
contract UmiTokenFarm is Context, Ownable, ReentrancyGuard {
    using Address for address;
    using SafeMath for uint256;

    // stake token
    IERC20Mintable public umiToken;

    // The deposit balances of users(store address->(depositId->amount))
    mapping(address => mapping(uint256 => uint256)) public balances;
    // The dates of users' deposits(store address->(depositId->timestamp))
    mapping(address => mapping(uint256 => uint256)) public depositDates;
    // The dates of users' withdrawal requests(address->(depositId->timestamp))
    mapping(address => mapping(uint256 => uint256)) public withdrawalRequestsDates;
    // The last deposit id(store address->last deposit id)
    mapping(address => uint256) public lastDepositIds;
    // The total staked amount
    uint256 public totalStaked;

    // Variable that prevents _deposit method from being called 2 times
    bool private locked;

    // APY (in percentage)
    uint256 public apy = 1e17; // 10%, 0.1 ether
    // one year
    uint256 private constant YEAR = 365 days;

    constructor(address _tokenAddress, uint256 _apy) {
        require(
            _tokenAddress.isContract(),
            "_tokenAddress is not a contract address"
        );
        umiToken = IERC20Mintable(_tokenAddress);
        apy = _apy;
    }

    /**
     * get umi token address
     */
    function getUmiTokenAddress() public view returns (address) {
        return address(umiToken);
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

    function getUmiTokenBalanceByAddress(address addr)
        public
        view
        returns (uint256)
    {
        return umiToken.balanceOf(addr);
    }

    /**
     * This method is used to deposit tokens to a new deposit.
     * It generates a new deposit ID and calls another public "deposit" method. See its description.
     * @param _amount The amount to deposit.
     */
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
        require(_depositId > 0 && _depositId <= lastDepositIds[msg.sender], "wrong deposit id");
        _deposit(msg.sender, _depositId, _amount);
        _setLocked(true);
        require(umiToken.transferFrom(msg.sender, address(this), _amount), "transfer failed");
        _setLocked(false);
    }

    /**
     * @dev Calls internal "_mint" method, increases the user balance, and updates the deposit date.
     * @param _sender The address of the sender.
     * @param _id User's unique deposit ID.
     * @param _amount The amount to deposit.
     */
    function _deposit(address _sender, uint256 _id, uint256 _amount) internal nonReentrant {
        require(_amount > 0, "deposit amount should be more than 0");
        uint256 newBalance = balances[_sender][_id].add(_amount);
        balances[_sender][_id] = newBalance;
        totalStaked = totalStaked.add(_amount);
        depositDates[_sender][_id] = _now();
    }

    /**
     * @dev This method is used to request a withdrawal without a fee.
     * It sets the date of the request.
     *
     * Note: each call updates the date of the request so don't call this method twice during the lock.
     *
     * @param _depositId User's unique deposit ID.
     */
    function requestWithdrawal(uint256 _depositId) external {
        require(_depositId > 0 && _depositId <= lastDepositIds[msg.sender], "wrong deposit id");
        withdrawalRequestsDates[msg.sender][_depositId] = _now();
        // emit WithdrawalRequested(msg.sender, _depositId);
    }

     /**
     * @dev This method is used to make a requested withdrawal.
     * It calls the internal "_withdraw" method and resets the date of the request.
     *
     * Sender should call requestWithdrawal first.
     *
     * @param _depositId User's unique deposit ID.
     * @param _amount The amount to withdraw (0 - to withdraw all).
     */
    function makeRequestedWithdrawal(uint256 _depositId, uint256 _amount) external {
        uint256 requestDate = withdrawalRequestsDates[msg.sender][_depositId];
        require(requestDate > 0, "withdrawal wasn't requested");
        // uint256 timestamp = _now();
        withdrawalRequestsDates[msg.sender][_depositId] = 0;
        _withdraw(msg.sender, _depositId, _amount, false);
    }

    /**
     * @dev Calls internal "_mint" method and then transfers tokens to the sender.
     * @param _sender The address of the sender.
     * @param _id User's unique deposit ID.
     * @param _amount The amount to withdraw (0 - to withdraw all).
     * @param _forced Defines whether to apply fee (true), or not (false).
     */
    function _withdraw(address _sender, uint256 _id, uint256 _amount, bool _forced) internal nonReentrant {
        require(_id > 0 && _id <= lastDepositIds[_sender], "_withdraw wrong deposit id");
        require(balances[_sender][_id] > 0 && balances[_sender][_id] >= _amount, "_withdraw insufficient funds");
        // (uint256 accruedEmission, uint256 timePassed) = _mint(_sender, _id, _amount);
        // uint256 amount = _amount == 0 ? balances[_sender][_id] : _amount.add(accruedEmission);
        uint256 amount = _amount == 0 ? balances[_sender][_id] : _amount;
        balances[_sender][_id] = balances[_sender][_id].sub(amount);
        totalStaked = totalStaked.sub(amount);
        if (balances[_sender][_id] == 0) {
            depositDates[_sender][_id] = 0;
        }
        require(umiToken.transfer(_sender, amount), "transfer failed");
        // emit Withdrawn(_sender, _id, amount, feeValue, balances[_sender][_id], accruedEmission, timePassed);
    }

    /**
     * get total balance of umiToken of address
     *
     * @param _address User's address or Contract's address
     * @return Returns current _address's umiToken balance
     */
    function getTotalBalanceOfUmiTokenByAddress(address _address) public view returns(uint256) {
        require(_address != address(0), "getTotalUmiTokenBalanceByAddress zero address");
        uint256 lastDepositId = getLastDepositIds(_address);
        if (lastDepositId <= 0) {
            return 0;
        }
        uint256 totalBalance;
        mapping(uint256 => uint256) storage depositBalanceMapping = balances[_address];
        for (uint i=1; i<= lastDepositId; i++) {
            totalBalance += depositBalanceMapping[i];
        }
        return totalBalance;
    }

    /**
     * @return Returns current timestamp.
     */
    function _now() internal view returns (uint256) {
        // Note that the timestamp can have a 900-second error:
        // https://github.com/ethereum/wiki/blob/c02254611f218f43cbb07517ca8e5d00fd6d6d75/Block-Protocol-2.0.md
        return block.timestamp; // solium-disable-line security/no-block-members
    }

    /**
     * @dev Sets lock to prevent reentrance.
     */
    function _setLocked(bool _locked) internal {
        locked = _locked;
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

}
