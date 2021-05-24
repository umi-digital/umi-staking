// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPausedWithdrawal` and `whenPausedWithdrawal`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract WithdrawalPausable is Context {

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event WithdrawalPaused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event WithdrawalUnpaused(address account);

    bool private _withdrawalPaused;

    /**
     * @dev Initializes the withdrawal in unpaused state.
     */
    constructor () {
        _withdrawalPaused = false;
    }

    /**
     * @dev Returns true if the withdrawal state is paused, and false otherwise.
     */
    function withdrawalPaused() public view virtual returns (bool) {
        return _withdrawalPaused;
    }

    /**
     * @dev Modifier to make a function callable only when the withdrawal is not paused.
     *
     * Requirements:
     *
     * - The withdrawal must not be paused.
     */
    modifier whenNotPausedWithdrawal() {
        require(!withdrawalPaused(), "WithdrawalPausable: paused, can not withdraw now");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the withdrawal is paused.
     *
     * Requirements:
     *
     * - The withdrawal must be paused.
     */
    modifier whenPausedWithdrawal() {
        require(withdrawalPaused(), "WithdrawalPausable: not paused");
        _;
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The withdrawal must not be paused.
     */
    function _pauseWithdrawal() internal virtual whenNotPausedWithdrawal {
        _withdrawalPaused = true;
        emit WithdrawalPaused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The withdrawal must be paused.
     */
    function _unpauseWithdrawal() internal virtual whenPausedWithdrawal {
        _withdrawalPaused = false;
        emit WithdrawalUnpaused(_msgSender());
    }

}
