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

contract('UmiTokenFarm', async (accounts) => {

    console.log('accounts=' + accounts)
    let umiTokenFarm

    before(async () => {
        umiTokenFarm = await UmiTokenFarm.new(envUtils.getUmiTokenAddressByNetwork(), 1)
        console.log('test UmiTokenFarm before umiTokenFarm address is %s', umiTokenFarm.address)
    })

    describe('Test umi token', async () => {

        it('1st test, UmiToken has a name', async () => {
            const name = await umiTokenFarm.getUmiTokenName()
            console.log('UmiToken has a name=%s', name)
            assert.equal(name, 'UmiStakingToken')
        })

        it('2nd test, UmiToken has a symbol', async () => {
            const symbol = await umiTokenFarm.getUmiTokenSymbol()
            console.log('UmiToken has a symbol=%s', symbol)
            assert.equal(symbol, 'UMIStake')
        })

        it('3rd test, UmiToken has a total supply', async () => {
            const umiTokenTotalSupply = await umiTokenFarm.getUmiTokenTotalSupply()
            console.log('UmiToken has a total supply=%s', umiTokenTotalSupply)
            assert.equal(umiTokenTotalSupply, tokens('100000'))
        })

        it('4th test, UmiToken address', async() => {
            const umiTokenAddress = await umiTokenFarm.getUmiTokenAddress()
            console.log('UmiToken address=%s', umiTokenAddress)
            assert.equal(umiTokenAddress, envUtils.getUmiTokenAddressByNetwork())
        })

    })

    describe('Test UmiTokenFarm', async () => {

        it('5th test, Get umiToken banlance by address', async () => {
            let banlance0 = await umiTokenFarm.getUmiTokenBalanceByAddress(accounts[0])
            let banlance1 = await umiTokenFarm.getUmiTokenBalanceByAddress(accounts[1])
            let banlance2 = await umiTokenFarm.getUmiTokenBalanceByAddress(accounts[2])
            let banlance3 = await umiTokenFarm.getUmiTokenBalanceByAddress(accounts[3])
            let banlance4 = await umiTokenFarm.getUmiTokenBalanceByAddress(accounts[4])
            console.log('Get umiToken banlance by address banlance0=%s', banlance0)
            console.log('Get umiToken banlance by address banlance1=%s', banlance1)
            console.log('Get umiToken banlance by address banlance2=%s', banlance2)
            console.log('Get umiToken banlance by address banlance3=%s', banlance3)
            console.log('Get umiToken banlance by address banlance4=%s', banlance4)
            assert.equal(banlance0, tokens('99800'))
            assert.equal(banlance1, tokens('200'))
            assert.equal(banlance2, tokens('0'))
            assert.equal(banlance3, tokens('0'))
            assert.equal(banlance4, tokens('0'))
        })

        it('6th test, get umi token balance of contract', async() => {
            const umiTokenBalanceOfContract = await umiTokenFarm.getUmiTokenBalanceByAddress(umiTokenFarm.address)
            console.log('6th umiTokenBalanceOfContract is %s', umiTokenBalanceOfContract)
        })

        it('7th test, getLastDepositIds of contract', async() => {
            const lastDepositIds = await umiTokenFarm.getLastDepositIds(umiTokenFarm.address)
            console.log('7th lastDepositIds of contract is %s', lastDepositIds)
            assert(lastDepositIds, 0)
        })

        // it('8th test, deposit 10', async() => {
            
        //     console.log('accounts[0]=%s', accounts[0])
        //     await umiTokenFarm.deposit(100, {from:accounts[0]})
        // })

        it('9h test, get umi token balance of contract', async() => {
            const umiTokenBalanceOfContract = await umiTokenFarm.getUmiTokenBalanceByAddress(umiTokenFarm.address)
            console.log('9th umiTokenBalanceOfContract is %s', umiTokenBalanceOfContract)
        })

        it('10th test, getLastDepositIds of contract', async() => {
            const lastDepositIds = await umiTokenFarm.getLastDepositIds(umiTokenFarm.address)
            console.log('10th lastDepositIds of contract is %s', lastDepositIds)
            // assert(lastDepositIds, 0)
        })

    })

})