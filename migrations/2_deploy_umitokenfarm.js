require("dotenv").config()
const Calculator = artifacts.require("Calculator");
const UmiTokenMock = artifacts.require("UmiTokenMock");
const UmiTokenFarm = artifacts.require("UmiTokenFarm");
const envUtils = require("../src/utils/evnUtils");

module.exports = async function(deployer, network, accounts) {
  
    console.log("UmiTokenFarm deploy to network=%s", network)
    console.log('2_deploy_umitokenfarm umi token address is ', envUtils.getUmiTokenAddressByNetwork())

    deployer.deploy(Calculator);
    deployer.link(Calculator, UmiTokenFarm);

    // deploy UmiTokenMock
    await deployer.deploy(UmiTokenMock)
    const umiTokenMock = await UmiTokenMock.deployed()
    console.log("UmiTokenMock deploy to " + umiTokenMock.address)

    // deploy UmiTokenFarm
    await deployer.deploy(UmiTokenFarm, umiTokenMock.address, 1)
    const umiTokenFarm = await UmiTokenFarm.deployed()
    console.log("UmiTokenFarm deploy to " + umiTokenFarm.address)
}