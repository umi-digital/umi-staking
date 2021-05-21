require("dotenv").config()
const Calculator = artifacts.require("Calculator");
const UmiTokenMock = artifacts.require("UmiTokenMock");
const UmiTokenFarm = artifacts.require("UmiTokenFarm");
const ABDKMath64x64 = artifacts.require("ABDKMath64x64")
const envUtils = require("../src/utils/evnUtils");

module.exports = async function (deployer, network, accounts) {

    console.log("UmiTokenFarm deploy to network=%s", network)

    await deployer.deploy(ABDKMath64x64);
    await deployer.deploy(Calculator);
    await deployer.link(ABDKMath64x64, Calculator);
    await deployer.link(Calculator, UmiTokenFarm);

    // UmiToken address(default is mainnet address), on local ganache or rinkeby network it will be UmiTokenMock‘s address
    let umiTokenAddress = process.env.MAINNET_UMI_TOKEN_ADDRESS;

    // deploy UmiTokenMock when on local ganache or rinkeby network
    if (!envUtils.isMainnet(network)) {
        await deployer.deploy(UmiTokenMock)
        const umiTokenMock = await UmiTokenMock.deployed()
        umiTokenAddress = umiTokenMock.address
        console.log('not on mainnet deploy UmiTokenMock to %s', umiTokenAddress);
    }

    console.log('umiTokenAddress=%s', umiTokenAddress);

    // deploy UmiTokenFarm
    await deployer.deploy(UmiTokenFarm, umiTokenAddress)
    const umiTokenFarm = await UmiTokenFarm.deployed()
    console.log('UmiTokenFarm deploy to ' + umiTokenFarm.address)
}