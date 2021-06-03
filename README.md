# UMI
Ethereum based NFT minter, marketplace and DeFi farming project

## 1. Project overview
Staking contract for UMI ERC20 token, paying 12% APY for stakers, compound annually

## 2. Development Environment

- Node v14.16.1
- Truffle v5.2.6 (core: 5.2.6)
- Solidity - ^0.8.3 (solc-js)
- Web3.js v1.2.9
- Ganache CLI v6.12.2 (ganache-core: 2.13.2) on port 8545
- Ganache GUI v2.5.4 (ganache-core: 2.13.2) on port 7545

The smart contract is deployed and fully tested on the local Ethereum VM.

## 3. File structures

contracts

- abdk-libraries - Library of mathematical functions operating with IEEE 754 quadruple precision (128 bit) floating point numbers.
- mocks - TestRewards.sol for testing rewards calculation, UmiTokenMock.sol for mocking local ERC20 token. They do not need to be deployed to mainnet.
- Calculator.sol - Tools for calculating rewards.
- UmiTokenFarm.sol - Staking smart contract where users can connect via metamask and stake $UMI tokens.

## 4. Run the project

### 4.1. Clone code and install dependencies

```javascript
git clone this-project-code
```

```javascript
cd /path/to/this/project/folder/
```

Run command to install package dependencies;

```javascript
npm install
```

### 4.2. Run a local blockchain

I run Ganache GUI on port 7545, as it provides a better view;

If you use Ganache GUI too, make sure to go to "Setting", "Accounts & Keys";

If you prefer Ganache-CLI, change the port to 8545 in these files
truffle-config.js and .env file's LOCAL_RPC_URL

next, launch ganache-cli with 50 accounts

ganache-cli -a 50

### 4.3. Compile and Deploy

#### 4.3.1. Compile
You can now compile

```javascript
truffle compile
```

### 4.3.2.
restart Ganache GUI or ganache-cli

### 4.3.3. Deploy
open a new terminal

```javascript
truffle migrate --reset --network <network-name>
```

```
Notice:
<network-name> value range: local, rinkeby, mainnet
```

## 5. Attention
If you want to run the project, you should copy .env.example file and rename it to .env. And if you want to run project on other networks instead of the local development network, you should fill values in .env file, 4 parts below:

- LOCAL_RPC_URL, RINKEBY_RPC_URL, MAINNET_RPC_URL --- rpc url, according to the NETWORK you choose
- RINKEBY_ACCOUNT, MAINNET_ACCOUNT --- The account used to deploy the contract
- RINKEBY_MNEMONIC、MAINNET_MNEMONIC --- mnemonic
- MAINNET_UMI_TOKEN_ADDRESS --- mainnet UmiToken address

## 6. Test the project

```javascript
truffle test --network local
```

## 7. Rinkeby deployment

truffle migrate --reset --network rinkeby
## 8. Mainnet deployment

First, estimate the gas fee, see everything is good to go

truffle migrate --dry-run --reset --network mainnet

Second, real deploy

truffle migrate --reset --network mainnet

## 9. Verify

First, go to etherscan, log in your account, get a verify API key

Second, put the key in .env file

Third, run this command, wait, until you see a "Pass..." message on the console

truffle run verify UmiTokenFarm --network mainnet
