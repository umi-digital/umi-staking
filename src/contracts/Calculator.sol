// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;
import "./abdk-libraries/ABDKMath64x64.sol";

/**
 * F=P*(1+i)^n
 */
library Calculator {
    //nominal interest rate
    uint256 constant i = 12; //0.12%

    /**
     * calcaulate interest
     * steps
     * 1. calcaulate Effective Annual Rate
     * 2. Get interest
     */
    function calculator(int128 p, uint256 n)
        public
        pure
        returns (int128 amount)
    {
        int128 div = ABDKMath64x64.divu(i, 3650000);//day rate
        int128 sum = ABDKMath64x64.add(1, div);
        int128 pow = ABDKMath64x64.pow(sum, n);
        int128 res = ABDKMath64x64.mul(p, pow);
        return res;
    }
}
