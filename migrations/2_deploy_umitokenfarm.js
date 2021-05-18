require("dotenv").config()
const UmiTokenMock = artifacts.require("UmiTokenMock");
const UmiTokenFarm = artifacts.require("UmiTokenFarm");
const envUtils = require("../src/utils/evnUtils");
const BigNumber = require('bignumber.js');

module.exports = async function(deployer, network, accounts) {
  
    console.log("UmiTokenFarm deploy to network=%s", network)

    // deploy UmiTokenMock
    await deployer.deploy(UmiTokenMock)
    const umiTokenMock = await UmiTokenMock.deployed()
    console.log("UmiTokenMock deploy to " + umiTokenMock.address)

    // deploy UmiTokenFarm, with 10% of APY
    await deployer.deploy(UmiTokenFarm, umiTokenMock.address, new BigNumber(100000000000000000))
    const umiTokenFarm = await UmiTokenFarm.deployed()
    console.log("UmiTokenFarm deploy to " + umiTokenFarm.address)
}