// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;
import "./abdk-libraries/ABDKMath64x64.sol";

/**
 * F=P*(1+i)^n
 */
library Calculator {
    /*
     * calcaulate interest
     * steps
     * 1. calcaulate Effective Annual Rate
     * 2. Get interest
     * @param p principal amount
     * @param n periods for calculating interest,  24H eq to one period
     * @param interest nominal interest rate
     * @param points decimal place for keeping , suggesting value is 100000 for keeping 5 decimal place
     * @return sum of principal and interest
     */
    function calculator(
        int128 principal,
        uint256 n,
        uint256 interest,
        int128 points
    ) public pure returns (int128 amount) {
        
        int128 div = ABDKMath64x64.divu(interest, 36500); //day rate
        int128 sum = ABDKMath64x64.add(ABDKMath64x64.fromInt(1), div);
        int128 pow = ABDKMath64x64.pow(sum, n);
        int128 mul = ABDKMath64x64.mul(ABDKMath64x64.fromInt(principal), pow);
        
        int128 point = ABDKMath64x64.mul(mul, ABDKMath64x64.fromInt(points));
        int128 res = ABDKMath64x64.toInt(point);
        return res;
    }

function compound (uint principal, uint ratio, uint n)public pure returns (uint) {
    return ABDKMath64x64.mulu (ABDKMath64x64.pow (ABDKMath64x64.add (ABDKMath64x64.fromUInt (1),ABDKMath64x64.divu (ratio, 10**18)),n),principal);
}

}
