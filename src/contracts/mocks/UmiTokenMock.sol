// contracts/LagToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
liaiguo latest contract address: 0x52ca93B30A0f2FdA7E1B3ACa1fC76e90AaDDdEfd

rinkeby contract address: 0x38cdBCB14d11C70A518705A2b515a882ceA13BDd
 */
contract UmiTokenMock is ERC20 {

constructor() ERC20("UmiStakingToken", "UMIStake") {
    _mint(
        msg.sender, 100000 * 10 ** decimals());
}

}