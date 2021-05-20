require("dotenv").config()
const Calculator = artifacts.require("Calculator");
const UmiTokenMock = artifacts.require("UmiTokenMock");
const UmiTokenFarm = artifacts.require("UmiTokenFarm");
const ABDKMath64x64 = artifacts.require("ABDKMath64x64")
const envUtils = require("../src/utils/evnUtils");
const BigNumber = require('bignumber.js');

module.exports = async function(deployer, network, accounts) {
  
    console.log("UmiTokenFarm deploy to network=%s", network)

    deployer.deploy(ABDKMath64x64)
    deployer.deploy(Calculator);
    deployer.link(ABDKMath64x64, Calculator);
    deployer.link(Calculator, UmiTokenFarm);

    // deploy UmiTokenMock
    await deployer.deploy(UmiTokenMock)
    const umiTokenMock = await UmiTokenMock.deployed()
    console.log("UmiTokenMock deploy to " + umiTokenMock.address)

    // deploy UmiTokenFarm, with 10% of APY
    await deployer.deploy(UmiTokenFarm, umiTokenMock.address, 12)
    const umiTokenFarm = await UmiTokenFarm.deployed()
    console.log("UmiTokenFarm deploy to " + umiTokenFarm.address)
    // await umiTokenFarm.setAPY(30, {from: accounts[0]})
    console.log("UmiTokenFarm deploy apy=%s", await umiTokenFarm.APY())
}