require("dotenv").config()
const UmiTokenMock = artifacts.require("UmiTokenMock");
const UmiTokenFarm = artifacts.require("UmiTokenFarm");
const envUtils = require("../src/utils/evnUtils");
const BigNumber = require('bignumber.js');
const { assert } = require("chai");

require('chai')
    .use(require('chai-as-promised'))
    .should()
   
var BN = web3.utils.BN;

function ether(n) {
    return web3.utils.toWei(n, 'ether')
}

function parseWei2Ether(wei) {
    return web3.utils.fromWei(wei, 'ether')
}

contract('UmiTokenFarm', async (accounts) => {

    console.log('UmiTokenFarm network=%s', process.env.NETWORK)

    let umiTokenMock
    let umiTokenFarm

    before(async () => {
        umiTokenMock = await UmiTokenMock.new()
        console.log('test UmiTokenFarm before umiTokenMock address is %s', umiTokenMock.address)
        umiTokenFarm = await UmiTokenFarm.new(umiTokenMock.address, 12)
        console.log('test UmiTokenFarm before umiTokenFarm address is %s', umiTokenFarm.address)
    })

    describe('Test umi token', async () => {

        it('1st test, UmiToken has a total supply', async () => {
            const umiTokenTotalSupply = await umiTokenMock.totalSupply()
            console.log('1st UmiToken has a total supply=%s', umiTokenTotalSupply)
            assert.equal(umiTokenTotalSupply, ether('100000'))
        })

        it('2nd test, UmiToken address', async () => {
            const umiTokenAddress = await umiTokenFarm.getUmiTokenAddress()
            console.log('2nd UmiToken address=%s', umiTokenAddress)
            // assert.equal(umiTokenAddress, envUtils.getUmiTokenAddressByNetwork())
            assert.equal(umiTokenAddress, umiTokenMock.address)
        })

    })

    describe('Test UmiTokenFarm', async () => {

        it('3rd test, Get umiToken banlance by address', async () => {
            let banlance0 = await umiTokenFarm.getUmiTokenBalance(accounts[0])
            let banlance1 = await umiTokenFarm.getUmiTokenBalance(accounts[1])
            let banlance2 = await umiTokenFarm.getUmiTokenBalance(accounts[2])
            console.log('3rd Get umiToken banlance by address banlance0=%s, balance1=%s, balance2=%s', parseWei2Ether(banlance0), parseWei2Ether(banlance1), parseWei2Ether(banlance2))
            assert.equal(banlance0, ether('100000'))
            assert.equal(banlance1, ether('0'))
            assert.equal(banlance2, ether('0'))
        })

        it('4th test, get umi token balance of contract', async () => {
            const umiTokenBalanceOfContract = await umiTokenFarm.getUmiTokenBalance(umiTokenFarm.address)
            console.log('4th umiTokenBalanceOfContract is %s', umiTokenBalanceOfContract)
            assert.equal(umiTokenBalanceOfContract, 0)
        })

        it('5th test, getLastDepositIds of contract', async () => {
            const lastDepositIds = await umiTokenFarm.lastDepositIds(accounts[0])
            console.log('5th lastDepositIds of contract is %s', lastDepositIds)
            assert(lastDepositIds, 0)
        })

        it('6th test, approve 10000 then deposit 800', async () => {
            // approve 10000 tokens to umiTokenFarm contract
            await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[0] })
            // deposit 800 umiTokenMock to umiTokenFarm contract
            await umiTokenFarm.deposit(ether('800'), { from: accounts[0] })
        })

        it('7th test, get balance of account[0],balance should be 800', async () => {
            const lastDepositIds = await umiTokenFarm.lastDepositIds(accounts[0])
            const balance = await umiTokenFarm.balances(accounts[0], lastDepositIds)
            console.log('7th get balance of account[0]=%s, lastDepositIds=%s, balance=%s', accounts[0], lastDepositIds, parseWei2Ether(balance))
            assert.equal(800, parseWei2Ether(balance))
        })

        it('8h test, get umi token balance of contract', async () => {
            const umiTokenBalanceOfContract = await umiTokenFarm.getUmiTokenBalance(umiTokenFarm.address)
            console.log('8th umiTokenBalanceOfContract is %s', parseWei2Ether(umiTokenBalanceOfContract))
            assert.equal(800, parseWei2Ether(umiTokenBalanceOfContract))
        })

        it('9th test, getLastDepositIds of contract', async () => {
            const lastDepositIds = await umiTokenFarm.lastDepositIds(accounts[0])
            console.log('9th lastDepositIds of contract is %s', lastDepositIds)
            assert(lastDepositIds, 1)
        })

        it('10th test, get umiTokenFarm contract balance', async () => {
            const umiTokenFarmBalance = await umiTokenFarm.getContractBalance()
            console.log('10th umiTokenFarmBalance balance is %s', umiTokenFarmBalance)
            assert.equal(umiTokenFarmBalance, 0)
        })

        it('11th test, deposit another 100 umiTokens', async () => {
            // deposit 100 umiTokenMock to umiTokenFarm contract
            await umiTokenFarm.deposit(ether('100'), { from: accounts[0] })
        })

        it('12th test, get balance of account[0],balance should be 100', async () => {
            const lastDepositIds = await umiTokenFarm.lastDepositIds(accounts[0])
            console.log('12th lastDepositIds of contract is %s', lastDepositIds)
            const balance = await umiTokenFarm.balances(accounts[0], lastDepositIds)
            console.log('12th get balance of account[0]=%s, lastDepositIds=%s, balance=%s', accounts[0], lastDepositIds, parseWei2Ether(balance))
            assert.equal(100, parseWei2Ether(balance))
        })

        it('13th test, total balance of account[0], should be 900', async() => {
            const totalBalanceOfUmiTokenByAddress = await umiTokenFarm.getTotalBalanceOfUmiTokenByAddress(accounts[0])
            console.log('13th accounts[0]\'s totalBalanceOfUmiTokenByAddress=%s', parseWei2Ether(totalBalanceOfUmiTokenByAddress))
            assert.equal(900, parseWei2Ether(totalBalanceOfUmiTokenByAddress))
        })

        it('14th test, get total staked, should be 900', async() => {
            const totalStaked = await umiTokenFarm.totalStaked()
            console.log('14th totalStaked=%s', totalStaked)
            assert.equal(900, parseWei2Ether(totalStaked))
        })

        it('15th test, withdraw 600', async() => {
            // deposit 1 's amount is 800
            await umiTokenFarm.requestWithdrawal(1, {from: accounts[0]})
            // make withdraw 600
            await umiTokenFarm.makeRequestedWithdrawal(1, ether('600'), { from: accounts[0] });
            assert.equal(await umiTokenFarm.withdrawalRequestsDates(accounts[0], 1), 0)
            // the balance should be 200
            const balance = await umiTokenFarm.balances(accounts[0], 1)
            console.log('15th withdraw 600, balance=%s', balance)
            assert.equal(200, parseWei2Ether(balance))
        })

        it('16th test, get total staked, should be 300', async() => {
            const totalStaked = await umiTokenFarm.totalStaked()
            console.log('16th totalStaked=%s', parseWei2Ether(totalStaked))
            assert.equal(300, parseWei2Ether(totalStaked))
        })

        it('17th test, total balance of account[0], should be 300', async() => {
            const totalBalanceOfUmiTokenByAddress = await umiTokenFarm.getTotalBalanceOfUmiTokenByAddress(accounts[0])
            console.log('17th accounts[0]\'s totalBalanceOfUmiTokenByAddress=%s', parseWei2Ether(totalBalanceOfUmiTokenByAddress))
            assert.equal(300, parseWei2Ether(totalBalanceOfUmiTokenByAddress))
        })

        it('18th test, can not set APY by non-owner', async() => {
            let setAPYFailed = false;
            try {
                await umiTokenFarm.setAPY(new BigNumber(2500000000000000000), {from:accounts[1]})
                assert.fail('set apy failed')
            } catch(e) {
                setAPYFailed = true;
                assert.equal(setAPYFailed, true, 'only owner can set apy');
            }
        })

        it('19 test, cal', async() => {
            let res = await umiTokenFarm.testCalcaulator()
            
            console.log('19 test res=%s, %s', BN(res).toString());
        })

        it('20 test, testCalculateInterestAndTimePassed', async() => {
            let res = await umiTokenFarm.testCalculateInterestAndTimePassed(0)
            console.log('20 test testCalculateInterestAndTimePassed res=%s', BN(res).toString());
        })

        it('20 test, testCalculator', async() => {

            //third=1127474615638403709
            //third=1127474615638402582
            let res = await umiTokenFarm.testCalcaulator()
            console.log('20 test testCalculateInterestAndTimePassed res=%s', BN(res).toString() );
        })

    })

})