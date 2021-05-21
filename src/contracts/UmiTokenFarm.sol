//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "./ERC20Interface.sol";
import "./Calculator.sol";

/**
 * Umi token farm
 *
 * 1st. Staking smart contract where users can connect via metamask and stake $UMI tokens
 * 2nd. Rewards are paid in more $UMI
 * 3rd. Rewards can be collected anytime
 */
contract UmiTokenFarm is Context, Ownable, ReentrancyGuard {
    using Address for address;
    using SafeMath for uint256;

    /**
     * @dev Emitted when a new APY value is set.
     * @param value A new APY value.
     * @param sender The owner address at the moment of APY changing.
     */
    event ApySet(uint256 value, address sender);

    // stake token
    ERC20Interface public umiToken;

    // The deposit balances of users(store address->(depositId->amount))
    mapping(address => mapping(uint256 => uint256)) public balances;
    // The dates of users' deposits(store address->(depositId->timestamp))
    mapping(address => mapping(uint256 => uint256)) public depositDates;
    // The dates of users' withdrawal requests(address->(depositId->timestamp))
    mapping(address => mapping(uint256 => uint256))
        public withdrawalRequestsDates;
    // The last deposit id(store address->last deposit id)
    mapping(address => uint256) public lastDepositIds;
    // The total staked amount
    uint256 public totalStaked;

    // Variable that prevents _deposit method from being called 2 times
    bool private locked;

    // default annual percentage yield is 12% (in percentage), only contract owner can modify it
    uint256 public APY = 12; // stand for 12%
    // one day seconds
    uint256 private constant ONE_DAY = 1 days;
    // one year seconds
    uint256 private constant YEAR = 365 days;

    constructor(address _tokenAddress) {
        require(_tokenAddress.isContract(), "_tokenAddress is not a contract address");
        umiToken = ERC20Interface(_tokenAddress);
    }

    /**
     * Only owner can set APY
     *
     * Note: If you want to set apy 12%, just pass 12
     *
     * @param _APY annual percentage yield
     */
    function setAPY(uint256 _APY) public onlyOwner {
        APY = _APY;
        emit ApySet(APY, msg.sender);
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
     * It generates a new deposit ID and calls another internal "deposit" method. See its description.
     * @param _amount The amount to deposit.
     */
    function deposit(uint256 _amount) public {
        deposit(++lastDepositIds[msg.sender], _amount);
    }

    /**
     * This method is used to deposit tokens.
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
        require(
            _depositId > 0 && _depositId <= lastDepositIds[msg.sender],
            "wrong deposit id"
        );
        _deposit(msg.sender, _depositId, _amount);
        _setLocked(true);
        require(
            umiToken.transferFrom(msg.sender, address(this), _amount),
            "transfer failed"
        );
        _setLocked(false);
    }

    /**
     * @dev Increases the user balance, and updates the deposit date.
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
        // uint256 newBalance = balances[_sender][_id].add(_amount);
        balances[_sender][_id] = _amount;
        totalStaked = totalStaked.add(_amount);
        depositDates[_sender][_id] = _now();
        // send event
    }

    /**
     * This method is used to request a withdrawal.
     * It sets the date of the request.
     *
     * Note: each call updates the date of the request so don't call this method twice during the lock.
     *
     * @param _depositId User's unique deposit ID.
     */
    function requestWithdrawal(uint256 _depositId) external {
        require(_depositId > 0 && _depositId <= lastDepositIds[msg.sender], "requestWithdrawal with wrong deposit id");
        withdrawalRequestsDates[msg.sender][_depositId] = _now();
        // emit WithdrawalRequested(msg.sender, _depositId);
    }

    /**
     * This method is used to make a requested withdrawal.
     * It calls the internal "_withdraw" method and resets the date of the request.
     *
     * Note: Sender should call requestWithdrawal first.
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
     * Calls internal "calculateInterestAndTimePassed" method and then transfers tokens to the sender.
     * @param _sender The address of the sender.
     * @param _id User's unique deposit ID.
     * @param _amount The amount to withdraw (0 - to withdraw all).
     */
    function _withdraw(
        address _sender,
        uint256 _id,
        uint256 _amount
    ) internal nonReentrant {
        require(
            _id > 0 && _id <= lastDepositIds[_sender],
            "_withdraw wrong deposit id"
        );
        require(
            balances[_sender][_id] > 0 && balances[_sender][_id] >= _amount,
            "_withdraw insufficient funds"
        );
        // calculate interest
        (uint256 totalWithInterest, uint256 timePassed) =
            calculateInterestAndTimePassed(_sender, _id, _amount);
        require(
            totalWithInterest > 0 && timePassed > 0,
            "_withdraw totalWithInterest<=0 or timePassed<=0"
        );
        uint256 amount = _amount == 0 ? balances[_sender][_id] : _amount;
        balances[_sender][_id] = balances[_sender][_id].sub(amount);
        totalStaked = totalStaked.sub(amount);
        if (balances[_sender][_id] == 0) {
            depositDates[_sender][_id] = 0;
        }
        require(
            umiToken.transfer(_sender, totalWithInterest),
            "transfer failed"
        );
        // emit Withdrawn(_sender, _id, amount, feeValue, balances[_sender][_id], accruedEmission, timePassed);
    }

    /**
     * calculate interest and time passed
     * @param _user User's address.
     * @param _id User's unique deposit ID.
     * @param _amount Amount based on which interest is calculated. When 0, current deposit balance is used.
     * @return Return total with interest and time passed
     */
    function calculateInterestAndTimePassed(
        address _user,
        uint256 _id,
        uint256 _amount
    ) public view returns (uint256, uint256) {
        uint256 currentBalance = balances[_user][_id];
        uint256 amount = _amount == 0 ? currentBalance : _amount;
        uint256 depositDate = depositDates[_user][_id];
        if (amount == 0 || depositDate == 0) {
            return (0, 0);
        }
        // seconds
        uint256 timePassed = _now().sub(depositDate);
        if (timePassed < ONE_DAY) {
            // if timePassed less than one day, rewards will be 0
            return (amount, timePassed);
        }
        // timePassed bigger than one day case, periods for calculating interest
        uint256 _days = timePassed.div(ONE_DAY);
        uint256 totalWithInterest = Calculator.calculator(amount, _days, APY);
        return (totalWithInterest, timePassed);
    }

    function testCalculateInterestAndTimePassed(uint256 _amount)
        public
        view
        returns (uint256)
    {
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
        uint256 totalWithInterest = Calculator.calculator(amount, APY, _days);

        return totalWithInterest;
    }

    /**
     * Get total balance of user.
     *
     * Note: Iter balances mapping to get total balance of address
     *
     * @param _address User's address or Contract's address
     * @return Returns current _address's total balance
     */
    function getTotalBalanceOfUser(address _address) public view returns (uint256) {
        require(_address != address(0), "getTotalBalanceOfUser zero address");
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
     * Sets lock to prevent reentrance.
     */
    function _setLocked(bool _locked) internal {
        locked = _locked;
    }

    function testCalcaulator() public pure returns (uint256) {
        uint256 p = 0.00000000000000001 ether;
        // uint256 p = 1000000000000000000 ether;
        // uint256 p = 1000000000000000000.001 ether;
        uint256 v2 = Calculator.calculator(p, 365, 12);
        return v2;
    }

}
