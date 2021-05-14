// envUtils
require("dotenv").config();

const envUtils = {
  getUmiTokenAddressByNetwork: function () {
    let network = process.env.NETWORK
    console.log('getUmiTokenAddressByNetwork network=%s', network)
    if (network === 'local') {
      return process.env.LOCAL_UMI_TOKEN_ADDRESS;
    } else if (network === 'rinkeby') {
      return process.env.RINKEBY_UMI_TOKEN_ADDRESS;
    } else if (network === 'mainnet') {
      return '';
    }
  }
}

module.exports = {
  getUmiTokenAddressByNetwork: envUtils.getUmiTokenAddressByNetwork
}