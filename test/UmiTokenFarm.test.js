require("dotenv").config()
const UmiTokenMock = artifacts.require("UmiTokenMock");
const UmiTokenFarm = artifacts.require("UmiTokenFarm");
const envUtils = require("../src/utils/evnUtils");
const BigNumber = require('bignumber.js');
const { assert } = require("chai");

require('chai')
    .use(require('chai-as-promised'))
    .should()

function ether(n) {
    return web3.utils.toWei(n, 'ether')
}

function parseWei2Ether(wei) {
    return web3.utils.fromWei(wei, 'ether')
}

contract('UmiTokenFarm', async (accounts) => {

    let umiTokenMock
    let umiTokenFarm

    before(async () => {
        umiTokenMock = await UmiTokenMock.new()
        console.log('test UmiTokenFarm before umiTokenMock address is %s', umiTokenMock.address)
        umiTokenFarm = await UmiTokenFarm.new(umiTokenMock.address, 1)
        console.log('test UmiTokenFarm before umiTokenFarm address is %s', umiTokenFarm.address)
    })

    describe('Test umi token', async () => {

        // it('1st test, UmiToken has a name', async () => {
        //     const name = await umiTokenFarm.getUmiTokenName()
        //     console.log('UmiToken has a name=%s', name)
        //     assert.equal(name, 'UmiStakingToken')
        // })

        // it('2nd test, UmiToken has a symbol', async () => {
        //     const symbol = await umiTokenFarm.getUmiTokenSymbol()
        //     console.log('UmiToken has a symbol=%s', symbol)
        //     assert.equal(symbol, 'UMIStake')
        // })

        it('3rd test, UmiToken has a total supply', async () => {
            const umiTokenTotalSupply = await umiTokenFarm.getUmiTokenTotalSupply()
            console.log('UmiToken has a total supply=%s', umiTokenTotalSupply)
            assert.equal(umiTokenTotalSupply, ether('100000'))
        })

        it('4th test, UmiToken address', async () => {
            const umiTokenAddress = await umiTokenFarm.getUmiTokenAddress()
            console.log('UmiToken address=%s', umiTokenAddress)
            // assert.equal(umiTokenAddress, envUtils.getUmiTokenAddressByNetwork())
            assert.equal(umiTokenAddress, umiTokenMock.address)
        })

    })

    describe('Test UmiTokenFarm', async () => {

        it('5th test, Get umiToken banlance by address', async () => {
            let banlance0 = await umiTokenFarm.getUmiTokenBalanceByAddress(accounts[0])
            let banlance1 = await umiTokenFarm.getUmiTokenBalanceByAddress(accounts[1])
            let banlance2 = await umiTokenFarm.getUmiTokenBalanceByAddress(accounts[2])
            console.log('Get umiToken banlance by address banlance0=%s, balance1=%s, balance2=%s', parseWei2Ether(banlance0), parseWei2Ether(banlance1), parseWei2Ether(banlance2))
            assert.equal(banlance0, ether('100000'))
            assert.equal(banlance1, ether('0'))
            assert.equal(banlance2, ether('0'))
        })

        it('6th test, get umi token balance of contract', async () => {
            const umiTokenBalanceOfContract = await umiTokenFarm.getUmiTokenBalanceByAddress(umiTokenFarm.address)
            console.log('6th umiTokenBalanceOfContract is %s', umiTokenBalanceOfContract)
            assert.equal(umiTokenBalanceOfContract, 0)
        })

        it('7th test, getLastDepositIds of contract', async () => {
            const lastDepositIds = await umiTokenFarm.getLastDepositIds(accounts[0])
            console.log('7th lastDepositIds of contract is %s', lastDepositIds)
            assert(lastDepositIds, 0)
        })

        it('8th test, approve 10000 then deposit 800', async () => {
            // approve 10000 tokens to umiTokenFarm contract
            await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[0] })
            // deposit 800 umiTokenMock to umiTokenFarm contract
            await umiTokenFarm.deposit(ether('800'), { from: accounts[0] })
        })

        it('9th test, get balance of account[0],balance should be 800', async () => {
            const lastDepositIds = await umiTokenFarm.getLastDepositIds(accounts[0])
            const balance = await umiTokenFarm.balances(accounts[0], lastDepositIds)
            console.log('9th get balance of account[0]=%s, lastDepositIds=%s, balance=%s', accounts[0], lastDepositIds, parseWei2Ether(balance))
            assert.equal(800, parseWei2Ether(balance))
        })

        it('10h test, get umi token balance of contract', async () => {
            const umiTokenBalanceOfContract = await umiTokenFarm.getUmiTokenBalanceByAddress(umiTokenFarm.address)
            console.log('10th umiTokenBalanceOfContract is %s', parseWei2Ether(umiTokenBalanceOfContract))
            assert.equal(800, parseWei2Ether(umiTokenBalanceOfContract))
        })

        it('11th test, getLastDepositIds of contract', async () => {
            const lastDepositIds = await umiTokenFarm.getLastDepositIds(accounts[0])
            console.log('11th lastDepositIds of contract is %s', lastDepositIds)
            assert(lastDepositIds, 1)
        })

        it('12th test, get umiTokenFarm contract balance', async () => {
            const umiTokenFarmBalance = await umiTokenFarm.getContractBalance()
            console.log('12th umiTokenFarmBalance balance is %s', umiTokenFarmBalance)
            assert.equal(umiTokenFarmBalance, 0)
        })

        it('13th test, deposit another 100 umiTokens', async () => {
            // deposit 100 umiTokenMock to umiTokenFarm contract
            await umiTokenFarm.deposit(ether('100'), { from: accounts[0] })
        })

        it('14th test, get balance of account[0],balance should be 100', async () => {
            const lastDepositIds = await umiTokenFarm.getLastDepositIds(accounts[0])
            console.log('14th lastDepositIds of contract is %s', lastDepositIds)
            const balance = await umiTokenFarm.balances(accounts[0], lastDepositIds)
            console.log('14th get balance of account[0]=%s, lastDepositIds=%s, balance=%s', accounts[0], lastDepositIds, parseWei2Ether(balance))
            assert.equal(100, parseWei2Ether(balance))
        })

        it('15th test, total balance of account[0], should be 900', async() => {
            const totalBalanceOfUmiTokenByAddress = await umiTokenFarm.getTotalBalanceOfUmiTokenByAddress(accounts[0])
            console.log('15th accounts[0]\'s totalBalanceOfUmiTokenByAddress=%s', parseWei2Ether(totalBalanceOfUmiTokenByAddress))
            assert.equal(900, parseWei2Ether(totalBalanceOfUmiTokenByAddress))
        })

        it('16th test, get total staked, should be 900', async() => {
            const totalStaked = await umiTokenFarm.totalStaked()
            console.log('16th totalStaked=%s', totalStaked)
            assert.equal(900, parseWei2Ether(totalStaked))
        })

        it('17th test, withdraw 1000', async() => {
            // deposit 1 's amount is 800
            await umiTokenFarm.requestWithdrawal(1, {from: accounts[0]})
            // make withdraw 600
            await umiTokenFarm.makeRequestedWithdrawal(1, ether('600'), { from: accounts[0] });
            assert.equal(await umiTokenFarm.withdrawalRequestsDates(accounts[0], 1), 0)
            // the balance should be 200
            const balance = await umiTokenFarm.balances(accounts[0], 1)
            console.log('withdraw 600, balance=%s', balance)
            assert.equal(200, parseWei2Ether(balance))
        })

        it('18th test, get total staked, should be 300', async() => {
            const totalStaked = await umiTokenFarm.totalStaked()
            console.log('18th totalStaked=%s', parseWei2Ether(totalStaked))
            assert.equal(300, parseWei2Ether(totalStaked))
        })

        it('19th test, total balance of account[0], should be 300', async() => {
            const totalBalanceOfUmiTokenByAddress = await umiTokenFarm.getTotalBalanceOfUmiTokenByAddress(accounts[0])
            console.log('19th accounts[0]\'s totalBalanceOfUmiTokenByAddress=%s', parseWei2Ether(totalBalanceOfUmiTokenByAddress))
            assert.equal(300, parseWei2Ether(totalBalanceOfUmiTokenByAddress))
        })

    })

})