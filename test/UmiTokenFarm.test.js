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
    const TWO_YEARS = new BN(2 * 31536000)

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
        // transfer 1000000000 UmiTOken to account[2]
        await umiTokenMock.transfer(accounts[2], ether('1000000000'), { from: accounts[0] })
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

    // test storeFarmingRewards, in order to pay the user rewards later 
    describe('Test storeFarmingRewards', async () => {

        before(async () => {
            // account[0] approve 10000 tokens to UmiTokenFarm
            await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[0] })
            // account[1] approve 10000 tokens to UmiTokenFarm
            await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[2] })
        })

        it('storeFarmingRewards and UmiToken balance of the farming contract is correct, only owner can store farming rewards', async () => {
            // 1. get UmiTokenFarm UmiToken balance
            let umiTokenFarmBalance = await umiTokenFarm.getUmiTokenBalance(umiTokenFarm.address)
            assert.equal(0, parseWei2Ether(umiTokenFarmBalance))
            // 2. account[0] store 1000 to UmiTokenFarm, balance will be 1000
            await umiTokenFarm.storeFarmingRewards(ether('1000'), {from: accounts[0]});
            umiTokenFarmBalance = await umiTokenFarm.getUmiTokenBalance(umiTokenFarm.address)
            assert.equal(1000, parseWei2Ether(umiTokenFarmBalance))

            // 3. accounts[2] store 1000 to UmiTokenFarm, the opertion will be fail, because accounts[2] is not the owner
            let storeFarmingRewardsFailed = false;
            try {
                await umiTokenFarm.storeFarmingRewards(ether('1000'), {from: accounts[2]});
                assert.fail('storeFarmingRewards incorrect, not the owner')
            } catch (e) {
                // console.log('storeFarmingRewards error %s', e)
                storeFarmingRewardsFailed = true;
                console.log('storeFarmingRewards incorrect, accounts[2] not the owner')
                assert.equal(storeFarmingRewardsFailed, true, 'storeFarmingRewards incorrect, not the owner');
            }
            // store farming rewards fail, balance is still 1000
            umiTokenFarmBalance = await umiTokenFarm.getUmiTokenBalance(umiTokenFarm.address)
            assert.equal(1000, parseWei2Ether(umiTokenFarmBalance))

            // 4. get farming rewards by address, accounts[0] store 1000
            let account0FarmingRewards = await umiTokenFarm.farmRewards(accounts[0])
            assert.equal(1000, parseWei2Ether(account0FarmingRewards))

            // 5. account[0] store another 1000 to UmiTokenFarm, balance will be 2000
            await umiTokenFarm.storeFarmingRewards(ether('1000'), {from: accounts[0]});
            account0FarmingRewards = await umiTokenFarm.farmRewards(accounts[0])
            assert.equal(2000, parseWei2Ether(account0FarmingRewards))
        })

        it('storeFarmingRewards incorrect, amount should be more than 0', async() => {
            let storeFarmingRewardsFailed = false;
            try {
                await umiTokenFarm.storeFarmingRewards(0, {from: accounts[0]}); 
                assert.fail('storeFarmingRewards incorrect, amount should be more than 0')
            } catch (e) {
                // console.log('storeFarmingRewards 0 error %s', e)
                storeFarmingRewardsFailed = true;
                assert.equal(storeFarmingRewardsFailed, true, 'storeFarmingRewards incorrect, amount should be more than 0');
            }
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
            assert.equal(banlance0, ether('29999998000'))
            assert.equal(banlance1, ether('2000000000'))
            assert.equal(banlance2, ether('1000000000'))
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
        // before deposit, owner should approve UmiTokenFarm contract
        before(async () => {
            // account[0] approve 10000 tokens to UmiTokenFarm
            await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[0] })
            // account[1] approve 10000 tokens to UmiTokenFarm
            await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[1] })
            // account[2] approve 10000 tokens to UmiTokenFarm
            await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[2] })
        })

        it('13th test, requestWithdrawal correct, to withdraw all', async () => {
            // 13.1. deposit 1000 umiTokenMock to umiTokenFarm contract
            let receipt = await umiTokenFarm.deposit(ether('1000'), { from: accounts[0] })
            // 13.2. get timestamp of deposit
            const timestampDeposit = await getBlockTimestamp(receipt);
            // increase time for ten days later
            await time.increase(TEN_DAYS)
            // 13.3. deposit success, get lastDepositIds of accounts[0]
            const lastDepositIdsOfAccount0 = await umiTokenFarm.lastDepositIds(accounts[0])

            // 13.4. before Withdrawal balance of accounts[0]
            let beforeWithdrawalBalance = await umiTokenFarm.getUmiTokenBalance(accounts[0]);
            console.log('13th test, Deposit 1000, before Withdrawal balance of accounts[0] %s', parseWei2Ether(beforeWithdrawalBalance))

            // 13.5. requestWithdrawal
            await umiTokenFarm.requestWithdrawal(lastDepositIdsOfAccount0, ether('1000'), { from: accounts[0] });

            // 13.6. withdrawalRequestsDates will be 0
            const withdrawalRequestsDate = await umiTokenFarm.withdrawalRequestsDates(accounts[0], lastDepositIdsOfAccount0);
            assert.equal(0, withdrawalRequestsDate)
            // 13.7. balance will be 0
            const balances = await umiTokenFarm.balances(accounts[0], lastDepositIdsOfAccount0)
            assert.equal(parseWei2Ether(balances), 0)

            // 13.8. after Withdrawal balance of accounts[0]
            let afterWithdrawalBalance = await umiTokenFarm.getUmiTokenBalance(accounts[0]);
            console.log('13th test, Withdrawal 1000 ten days later, after Withdrawal balance of accounts[0] %s, total with rewards %s', parseWei2Ether(afterWithdrawalBalance), parseWei2Ether(afterWithdrawalBalance) - parseWei2Ether(beforeWithdrawalBalance))
        })

        it('14th test, requestWithdrawal correct, deposit 1000 then withdrawal 500 ', async () => {
            // 14.1. deposit 1000 umiTokenMock to umiTokenFarm contract
            let receipt = await umiTokenFarm.deposit(ether('1000'), { from: accounts[1] })
            // 14.2. get timestamp of deposit
            const timestampDeposit = await getBlockTimestamp(receipt);
            // increase time for ten days later
            await time.increase(TEN_DAYS)
            // 14.3. deposit success, get lastDepositIds of accounts[1]
            const lastDepositIdsOfAccount1 = await umiTokenFarm.lastDepositIds(accounts[1])

            // 14.4. before Withdrawal balance of accounts[1]
            let beforeWithdrawalBalance = await umiTokenFarm.getUmiTokenBalance(accounts[1]);
            console.log('14 test, Deposit 1000, before Withdrawal balance of accounts[1] %s', parseWei2Ether(beforeWithdrawalBalance))

            // 14.5. requestWithdrawal
            await umiTokenFarm.requestWithdrawal(lastDepositIdsOfAccount1, ether('500'), { from: accounts[1] });
            const timestampWithdrawal = await getBlockTimestamp(receipt);

            // 14.6. withdrawalRequestsDates will be 0
            const withdrawalRequestsDate = await umiTokenFarm.withdrawalRequestsDates(accounts[1], lastDepositIdsOfAccount1);
            assert.equal(0, withdrawalRequestsDate)
            // 14.7. balance will be 500
            const balances = await umiTokenFarm.balances(accounts[1], lastDepositIdsOfAccount1)
            assert.equal(parseWei2Ether(balances), 500)

            // 14.8. after Withdrawal balance of accounts[1]
            let afterWithdrawalBalance = await umiTokenFarm.getUmiTokenBalance(accounts[1]);
            console.log('14 test, Withdrawal 500 ten days later, after Withdrawal balance of accounts[1] %s, total with rewards %s', parseWei2Ether(afterWithdrawalBalance), parseWei2Ether(afterWithdrawalBalance) - parseWei2Ether(beforeWithdrawalBalance))
        })

        // accounts[2] deposit 1000 ether, and withdraw all after 2 years later
        it('15th test, requestWithdrawal withdraw all after 2 years later', async () => {
            // 15.1. deposit 1000 umiTokenMock to umiTokenFarm contract
            let receipt = await umiTokenFarm.deposit(ether('1000'), { from: accounts[2] })
            // 15.2. get timestamp of deposit
            const timestampDeposit = await getBlockTimestamp(receipt);
            // increase time for 2 years later
            await time.increase(TWO_YEARS)
            // 15.3. deposit success, get lastDepositIds of accounts[2]
            const lastDepositIdsOfAccount2 = await umiTokenFarm.lastDepositIds(accounts[2])

            // 15.4. before Withdrawal balance of accounts[2]
            let beforeWithdrawalBalance = await umiTokenFarm.getUmiTokenBalance(accounts[2]);
            console.log('15th test, Deposit 1000, before Withdrawal balance of accounts[2] %s', parseWei2Ether(beforeWithdrawalBalance))

            // 15.5. requestWithdrawal
            await umiTokenFarm.requestWithdrawal(lastDepositIdsOfAccount2, ether('1000'), { from: accounts[2] });

            // 15.6. withdrawalRequestsDates will be 0
            const withdrawalRequestsDate = await umiTokenFarm.withdrawalRequestsDates(accounts[2], lastDepositIdsOfAccount2);
            assert.equal(0, withdrawalRequestsDate)
            // 15.7. makeRequestedWithdrawal balance will be 0
            const balances = await umiTokenFarm.balances(accounts[2], lastDepositIdsOfAccount2)
            assert.equal(parseWei2Ether(balances), 0)

            // 15.8. after Withdrawal balance of accounts[2]
            let afterWithdrawalBalance = await umiTokenFarm.getUmiTokenBalance(accounts[2]);
            console.log('15th test, Withdrawal 1000 2 years later, after Withdrawal balance of accounts[2] %s, total with rewards %s', parseWei2Ether(afterWithdrawalBalance), parseWei2Ether(afterWithdrawalBalance) - parseWei2Ether(beforeWithdrawalBalance))
        })

        it('16th test, request withdrawal incorrect, with wrong deposit id', async () => {
            let requestWithdrawalFailed = false;
            try {
                await umiTokenFarm.requestWithdrawal(10, ether('1000'), { from: accounts[0] })
                assert.fail('request withdrawal incorrect, with wrong deposit id')
            } catch (e) {
                // console.log('16th e=%s', e)
                requestWithdrawalFailed = true;
                assert.equal(requestWithdrawalFailed, true, 'request withdrawal incorrect, with wrong deposit id');
            }
        })

        it('17th test, request withdrawal incorrect, amount should be more than 0', async () => {
            let requestWithdrawalFailed = false;
            const lastDepositIdsOfAccount1 = await umiTokenFarm.lastDepositIds(accounts[1])
            try {
                await umiTokenFarm.requestWithdrawal(lastDepositIdsOfAccount1, 0, { from: accounts[1] })
                assert.fail('request withdrawal incorrect, amount should be more than 0')
            } catch (e) {
                // console.log('17th e=%s', e)
                requestWithdrawalFailed = true;
                assert.equal(requestWithdrawalFailed, true, 'request withdrawal incorrect, amount should be more than 0');
            }
        })

        it('18th test, _withdraw insufficient funds', async () => {
            // 18.1. deposit 1000 umiTokenMock to umiTokenFarm contract
            let receipt = await umiTokenFarm.deposit(ether('1000'), { from: accounts[2] })
            // 18.2. get timestamp of deposit
            const timestampDeposit = await getBlockTimestamp(receipt);
            // increase time for 2 years later
            await time.increase(TWO_YEARS)
            // 18.3. deposit success, get lastDepositIds of accounts[2]
            const lastDepositIdsOfAccount2 = await umiTokenFarm.lastDepositIds(accounts[2])

            let requestWithdrawalFailed = false;
            try {
                await umiTokenFarm.requestWithdrawal(lastDepositIdsOfAccount2, ether('1001'), { from: accounts[2] })
                assert.fail('request withdrawal incorrect, _withdraw insufficient funds')
            } catch (e) {
                // console.log('18th e=%s', e)
                requestWithdrawalFailed = true;
                assert.equal(requestWithdrawalFailed, true, 'request withdrawal incorrect, _withdraw insufficient funds');
            }
        })
    })

    // test requestWithdrawalAll
    describe('Test requestWithdrawalAll', async () => {
        // before deposit, owner should approve UmiTokenFarm contract
        before(async () => {
            // account[0] approve 10000 tokens to UmiTokenFarm
            await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[0] })
        })

        it('19th test, requestWithdrawalAll correct', async () => {
            // 19.1. deposit 1000 umiTokenMock to umiTokenFarm contract
            let receipt = await umiTokenFarm.deposit(ether('1000'), { from: accounts[0] })
            // 19.2. get timestamp of deposit
            const timestampDeposit = await getBlockTimestamp(receipt);
            // increase time for ten days later
            await time.increase(TEN_DAYS)
            // 19.3. deposit success, get lastDepositIds of accounts[0]
            const lastDepositIdsOfAccount0 = await umiTokenFarm.lastDepositIds(accounts[0])

            // 19.4. before Withdrawal balance of accounts[0]
            let beforeWithdrawalBalance = await umiTokenFarm.getUmiTokenBalance(accounts[0]);
            console.log('19th test, Deposit 1000, before Withdrawal balance of accounts[0] %s', parseWei2Ether(beforeWithdrawalBalance))

            // 19.5. requestWithdrawalAll
            await umiTokenFarm.requestWithdrawalAll(lastDepositIdsOfAccount0, { from: accounts[0] });

            // 19.6. withdrawalRequestsDates will be 0
            const withdrawalRequestsDate = await umiTokenFarm.withdrawalRequestsDates(accounts[0], lastDepositIdsOfAccount0);
            assert.equal(0, withdrawalRequestsDate)
            // 19.7. balance will be 0
            const balances = await umiTokenFarm.balances(accounts[0], lastDepositIdsOfAccount0)
            assert.equal(parseWei2Ether(balances), 0)

            // 19.8. after Withdrawal balance of accounts[0]
            let afterWithdrawalBalance = await umiTokenFarm.getUmiTokenBalance(accounts[0]);
            console.log('19th test, Withdrawal 1000 ten days later, after Withdrawal balance of accounts[0] %s, total with rewards %s', parseWei2Ether(afterWithdrawalBalance), parseWei2Ether(afterWithdrawalBalance) - parseWei2Ether(beforeWithdrawalBalance))
        })

        it('20th test, requestwithdrawalAll incorrect, with wrong deposit id', async () => {
            let requestWithdrawalFailed = false;
            try {
                await umiTokenFarm.requestWithdrawalAll(10, { from: accounts[0] })
                assert.fail('requestwithdrawalAll incorrect, with wrong deposit id')
            } catch (e) {
                // console.log('20th e=%s', e)
                requestWithdrawalFailed = true;
                assert.equal(requestWithdrawalFailed, true, 'requestwithdrawalAll incorrect, with wrong deposit id');
            }
        })

    })

    // test getTotalBalanceOfUser
    describe('Test getTotalBalanceOfUser', async () => {
        // total balance of accounts[0] will be 3500, total balance of accounts[1] will be 200
        it('21th test, getTotalBalanceOfUser correct', async () => {
            let totalBalance = await umiTokenFarm.getTotalBalanceOfUser(accounts[0])
            assert.equal(3000, parseWei2Ether(totalBalance))
            totalBalance = await umiTokenFarm.getTotalBalanceOfUser(accounts[1])
            assert.equal(700, parseWei2Ether(totalBalance))
            totalBalance = await umiTokenFarm.getTotalBalanceOfUser(accounts[2])
            assert.equal(1000, parseWei2Ether(totalBalance))
        })
    })

    // test pauseDeposit and unpauseDeposit
    describe('Test pauseDeposit and unpauseDeposit', async () => {
        // before deposit, owner should approve UmiTokenFarm contract
        before(async () => {
            // account[0] approve 10000 tokens to UmiTokenFarm
            await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[0] })
        })

        it('22th test, pauseDeposit,unpauseDeposit incorrect, only owner can call them', async () => {
            let pauseDepositFailed = false;
            try {
                await umiTokenFarm.pauseDeposit({ from: accounts[1] });
                assert.fail('pauseDeposit incorrect, only owner can call pauseDeposit')
            } catch (e) {
                // console.log('pauseDepositFailed e=%s', e)
                pauseDepositFailed = true;
                assert.equal(pauseDepositFailed, true, 'pauseDeposit incorrect, only owner can call pauseDeposit');
            }

            let unpauseDepositFailed = false;
            try {
                await umiTokenFarm.unpauseDeposit({ from: accounts[1] });
                assert.fail('unpauseDeposit incorrect, only owner can call unpauseDeposit')
            } catch (e) {
                // console.log('unpauseDepositFailed e=%s', e)
                unpauseDepositFailed = true;
                assert.equal(unpauseDepositFailed, true, 'unpauseDeposit incorrect, only owner can call unpauseDeposit');
            }
        })

        it('23th test, deposit will be failed when paused, and will be success when unpaused', async () => {
            // 1. before deposit, pauseDeposit
            await umiTokenFarm.pauseDeposit({ from: accounts[0] });
            // check paused state
            let pausedState = await umiTokenFarm.depositPaused()
            // console.log('pauseDeposit pausedState %s', pausedState)
            assert.equal(pausedState, true)
            let depositFailed = false;
            try {
                // 2. deposit 1000 umiTokenMock to umiTokenFarm contract, it will fail
                await umiTokenFarm.deposit(ether('1000'), { from: accounts[0] })
                assert.fail('deposit incorrect, paused')
            } catch (e) {
                depositFailed = true;
                assert.equal(depositFailed, true, 'deposit incorrect, paused');
            }
            // 3. check accounts[0]'s balance
            let totalBalance = await umiTokenFarm.getTotalBalanceOfUser(accounts[0])
            assert.equal(3000, parseWei2Ether(totalBalance))
            // 4. unpauseDeposit, and deposit
            await umiTokenFarm.unpauseDeposit({ from: accounts[0] });
            // check paused state
            pausedState = await umiTokenFarm.depositPaused()
            // console.log('unpauseDeposit pausedState %s', pausedState)
            assert.equal(pausedState, false)
            // 5. deposit again
            await umiTokenFarm.deposit(ether('1000'), { from: accounts[0] })
            // 6. check accounts[0]'s balance again
            totalBalance = await umiTokenFarm.getTotalBalanceOfUser(accounts[0])
            assert.equal(4000, parseWei2Ether(totalBalance))
        })
    })

    // test pauseWithdrawal and unpauseWithdrawal
    describe('Test pauseWithdrawal and unpauseWithdrawal', async () => {
        // before deposit, owner should approve UmiTokenFarm contract
        before(async () => {
            // account[0] approve 10000 tokens to UmiTokenFarm
            await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[0] })
        })

        it('24th test, pauseWithdrawal and unpauseWithdrawal, only owner can call them', async () => {
            let pauseWithdrawalFailed = false;
            try {
                await umiTokenFarm.pauseWithdrawal({ from: accounts[1] });
                assert.fail('pauseWithdrawal incorrect, only owner can call pauseWithdrawal')
            } catch (e) {
                // console.log('pauseWithdrawal e=%s', e)
                pauseWithdrawalFailed = true;
                assert.equal(pauseWithdrawalFailed, true, 'pauseWithdrawal incorrect, only owner can call pauseWithdrawal');
            }

            let unpauseWithdrawalFailed = false;
            try {
                await umiTokenFarm.unpauseWithdrawal({ from: accounts[1] });
                assert.fail('unpauseWithdrawal incorrect, only owner can call unpauseWithdrawal')
            } catch (e) {
                // console.log('unpauseWithdrawal e=%s', e)
                unpauseWithdrawalFailed = true;
                assert.equal(unpauseWithdrawalFailed, true, 'unpauseWithdrawal incorrect, only owner can call unpauseWithdrawal');
            }
        })

        it('25th test, Withdrawal will be failed when paused, and will be success when unpaused', async () => {
            // 1. before deposit, owner should approve UmiTokenFarm contract
            before(async () => {
                // account[0] approve 10000 tokens to UmiTokenFarm
                await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[0] })
            })

            // 2. deposit 1000 umiTokenMock to umiTokenFarm contract
            await umiTokenFarm.deposit(ether('1000'), { from: accounts[0] })

            // 3. deposit success, get lastDepositIds of accounts[0]
            const lastDepositIdsOfAccount0 = await umiTokenFarm.lastDepositIds(accounts[0])

            // 4. before Withdrawal, pauseWithdrawal
            await umiTokenFarm.pauseWithdrawal({ from: accounts[0] });

            // check paused state
            let pausedState = await umiTokenFarm.withdrawalPaused()
            // console.log('pauseWithdrawal pausedState %s', pausedState)
            assert.equal(pausedState, true)

            // 5. requestWithdrawal, it will fail
            let withdrawalFailed = false;
            try {
                // deposit 1000 umiTokenMock to umiTokenFarm contract, it will fail
                await umiTokenFarm.requestWithdrawal(lastDepositIdsOfAccount0, ether('1000'), { from: accounts[0] });
                assert.fail('requestWithdrawal incorrect, paused')
            } catch (e) {
                // console.log('Withdrawal will be failed when paused e=%s', e)
                withdrawalFailed = true;
                assert.equal(withdrawalFailed, true, 'requestWithdrawal incorrect, paused');
            }
            // 6. check accounts[0]'s balance
            let totalBalance = await umiTokenFarm.getTotalBalanceOfUser(accounts[0])
            assert.equal(5000, parseWei2Ether(totalBalance))

            // increase time for ten days later
            await time.increase(TEN_DAYS)

            // 7. unpauseWithdrawal, and withdrawal
            await umiTokenFarm.unpauseWithdrawal({ from: accounts[0] });
            // check paused state
            pausedState = await umiTokenFarm.withdrawalPaused()
            // console.log('unpauseWithdrawal pausedState %s', pausedState)
            assert.equal(pausedState, false)
            // 5. requestWithdrawal again, it will success
            await umiTokenFarm.requestWithdrawal(lastDepositIdsOfAccount0, ether('1000'), { from: accounts[0] });
            // 6. check accounts[0]'s balance again
            totalBalance = await umiTokenFarm.getTotalBalanceOfUser(accounts[0])
            assert.equal(4000, parseWei2Ether(totalBalance))
        })

    })

})