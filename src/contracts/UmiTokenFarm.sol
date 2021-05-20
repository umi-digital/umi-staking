//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "./IERC20Mintable.sol";
import "./Calculator.sol";


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
    uint256 public APY = 12; // stand for 12%
    // one day
    uint256 private constant ONE_DAY = 1 days;
    // one year
    uint256 private constant YEAR = 365 days;

    constructor(address _tokenAddress, uint256 _APY) {
        require(_tokenAddress.isContract(), "_tokenAddress is not a contract address");
        umiToken = IERC20Mintable(_tokenAddress);
        APY = _APY;
    }

    /**
     * get umi token address
     * @return Return umi token's address
     */
    function getUmiTokenAddress() public view returns (address) {
        return address(umiToken);
    }

    /**
    * get umi token total supply
    * @return Return umi token total supply
    */
    function getUmiTokenTotalSupply() public view returns (uint256) {
        return umiToken.totalSupply();
    }

    /**
     * Only owner can set APY
     * If you want to set apy 12%, you just set APY=12
     * @param _APY Annual interest rate
     */
    function setAPY(uint256 _APY) public onlyOwner {
        APY = _APY;
    }

    /**
     * Get umi token balance by address
     * @param addr The address of the account that needs to check the balance
     * @return Return balance of umi token
     */
    function getUmiTokenBalance(address addr) public view returns (uint256) {
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
     * This method is used to deposit tokens to the deposit opened before.
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
    function deposit(uint256 _depositId, uint256 _amount) internal {
        require(_depositId > 0 && _depositId <= lastDepositIds[msg.sender], "wrong deposit id");
        _deposit(msg.sender, _depositId, _amount);
        _setLocked(true);
        require(umiToken.transferFrom(msg.sender, address(this), _amount), "transfer failed");
        _setLocked(false);
    }

    /**
     * @dev Increases the user balance, and updates the deposit date.
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
        // send event
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
        withdrawalRequestsDates[msg.sender][_depositId] = 0;
        _withdraw(msg.sender, _depositId, _amount);
    }

    /**
     * @dev Calls internal "_mint" method and then transfers tokens to the sender.
     * @param _sender The address of the sender.
     * @param _id User's unique deposit ID.
     * @param _amount The amount to withdraw (0 - to withdraw all).
     */
    function _withdraw(address _sender, uint256 _id, uint256 _amount) internal nonReentrant {
        require(_id > 0 && _id <= lastDepositIds[_sender], "_withdraw wrong deposit id");
        require(balances[_sender][_id] > 0 && balances[_sender][_id] >= _amount, "_withdraw insufficient funds");
        // calculate interest
        (uint256 totalWithInterest, uint256 timePassed) = calculateInterestAndTimePassed(_sender, _id, _amount);
        require(totalWithInterest > 0 && timePassed > 0, "_withdraw totalWithInterest<=0 or timePassed<=0");
        uint256 amount = _amount == 0 ? balances[_sender][_id] : _amount;
        balances[_sender][_id] = balances[_sender][_id].sub(amount);
        totalStaked = totalStaked.sub(amount);
        if (balances[_sender][_id] == 0) {
            depositDates[_sender][_id] = 0;
        }
        require(umiToken.transfer(_sender, totalWithInterest), "transfer failed");
        // emit Withdrawn(_sender, _id, amount, feeValue, balances[_sender][_id], accruedEmission, timePassed);
    }

    /**
     * calculate interest and time passed
     * @param _user User's address.
     * @param _id User's unique deposit ID.
     * @param _amount Amount based on which interest is calculated. When 0, current deposit balance is used.
     * @return Return total with interest and time passed
     */
    function calculateInterestAndTimePassed(address _user, uint256 _id, uint256 _amount) internal view returns(uint256, uint256) {
        uint256 currentBalance = balances[_user][_id];
        uint256 amount = _amount == 0 ? currentBalance : _amount;
        uint256 depositDate = depositDates[_user][_id];
        if (amount == 0 || depositDate == 0) {
            return (0, 0);
        }
        uint256 timePassed = _now().sub(depositDate);
        if (timePassed < ONE_DAY) {
            // if timePassed less than one day, interest will be 0
            return (amount, timePassed);
        }
        // timePassed bigger than one day case
        uint256 _days = timePassed.div(ONE_DAY);
        int256 amountInt256 = SafeCast.toInt256(amount);
        int128 amountInt128 = SafeCast.toInt128(amountInt256);
        int128 tempTotalWithInterest =  Calculator.calculator(amountInt128, _days, APY, 100000);
        uint256 totalWithInterest = SafeCast.toUint256(tempTotalWithInterest);
        totalWithInterest = totalWithInterest.div(100000);
        return (totalWithInterest, timePassed);
    }

    function testCalculateInterestAndTimePassed(uint256 _amount) public view returns(uint256) {
        // uint256 currentBalance = 0.000500000000000001 ether;
        uint256 currentBalance = 1000;
        // uint256 currentBalance = 100000000;
        // uint256 currentBalance = 1.99 ether;
        uint256 amount = _amount == 0 ? currentBalance : _amount;
        uint256 depositDate = _now() - (365 days - 1000);
        if (amount == 0 || depositDate == 0) {
            return _amount;
        }
        uint256 timePassed = _now().sub(depositDate);
        if (timePassed < ONE_DAY) {
            // if timePassed less than one day, interest will be 0
            return amount;
        }
        // timePassed bigger than one day case
        uint256 _days = timePassed.div(ONE_DAY);
        // safe cast uint256 to int 256
        int256 amountInt256 = SafeCast.toInt256(amount);
        // safe cast int256 to int128
        int128 amountInt128 = SafeCast.toInt128(amountInt256);
        int128 tempTotalWithInterest =  Calculator.calculator(amountInt128, _days, APY, 100000);
        uint256 totalWithInterest = SafeCast.toUint256(tempTotalWithInterest);
        totalWithInterest = totalWithInterest.div(100000);
        return totalWithInterest;
    }

    /**
     * get total balance of umiToken of address
     *
     * @param _address User's address or Contract's address
     * @return Returns current _address's umiToken balance
     */
    function getTotalBalanceOfUmiTokenByAddress(address _address)
        public
        view
        returns (uint256)
    {
        require(
            _address != address(0),
            "getTotalBalanceOfUmiTokenByAddress zero address"
        );
        uint256 lastDepositId = lastDepositIds[_address];
        if (lastDepositId <= 0) {
            return 0;
        }
        uint256 totalBalance;
        mapping(uint256 => uint256) storage depositBalanceMapping = balances[_address];
        for (uint256 i = 1; i <= lastDepositId; i++) {
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

    function testCalcaulator() public pure returns(int128) {
        int128 res = Calculator.calculator(100, 365, 12, 100000);
        return res;
    }

}
