require("dotenv").config()
const UmiTokenFarm = artifacts.require("UmiTokenFarm");
const envUtils = require("../src/utils/evnUtils");

module.exports = async function(deployer, network, accounts) {
  
    console.log("UmiTokenFarm deploy to network=%s", network)
    console.log("deployer address=%s", accounts[0])
    // print account
    console.log("account[0]=%s, account[1]=%s", accounts[0], accounts[1])

    console.log('2_deploy_umitokenfarm umi token address is ', envUtils.getUmiTokenAddressByNetwork())
    // deploy umi token farm
    await deployer.deploy(UmiTokenFarm, envUtils.getUmiTokenAddressByNetwork(), 1)
    const umiTokenFarm = await UmiTokenFarm.deployed()
    console.log("UmiTokenFarm deploy to " + umiTokenFarm.address)
}