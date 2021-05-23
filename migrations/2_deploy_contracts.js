require("dotenv").config()
const UmiTokenFarm = artifacts.require("UmiTokenFarm");
const UmiERC20 = artifacts.require("UmiTokenMock");


module.exports = function(deployer) {
    return deployer
        .then(() => {
            return deployer.deploy(UmiERC20);
        })
        .then(() => {
            return deployer.deploy(
                UmiTokenFarm,
                UmiERC20.address
            );
        });
};