// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPausedDeposit` and `whenPausedDeposit`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract DepositPausable is Context {

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event DepositPaused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event DepositUnpaused(address account);

    bool private _depositPaused;

    /**
     * @dev Initializes the deposit in unpaused state.
     */
    constructor () {
        _depositPaused = false;
    }

    /**
     * @dev Returns true if the deposit state is paused, and false otherwise.
     */
    function depositPaused() public view virtual returns (bool) {
        return _depositPaused;
    }

    /**
     * @dev Modifier to make a function callable only when the deposit is not paused.
     *
     * Requirements:
     *
     * - The deposit must not be paused.
     */
    modifier whenNotPausedDeposit() {
        require(!depositPaused(), "DepositPausable: paused, can not deposit now");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the deposit is paused.
     *
     * Requirements:
     *
     * - The deposit must be paused.
     */
    modifier whenPausedDeposit() {
        require(depositPaused(), "DepositPausable: not paused");
        _;
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The deposit must not be paused.
     */
    function _pauseDeposit() internal virtual whenNotPausedDeposit {
        _depositPaused = true;
        emit DepositPaused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpauseDeposit() internal virtual whenPausedDeposit {
        _depositPaused = false;
        emit DepositUnpaused(_msgSender());
    }
}
