// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../src/contracts/Calculator.sol";

contract TestContract {
    event LogUint(int128);

    function testCalcaulator() public {
        int128 res = Calculator.calculator(100, 10);
        emit LogUint(res);
    }
}
