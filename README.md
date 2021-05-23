# UMI
Ethereum based NFT minter, marketplace and DeFi farming project

## 1. Project overview
Primary goal of the project and end results; create tangible NFT and DeFi smart contracts where users can connect via their metamask wallet and stake assets, mint NFTs, buy and sell NFTs, collect $UMI farming rewards and NFT airdrops. Help make the UMI platform as interoperable and develop high-quality code that is maintainable, performant and accessible.

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

Compiling your contracts...
===========================
> Compiling .\contracts\abdk-libraries\ABDKMath64x64.sol
> Artifacts written to C:\Users\mike\MyWork\development\umi\umi-project\build\contracts
> Compiled successfully using:
   - solc: 0.8.3+commit.8d00100c.Emscripten.clang



Starting migrations...
======================
> Network name:    'rinkeby'
> Network id:      4
> Block gas limit: 10000000 (0x989680)


1_initial_migration.js
======================

   Deploying 'Migrations'
   ----------------------
   > transaction hash:    0x99c460fd28eb33ec413e13066683dcec125f03331043257e4e65a301de432fe6
- Blocks: 0            Seconds: 0
   > Blocks: 0            Seconds: 8
   > contract address:    0x5eE780b39027cfdd607C7EF9d9ae1869c1b7eBb9
   > block number:        8632521
   > block timestamp:     1621723447
   > account:             0xd4B926E00F3258617985E1503305546f3F102Cda
   > balance:             0.990412524
   > gas used:            248204 (0x3c98c)
   > gas price:           20 gwei
   > value sent:          0 ETH
   > total cost:          0.00496408 ETH

   Pausing for 2 confirmations...
   ------------------------------
   > confirmation number: 1 (block: 8632522)
   > confirmation number: 2 (block: 8632523)

- Saving migration to chain.
   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:          0.00496408 ETH


2_deploy_contracts.js
=====================

   Deploying 'UmiTokenMock'
   ------------------------
   > transaction hash:    0x69cf287daaa939626d34dfbc573b16cdc59f6e46eec2d400d397a88c716fe0de
- Blocks: 0            Seconds: 0
   > Blocks: 0            Seconds: 12
   > contract address:    0xDa4BB75AE450499C0b471bfB70D7BB614b7D429E
   > block number:        8632525
   > block timestamp:     1621723507
   > account:             0xd4B926E00F3258617985E1503305546f3F102Cda
   > balance:             0.964271464
   > gas used:            1261140 (0x133e54)
   > gas price:           20 gwei
   > value sent:          0 ETH
   > total cost:          0.0252228 ETH

   Pausing for 2 confirmations...
   ------------------------------
   > confirmation number: 1 (block: 8632526)
   > confirmation number: 2 (block: 8632527)

   Deploying 'UmiTokenFarm'
   ------------------------
   > transaction hash:    0xaa6577c103688687a03f0ac7b5fa51e158c934cee6e707ccee8c29085c435055
- Blocks: 0            Seconds: 0
   > Blocks: 0            Seconds: 12
   > contract address:    0x3f3277990B4D84A2E9AcE58B4F83d5C431Fc6bAE
   > block number:        8632528
   > block timestamp:     1621723552
   > account:             0xd4B926E00F3258617985E1503305546f3F102Cda
   > balance:             0.914312884
   > gas used:            2497929 (0x261d89)
   > gas price:           20 gwei
   > value sent:          0 ETH
   > total cost:          0.04995858 ETH

   Pausing for 2 confirmations...
   ------------------------------
   > confirmation number: 1 (block: 8632529)
   > confirmation number: 2 (block: 8632530)

- Saving migration to chain.
   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:          0.07518138 ETH


Summary
=======
> Total deployments:   3
> Final cost:          0.08014546 ETH
