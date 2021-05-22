require("dotenv").config()
const { time } = require('@openzeppelin/test-helpers');
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

    const YEAR = new BN(31536000); // in seconds
    const TEN_DAYS = new BN(10 * 24 * 60 * 60);
    const ONE_DAYS = new BN(24 * 60 * 60);

    async function getBlockTimestamp(receipt) {
        return new BN((await web3.eth.getBlock(receipt.receipt.blockNumber)).timestamp);
    }

    let umiTokenMock
    let umiTokenFarm

    before(async () => {
        umiTokenMock = await UmiTokenMock.new()
        umiTokenFarm = await UmiTokenFarm.new(umiTokenMock.address)
        console.log('UmiTokenMock is deployed to %s', umiTokenMock.address)
        console.log('UmiTokenFarm is deployed to %s', umiTokenFarm.address)
        // transfer 2000000000 UmiToken to account[1]
        await umiTokenMock.transfer(accounts[1], ether('2000000000'), { from: accounts[0] })
        // await umiTokenMock.transfer(umiTokenFarm.address, ether('1000000000'), { from: accounts[0] })
    })

    // test constructor
    describe('Test constructor', async () => {
        it('1st test, constructor should be set up correctly', async () => {
            // UmiToken address is correct
            const umiTokenAddress = await umiTokenFarm.umiToken();
            assert.equal(umiTokenAddress, umiTokenMock.address);
            // default APY is correct
            const apy = await umiTokenFarm.APY();
            assert.equal(apy, 12);
        })

        it('2nd test, fail if _tokenAddress is incorrect', async () => {
            let UmiTokenFarmFailed = false;
            try {
                await UmiTokenFarm.new(accounts[0])
                assert.fail('UmiTokenFarm constructor failed')
            } catch (e) {
                UmiTokenFarmFailed = true;
                assert.equal(UmiTokenFarmFailed, true);
            }
        })

        it('3rd test, UmiToken has a total supply', async () => {
            const umiTokenTotalSupply = await umiTokenMock.totalSupply()
            assert.equal(umiTokenTotalSupply, ether('33000000000'))
        })

        it('4th test, UmiToken address correct', async () => {
            const umiTokenAddress = await umiTokenFarm.umiToken()
            assert.equal(umiTokenAddress, umiTokenMock.address)
        })
    })

    // test APY
    describe('Test setAPY', async () => {
        it('5th test, owner can set APY', async () => {
            await umiTokenFarm.setAPY(12, { from: accounts[0] });
        })

        it('6th test, can not set APY by non owner', async () => {
            let setAPYFailed = false;
            try {
                await umiTokenFarm.setAPY(12, { from: accounts[1] })
                assert.fail('set apy failed')
            } catch (e) {
                setAPYFailed = true;
                assert.equal(setAPYFailed, true, 'only owner can set apy');
            }
        })
    })

    // test get UmiToken balance
    describe('Test getUmiTokenBalance', async () => {
        it('7th test, get UmiToken balance of account is correct', async () => {
            let banlance0 = await umiTokenFarm.getUmiTokenBalance(accounts[0])
            let banlance1 = await umiTokenFarm.getUmiTokenBalance(accounts[1])
            let banlance2 = await umiTokenFarm.getUmiTokenBalance(accounts[2])
            assert.equal(banlance0, ether('31000000000'))
            assert.equal(banlance1, ether('2000000000'))
            assert.equal(banlance2, ether('0'))

            const umiTokenBalanceOfContract = await umiTokenFarm.getUmiTokenBalance(umiTokenFarm.address)
            assert.equal(umiTokenBalanceOfContract, 0)
        })
    })

    // test deposit
    describe('Test deposit', async () => {
        // before deposit, owner should approve UmiTokenFarm contract
        before(async () => {
            // account[0] approve 10000 tokens to UmiTokenFarm
            await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[0] })
        })

        // accounts[0] deposit 1000
        it('8th test, deposit correct by accounts[0]', async () => {
            // 8.1. check allowance first after approve
            let allowance = await umiTokenMock.allowance(accounts[0], umiTokenFarm.address)
            assert.equal(allowance, ether('10000'))
            // 8.2. deposit 1000 umiTokenMock to umiTokenFarm contract
            let receipt = await umiTokenFarm.deposit(ether('1000'), { from: accounts[0] })
            // 8.3. check allowance again
            allowance = await umiTokenMock.allowance(accounts[0], umiTokenFarm.address)
            assert.equal(allowance, ether('9000'))
            // 8.4. deposit success, check lastDepositIds of accounts[0]
            const lastDepositIdsOfAccount0 = await umiTokenFarm.lastDepositIds(accounts[0])
            assert.equal(lastDepositIdsOfAccount0, 1)
            // 8.5. check timestamp
            const timestamp = await getBlockTimestamp(receipt);
            const depositDate = await umiTokenFarm.depositDates(accounts[0], lastDepositIdsOfAccount0)
            assert.equal(BN(timestamp).toString(), BN(depositDate).toString())
            // 8.6. check balance after deposit 1000
            const balances = await umiTokenFarm.balances(accounts[0], lastDepositIdsOfAccount0)
            assert.equal(parseWei2Ether(balances), 1000)
            // 8.7. check total staked
            const totalStaked = await umiTokenFarm.totalStaked()
            assert.equal(parseWei2Ether(totalStaked), 1000)
        })

        it('9th test, deposit incorrect with amount=0', async () => {
            // 9.1. deposit 0 UmiToken to umiTokenFarm contract, it will fail
            let depositFailed = false;
            try {
                await umiTokenFarm.deposit(0, { from: accounts[0] })
                assert.fail('deposit fail with amount=0')
            } catch (e) {
                depositFailed = true;
                assert.equal(depositFailed, true, 'deposit amount should be more than 0');
            }
            // 9.2. check lastDepositIds, balance of accounts[0] and total staked
            // check lastDepositIds
            const lastDepositIdsOfAccount0 = await umiTokenFarm.lastDepositIds(accounts[0])
            assert.equal(1, lastDepositIdsOfAccount0)
            // check balance
            const balances = await umiTokenFarm.balances(accounts[0], lastDepositIdsOfAccount0)
            assert.equal(1000, parseWei2Ether(balances))
            // check total staked
            const totalStaked = await umiTokenFarm.totalStaked()
            assert.equal(1000, parseWei2Ether(totalStaked))
        })

        it('10th test, deposit without approve, it will fail', async () => {
            // 10.1. check allowance of accounts[1]
            let allowance = await umiTokenMock.allowance(accounts[1], umiTokenFarm.address)
            assert.equal(0, allowance)
            // 10.2. deposit from accounts[1]
            let depositWithoutApproveFailed = false;
            try {
                await umiTokenFarm.deposit(ether('100'), { from: accounts[1] })
                assert.fail('deposit without approve')
            } catch (e) {
                depositWithoutApproveFailed = true;
                assert.equal(depositWithoutApproveFailed, true, 'deposit fail without approve');
            }
            // check total staked
            const totalStaked = await umiTokenFarm.totalStaked()
            assert.equal(1000, parseWei2Ether(totalStaked))
        })

        // accounts[1] deposit 200
        it('11th test, deposit correct by accounts[1]', async () => {
            // 11.1. account[1] approve 1000 tokens to UmiTokenFarm
            await umiTokenMock.approve(umiTokenFarm.address, ether('1000'), { from: accounts[1] })

            // 11.2. check allowance first after approve
            let allowance = await umiTokenMock.allowance(accounts[1], umiTokenFarm.address)
            assert.equal(allowance, ether('1000'))
            // 11.3. deposit 200 umiTokenMock to umiTokenFarm contract
            let receipt = await umiTokenFarm.deposit(ether('200'), { from: accounts[1] })
            // 11.4. check allowance again
            allowance = await umiTokenMock.allowance(accounts[1], umiTokenFarm.address)
            assert.equal(allowance, ether('800'))
            // 11.5. deposit success, check lastDepositIds of accounts[1]
            const lastDepositIdsOfAccount1 = await umiTokenFarm.lastDepositIds(accounts[1])
            assert.equal(lastDepositIdsOfAccount1, 1)
            // 11.6. check timestamp
            const timestamp = await getBlockTimestamp(receipt);
            const depositDate = await umiTokenFarm.depositDates(accounts[1], lastDepositIdsOfAccount1)
            assert.equal(BN(timestamp).toString(), BN(depositDate).toString())
            // 11.7. check balance after deposit 200
            const balances = await umiTokenFarm.balances(accounts[1], lastDepositIdsOfAccount1)
            assert.equal(parseWei2Ether(balances), 200)
            // 11.8. check total staked
            const totalStaked = await umiTokenFarm.totalStaked()
            assert.equal(parseWei2Ether(totalStaked), 1200)
        })

        // accounts[0] deposit another 2000
        it('12th test, deposit another 2000 correct by accounts[0]', async () => {
            // 12.1. check allowance first after approve
            let allowance = await umiTokenMock.allowance(accounts[0], umiTokenFarm.address)
            assert.equal(allowance, ether('9000'))
            // 12.2. deposit 2000 umiTokenMock to umiTokenFarm contract
            let receipt = await umiTokenFarm.deposit(ether('2000'), { from: accounts[0] })
            // 12.3. check allowance again
            allowance = await umiTokenMock.allowance(accounts[0], umiTokenFarm.address)
            assert.equal(allowance, ether('7000'))
            // 12.4. deposit success, check lastDepositIds of accounts[0]
            const lastDepositIdsOfAccount0 = await umiTokenFarm.lastDepositIds(accounts[0])
            assert.equal(lastDepositIdsOfAccount0, 2)
            // 12.5. check timestamp
            const timestamp = await getBlockTimestamp(receipt);
            const depositDate = await umiTokenFarm.depositDates(accounts[0], lastDepositIdsOfAccount0)
            assert.equal(BN(timestamp).toString(), BN(depositDate).toString())
            // 12.6. check balance after deposit 2000
            const balances = await umiTokenFarm.balances(accounts[0], lastDepositIdsOfAccount0)
            assert.equal(parseWei2Ether(balances), 2000)
            // 12.7. check total staked
            const totalStaked = await umiTokenFarm.totalStaked()
            assert.equal(parseWei2Ether(totalStaked), 3200)
        })
    })

    // test requestWithdrawal
    describe('Test requestWithdrawal', async () => {
        it('13th test, request withdrawal correct', async () => {
            // accounts[0] has two deposits, get one of them
            const receipt = await umiTokenFarm.requestWithdrawal(1, { from: accounts[0] });
            const timestamp = await getBlockTimestamp(receipt);
            const withdrawalRequestsDate = await umiTokenFarm.withdrawalRequestsDates(accounts[0], 1);
            assert.equal(BN(timestamp).toString(), BN(withdrawalRequestsDate).toString())
        })

        it('14th test, request withdrawal incorrect, with wrong deposit id', async () => {
            let requestWithdrawalFailed = false;
            try {
                await umiTokenFarm.requestWithdrawal(3, { from: accounts[0] })
                assert.fail('request withdrawal incorrect, with wrong deposit id')
            } catch (e) {
                requestWithdrawalFailed = true;
                assert.equal(requestWithdrawalFailed, true, 'request withdrawal incorrect, with wrong deposit id');
            }
        })
    })

    // test makeRequestedWithdrawal, Sender should call requestWithdrawal first
    describe('Test makeRequestedWithdrawal', async () => {
        // before deposit, owner should approve UmiTokenFarm contract
        before(async () => {
            // account[0] approve 10000 tokens to UmiTokenFarm
            await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[0] })
        })

        it('15th test, makeRequestedWithdrawal correct 0 - to withdraw all', async () => {
            // 15.1. deposit 1000 umiTokenMock to umiTokenFarm contract
            let receipt = await umiTokenFarm.deposit(ether('1000'), { from: accounts[0] })
            // 15.2. get timestamp of deposit
            const timestampDeposit = await getBlockTimestamp(receipt);
            // increase time for ten days later
            await time.increase(TEN_DAYS)
            // 15.3. deposit success, get lastDepositIds of accounts[0]
            const lastDepositIdsOfAccount0 = await umiTokenFarm.lastDepositIds(accounts[0])

            // 15.4. before Withdrawal balance of accounts[0]
            let beforeWithdrawalBalance =  await umiTokenFarm.getUmiTokenBalance(accounts[0]);
            console.log('Deposit 1000, before Withdrawal balance of accounts[0] %s', parseWei2Ether(beforeWithdrawalBalance))

            // 15.5. requestWithdrawal
            await umiTokenFarm.requestWithdrawal(lastDepositIdsOfAccount0, { from: accounts[0] });
            // 15.6. makeRequestedWithdrawal, 0 - to withdraw all
            receipt = await umiTokenFarm.makeRequestedWithdrawal(lastDepositIdsOfAccount0, 0, { from: accounts[0] });
            const timestampWithdrawal = await getBlockTimestamp(receipt);
            const timePassed = timestampWithdrawal.sub(timestampDeposit);

            // 15.7. withdrawalRequestsDates will be 0
            const withdrawalRequestsDate = await umiTokenFarm.withdrawalRequestsDates(accounts[0], lastDepositIdsOfAccount0);
            assert.equal(0, withdrawalRequestsDate)
            // 15.8. makeRequestedWithdrawal balance will be 0
            const balances = await umiTokenFarm.balances(accounts[0], lastDepositIdsOfAccount0)
            assert.equal(parseWei2Ether(balances), 0)

            // 15.9. after Withdrawal balance of accounts[0]
            let afterWithdrawalBalance =  await umiTokenFarm.getUmiTokenBalance(accounts[0]);
            console.log('Withdrawal 1000 ten days later, after Withdrawal balance of accounts[0] %s', parseWei2Ether(afterWithdrawalBalance))
        })

        it('16th test, makeRequestedWithdrawal correct, deposit 1000 then withdrawal 500 ', async () => {
            // 16.1. deposit 1000 umiTokenMock to umiTokenFarm contract
            let receipt = await umiTokenFarm.deposit(ether('1000'), { from: accounts[0] })
            // 16.2. get timestamp of deposit
            const timestampDeposit = await getBlockTimestamp(receipt);
            // increase time for ten days later
            await time.increase(TEN_DAYS)
            // 16.3. deposit success, get lastDepositIds of accounts[0]
            const lastDepositIdsOfAccount0 = await umiTokenFarm.lastDepositIds(accounts[0])

            // 16.4. before Withdrawal balance of accounts[0]
            let beforeWithdrawalBalance =  await umiTokenFarm.getUmiTokenBalance(accounts[0]);
            console.log('Deposit 1000, before Withdrawal balance of accounts[0] %s', parseWei2Ether(beforeWithdrawalBalance))

            // 16.5. requestWithdrawal
            await umiTokenFarm.requestWithdrawal(lastDepositIdsOfAccount0, { from: accounts[0] });
            // 16.6. makeRequestedWithdrawal, 0 - to withdraw all
            receipt = await umiTokenFarm.makeRequestedWithdrawal(lastDepositIdsOfAccount0, ether('500'), { from: accounts[0] });
            const timestampWithdrawal = await getBlockTimestamp(receipt);
            const timePassed = timestampWithdrawal.sub(timestampDeposit);

            // 16.7. withdrawalRequestsDates will be 0
            const withdrawalRequestsDate = await umiTokenFarm.withdrawalRequestsDates(accounts[0], lastDepositIdsOfAccount0);
            assert.equal(0, withdrawalRequestsDate)
            // 16.8. makeRequestedWithdrawal balance will be 500
            const balances = await umiTokenFarm.balances(accounts[0], lastDepositIdsOfAccount0)
            assert.equal(parseWei2Ether(balances), 500)

            // 16.9. after Withdrawal balance of accounts[0]
            let afterWithdrawalBalance =  await umiTokenFarm.getUmiTokenBalance(accounts[0]);
            console.log('Withdrawal 500 ten days later, after Withdrawal balance of accounts[0] %s', parseWei2Ether(afterWithdrawalBalance))
        })

        it('17th test, makeRequestedWithdrawal should fail if not requested', async () => {
            let makeRequestedWithdrawalFailed = false;
            try {
                await umiTokenFarm.makeRequestedWithdrawal(lastDepositIdsOfAccount0, 0, { from: accounts[0] });
                assert.fail('request withdrawal incorrect, with wrong deposit id')
            } catch (e) {
                makeRequestedWithdrawalFailed = true;
                assert.equal(makeRequestedWithdrawalFailed, true, `withdrawal wasn't requested`);
            }
          });

    })

    // test getTotalBalanceOfUser
    describe('Test getTotalBalanceOfUser', async () => {
        // total balance of accounts[0] will be 3500, total balance of accounts[1] will be 200
        it('18th test, getTotalBalanceOfUser correct', async () => {
            let totalBalance = await umiTokenFarm.getTotalBalanceOfUser(accounts[0])
            assert.equal(3500, parseWei2Ether(totalBalance))
            totalBalance = await umiTokenFarm.getTotalBalanceOfUser(accounts[1])
            assert.equal(200, parseWei2Ether(totalBalance))
        })
    })

})