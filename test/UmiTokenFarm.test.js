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
        await umiTokenMock.transfer(accounts[1], ether('2000000000'), {from: accounts[0]})
    })

    // test constructor
    describe('Test constructor', async() => {
        it('1st test, constructor should be set up correctly', async() => {
            // UmiToken address is correct
            const umiTokenAddress = await umiTokenFarm.umiToken();
            assert.equal(umiTokenAddress, umiTokenMock.address);
            // default APY is correct
            const apy = await umiTokenFarm.APY();
            assert.equal(apy, 12);
        })

        it('2nd test, fail if _tokenAddress is incorrect', async() => {
            let UmiTokenFarmFailed = false;
            try {
                await UmiTokenFarm.new(accounts[0])
                assert.fail('UmiTokenFarm constructor failed')
            } catch(e) {
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
    describe('Test setAPY', async() => {
        it('5th test, owner can set APY', async() => {
            await umiTokenFarm.setAPY(12, {from: accounts[0]});
        })

        it('6th test, can not set APY by non owner', async() => {
            let setAPYFailed = false;
            try {
                await umiTokenFarm.setAPY(12, {from:accounts[1]})
                assert.fail('set apy failed')
            } catch(e) {
                setAPYFailed = true;
                assert.equal(setAPYFailed, true, 'only owner can set apy');
            }
        })
    })

    // test get UmiToken balance
    describe('Test getUmiTokenBalance', async() => {
        it('7th test, get UmiToken balance of account is correct', async() => {
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
    describe('Test deposit', async() => {
        // before deposit, owner should approve UmiTokenFarm contract
        before(async() => {
            // account[0] approve 10000 tokens to UmiTokenFarm
            await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[0] })
        })

        // accounts[0] deposit 1000
        it('8th test, deposit correct by accounts[0]', async() => {
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

        it('9th test, deposit incorrect with amount=0', async() => {
            // 9.1. deposit 0 UmiToken to umiTokenFarm contract, it will fail
            let depositFailed = false;
            try {
                await umiTokenFarm.deposit(0, { from: accounts[0] })
                assert.fail('deposit fail with amount=0')
            } catch(e) {
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

        it('10th test, deposit without approve, it will fail', async() => {
            // 10.1. check allowance of accounts[1]
            let allowance = await umiTokenMock.allowance(accounts[1], umiTokenFarm.address)
            assert.equal(0, allowance)
            // 10.2. deposit from accounts[1]
            let depositWithoutApproveFailed = false;
            try {
                await umiTokenFarm.deposit(ether('100'), { from: accounts[1] })
                assert.fail('deposit without approve')
            } catch(e) {
                depositWithoutApproveFailed = true;
                assert.equal(depositWithoutApproveFailed, true, 'deposit fail without approve');
            }
            // check total staked
            const totalStaked = await umiTokenFarm.totalStaked()
            assert.equal(1000, parseWei2Ether(totalStaked))
        })

        // accounts[1] deposit 200
        it('11th test, deposit correct by accounts[1]', async() => {
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
        it('12th test, deposit another 2000 correct by accounts[0]', async() => {
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

    // test getTotalBalanceOfUser
    describe('Test getTotalBalanceOfUser', async() => {
        // total balance of accounts[0] will be 3000, total balance of accounts[1] will be 200
        it('13th test, getTotalBalanceOfUser correct', async() => {
            let totalBalance = await umiTokenFarm.getTotalBalanceOfUser(accounts[0])
            assert.equal(3000, parseWei2Ether(totalBalance))
            totalBalance = await umiTokenFarm.getTotalBalanceOfUser(accounts[1])
            assert.equal(200, parseWei2Ether(totalBalance))
        })
    })

    // describe('Test UmiTokenFarm', async () => {
    //     it('5th test, getLastDepositIds of contract', async () => {
    //         const lastDepositIds = await umiTokenFarm.lastDepositIds(accounts[0])
    //         console.log('5th lastDepositIds of contract is %s', lastDepositIds)
    //         assert(lastDepositIds, 0)
    //     })

    //     it('6th test, approve 10000 then deposit 800', async () => {
    //         // approve 10000 tokens to umiTokenFarm contract
    //         await umiTokenMock.approve(umiTokenFarm.address, ether('10000'), { from: accounts[0] })
    //         // deposit 800 umiTokenMock to umiTokenFarm contract
    //         await umiTokenFarm.deposit(ether('800'), { from: accounts[0] })
    //     })

    //     it('7th test, get balance of account[0],balance should be 800', async () => {
    //         const lastDepositIds = await umiTokenFarm.lastDepositIds(accounts[0])
    //         const balance = await umiTokenFarm.balances(accounts[0], lastDepositIds)
    //         console.log('7th get balance of account[0]=%s, lastDepositIds=%s, balance=%s', accounts[0], lastDepositIds, parseWei2Ether(balance))
    //         assert.equal(800, parseWei2Ether(balance))
    //     })

    //     it('8h test, get umi token balance of contract', async () => {
    //         const umiTokenBalanceOfContract = await umiTokenFarm.getUmiTokenBalance(umiTokenFarm.address)
    //         console.log('8th umiTokenBalanceOfContract is %s', parseWei2Ether(umiTokenBalanceOfContract))
    //         assert.equal(800, parseWei2Ether(umiTokenBalanceOfContract))
    //     })

    //     it('9th test, getLastDepositIds of contract', async () => {
    //         const lastDepositIds = await umiTokenFarm.lastDepositIds(accounts[0])
    //         console.log('9th lastDepositIds of contract is %s', lastDepositIds)
    //         assert(lastDepositIds, 1)
    //     })

    //     it('10th test, get umiTokenFarm contract balance', async () => {
    //         const umiTokenFarmBalance = await umiTokenFarm.getContractBalance()
    //         console.log('10th umiTokenFarmBalance balance is %s', umiTokenFarmBalance)
    //         assert.equal(umiTokenFarmBalance, 0)
    //     })

    //     it('11th test, deposit another 100 umiTokens', async () => {
    //         // deposit 100 umiTokenMock to umiTokenFarm contract
    //         await umiTokenFarm.deposit(ether('100'), { from: accounts[0] })
    //     })

    //     it('12th test, get balance of account[0],balance should be 100', async () => {
    //         const lastDepositIds = await umiTokenFarm.lastDepositIds(accounts[0])
    //         console.log('12th lastDepositIds of contract is %s', lastDepositIds)
    //         const balance = await umiTokenFarm.balances(accounts[0], lastDepositIds)
    //         console.log('12th get balance of account[0]=%s, lastDepositIds=%s, balance=%s', accounts[0], lastDepositIds, parseWei2Ether(balance))
    //         assert.equal(100, parseWei2Ether(balance))
    //     })

    //     it('13th test, total balance of account[0], should be 900', async() => {
    //         const totalBalanceOfUmiTokenByAddress = await umiTokenFarm.getTotalBalanceOfUmiTokenByAddress(accounts[0])
    //         console.log('13th accounts[0]\'s totalBalanceOfUmiTokenByAddress=%s', parseWei2Ether(totalBalanceOfUmiTokenByAddress))
    //         assert.equal(900, parseWei2Ether(totalBalanceOfUmiTokenByAddress))
    //     })

    //     it('14th test, get total staked, should be 900', async() => {
    //         const totalStaked = await umiTokenFarm.totalStaked()
    //         console.log('14th totalStaked=%s', totalStaked)
    //         assert.equal(900, parseWei2Ether(totalStaked))
    //     })

    //     it('15th test, withdraw 600', async() => {
    //         // deposit 1 's amount is 800
    //         await umiTokenFarm.requestWithdrawal(1, {from: accounts[0]})
    //         // make withdraw 600
    //         await umiTokenFarm.makeRequestedWithdrawal(1, ether('600'), { from: accounts[0] });
    //         assert.equal(await umiTokenFarm.withdrawalRequestsDates(accounts[0], 1), 0)
    //         // the balance should be 200
    //         const balance = await umiTokenFarm.balances(accounts[0], 1)
    //         console.log('15th withdraw 600, balance=%s', balance)
    //         assert.equal(200, parseWei2Ether(balance))
    //     })

    //     it('16th test, get total staked, should be 300', async() => {
    //         const totalStaked = await umiTokenFarm.totalStaked()
    //         console.log('16th totalStaked=%s', parseWei2Ether(totalStaked))
    //         assert.equal(300, parseWei2Ether(totalStaked))
    //     })

    //     it('17th test, total balance of account[0], should be 300', async() => {
    //         const totalBalanceOfUmiTokenByAddress = await umiTokenFarm.getTotalBalanceOfUmiTokenByAddress(accounts[0])
    //         console.log('17th accounts[0]\'s totalBalanceOfUmiTokenByAddress=%s', parseWei2Ether(totalBalanceOfUmiTokenByAddress))
    //         assert.equal(300, parseWei2Ether(totalBalanceOfUmiTokenByAddress))
    //     })

    //     it('18th test, can not set APY by non-owner', async() => {
    //         let setAPYFailed = false;
    //         try {
    //             await umiTokenFarm.setAPY(20, {from:accounts[1]})
    //             assert.fail('set apy failed')
    //         } catch(e) {
    //             setAPYFailed = true;
    //             assert.equal(setAPYFailed, true, 'only owner can set apy');
    //         }
    //     })

    //     it('19 test, cal', async() => {
    //         let res = await umiTokenFarm.testCalcaulator()
            
    //         console.log('19 test res=%s, %s', BN(res).toString());
    //     })

    //     it('20 test, testCalculateInterestAndTimePassed', async() => {
    //         let res = await umiTokenFarm.testCalculateInterestAndTimePassed(0)
    //         console.log('20 test testCalculateInterestAndTimePassed res=%s', BN(res).toString());
    //     })

        it('20 test, testCalculator', async() => {
            //third=1127474615638403709
            //third=1127474615638402582
            let res = await umiTokenFarm.testCalcaulator()
            console.log('20 test testCalculateInterestAndTimePassed res=%s', BN(res).toString() );
    })

})