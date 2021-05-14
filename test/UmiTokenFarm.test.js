require("dotenv").config()
const UmiTokenFarm = artifacts.require("UmiTokenFarm");
const envUtils = require("../src/utils/evnUtils");
const BigNumber = require('bignumber.js');
const { assert } = require("chai");

require('chai')
    .use(require('chai-as-promised'))
    .should()

function tokens(n) {
    return web3.utils.toWei(n, 'ether')
}

contract('UmiTokenFarm', () => {

    let umiTokenFarm

    before(async () => {
        umiTokenFarm = await UmiTokenFarm.new(envUtils.getUmiTokenAddressByNetwork(), 1)
        console.log('test UmiTokenFarm before umiTokenFarm address is %s', umiTokenFarm.address)
    })

    describe('Get umi token name', async () => {

        it('UmiToken has a name', async () => {
            const name = await umiTokenFarm.getUmiTokenName()
            console.log('UmiToken has a name=%s', name)
            assert.equal(name, 'UmiStakingToken')
        })

        it('UmiToken has a symbol', async () => {
            const symbol = await umiTokenFarm.getUmiTokenSymbol()
            console.log('UmiToken has a symbol=%s', symbol)
            assert.equal(symbol, 'UMIStake')
        })

        it('UmiToken has a total supply', async () => {
            const umiTokenTotalSupply = await umiTokenFarm.getUmiTokenTotalSupply()
            console.log('UmiToken has a total supply=%s', umiTokenTotalSupply)
            assert.equal(umiTokenTotalSupply, tokens('100000'))
        })

    })

})