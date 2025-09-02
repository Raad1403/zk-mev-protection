# 🔧 ZK-MEV Protection: Integration Guide

## Quick Start

Get MEV protection running in your DeFi protocol in under 30 minutes.

### 1. Installation

```bash
npm install zk-mev-protection
# or
yarn add zk-mev-protection
```

### 2. Basic Setup

```javascript
const { ZKMEVProtectionSDK } = require('zk-mev-protection');

// Initialize SDK
const sdk = new ZKMEVProtectionSDK(
    provider,
    "0x..." // MEVProtector contract address
);

// Protect a swap
const protection = await sdk.protectSwap({
    tokenIn: "0xA0b86a33E6441E2A0E5C3F5A9B4F6B4B4B4B4B4B",
    tokenOut: "0xB0b86a33E6441E2A0E5C3F5A9B4F6B4B4B4B4B4B",
    amountIn: ethers.utils.parseEther("1000"),
    amountOutMin: ethers.utils.parseEther("0.4"),
    deadline: Math.floor(Date.now() / 1000) + 3600
}, signer);
```

## 🏗️ DEX Protocol Integration

### Uniswap V3 Integration

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IMEVProtector.sol";
import "@uniswap/v3-periphery/contracts/SwapRouter.sol";

contract ProtectedSwapRouter {
    IMEVProtector public immutable mevProtector;
    ISwapRouter public immutable swapRouter;
    
    constructor(address _mevProtector, address _swapRouter) {
        mevProtector = IMEVProtector(_mevProtector);
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    function protectedExactInputSingle(
        uint256 commitmentHash,
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[3] calldata input,
        ISwapRouter.ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut) {
        
        // Verify MEV protection
        require(
            mevProtector.revealAndExecute(a, b, c, input),
            "MEV protection verification failed"
        );
        
        // Execute protected swap
        return swapRouter.exactInputSingle(params);
    }
}
```

### SushiSwap Integration

```javascript
// Frontend integration for SushiSwap
class SushiSwapMEVProtection {
    constructor(sdk, sushiRouter) {
        this.sdk = sdk;
        this.sushiRouter = sushiRouter;
    }
    
    async protectedSwap(swapParams, signer) {
        // Generate protection
        const protection = await this.sdk.protectSwap(swapParams, signer);
        
        // Wait for reveal time
        await this.waitForReveal(protection.commitmentHash);
        
        // Execute on SushiSwap
        return await this.sdk.revealTransaction(protection.commitmentHash);
    }
}
```

## 📱 Wallet Integration

### MetaMask Snap Integration

```javascript
// MetaMask Snap for MEV protection
export const onRpcRequest = async ({ origin, request }) => {
    switch (request.method) {
        case 'mev_protect_transaction':
            return await protectTransaction(request.params);
        
        case 'mev_get_protection_status':
            return await getProtectionStatus(request.params);
        
        default:
            throw new Error('Method not found');
    }
};

async function protectTransaction(params) {
    const sdk = new ZKMEVProtectionSDK(ethereum, CONTRACT_ADDRESS);
    
    return await sdk.protectSwap(params.swapParams, params.signer);
}
```

### WalletConnect Integration

```javascript
// WalletConnect v2 integration
import { Core } from '@walletconnect/core';
import { Web3Wallet } from '@walletconnect/web3wallet';

const web3wallet = await Web3Wallet.init({
    core: new Core({
        projectId: 'YOUR_PROJECT_ID'
    }),
    metadata: {
        name: 'MEV Protected Wallet',
        description: 'Wallet with built-in MEV protection',
        url: 'https://your-wallet.com',
        icons: ['https://your-wallet.com/icon.png']
    }
});

// Handle MEV protection requests
web3wallet.on('session_request', async (event) => {
    const { topic, params } = event;
    
    if (params.request.method === 'mev_protect_swap') {
        const protection = await sdk.protectSwap(
            params.request.params.swapParams,
            signer
        );
        
        await web3wallet.respondSessionRequest({
            topic,
            response: {
                id: params.id,
                result: protection,
                jsonrpc: '2.0'
            }
        });
    }
});
```

## 🔌 API Reference

### Core SDK Methods

#### `protectSwap(swapParams, signer)`
Protects a DEX swap from MEV attacks.

**Parameters:**
- `swapParams`: Object containing swap details
- `signer`: Ethereum signer for transactions

**Returns:**
```javascript
{
    commitmentHash: "0x...",
    transactionHash: "0x...",
    estimatedRevealBlock: 12345
}
```

#### `revealTransaction(commitmentHash)`
Reveals and executes a protected transaction.

**Parameters:**
- `commitmentHash`: Hash of the commitment to reveal

**Returns:**
- Transaction receipt object

#### `getProtectionStatus(userAddress)`
Gets protection status for a user.

**Returns:**
```javascript
{
    activeCommitments: 3,
    totalProtected: 150,
    readyForReveal: 1
}
```

### Smart Contract Interface

```solidity
interface IMEVProtector {
    function submitCommitment(uint256 commitmentHash) external payable;
    
    function revealAndExecute(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[3] calldata input
    ) external returns (bool);
    
    function isReadyForReveal(uint256 commitmentHash) external view returns (bool);
    
    function protectionFee() external view returns (uint256);
}
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 16+
- Hardhat development environment
- Circom 2.0+
- snarkjs library

### Local Development

```bash
# Clone repository
git clone https://github.com/your-org/zk-mev-protection
cd zk-mev-protection

# Install dependencies
npm install

# Compile circuits
npm run circuit:compile

# Setup trusted setup (development)
npm run circuit:setup

# Compile contracts
npm run compile

# Run tests
npm test

# Start local node
npm run node

# Deploy to local network
npm run deploy
```

### Circuit Compilation

```bash
# Compile MEV protection circuit
circom circuits/mev-protection.circom --r1cs --wasm --sym

# Generate proving key (development only)
snarkjs groth16 setup circuits/mev-protection.r1cs pot12_final.ptau circuit_final.zkey

# Generate verification key
snarkjs zkey export verificationkey circuit_final.zkey verification_key.json

# Generate Solidity verifier
snarkjs zkey export solidityverifier circuit_final.zkey VerifierMEV.sol
```

## 🌐 Network Deployment

### Supported Networks

| Network | Chain ID | Contract Address | Status |
|---------|----------|------------------|--------|
| Ethereum Mainnet | 1 | TBD | Planned |
| Base | 8453 | TBD | Planned |
| Polygon | 137 | TBD | Planned |
| Arbitrum | 42161 | TBD | Planned |
| Optimism | 10 | TBD | Planned |

### Testnet Addresses

| Network | Chain ID | MEVProtector | VerifierMEV |
|---------|----------|--------------|-------------|
| Base Sepolia | 84532 | `0x...` | `0x...` |
| Polygon Mumbai | 80001 | `0x...` | `0x...` |

## 🔒 Security Considerations

### Circuit Security
- **Trusted Setup**: Use production ceremony keys
- **Constraint Verification**: Audit all circuit constraints
- **Input Validation**: Validate all public inputs

### Smart Contract Security
- **Access Control**: Owner-only administrative functions
- **Reentrancy Protection**: ReentrancyGuard on all state changes
- **Integer Overflow**: SafeMath for all arithmetic

### Integration Security
- **Private Key Management**: Never expose private keys
- **RPC Security**: Use secure RPC endpoints
- **Circuit Files**: Verify circuit integrity

## 📊 Monitoring & Analytics

### MEV Detection Dashboard

```javascript
// Real-time MEV monitoring
const detector = new MEVDetector(provider, {
    minProfitThreshold: ethers.utils.parseEther("0.01"),
    telegramAlerts: true
});

await detector.startMonitoring();

// Get statistics
const stats = detector.getStatistics();
console.log("MEV Events Detected:", stats.totalMEVDetected);
```

### Protection Analytics

```javascript
// Track protection effectiveness
const analytics = {
    transactionsProtected: 1500,
    mevSaved: ethers.utils.parseEther("150"), // 150 ETH saved
    averageSavings: "0.1 ETH per transaction",
    protectionRate: "95.2%"
};
```

## 🎯 Best Practices

### For Protocol Integrators
1. **Gradual Rollout**: Start with 10% of transactions
2. **User Education**: Explain MEV protection benefits
3. **Cost Transparency**: Show protection costs vs savings
4. **Fallback Option**: Allow users to opt-out

### For Wallet Developers
1. **Seamless UX**: Hide complexity from users
2. **Cost Estimation**: Show protection costs upfront
3. **Status Updates**: Real-time protection status
4. **Error Handling**: Graceful fallback to unprotected

### For Trading Firms
1. **Batch Protection**: Protect multiple trades together
2. **Custom Circuits**: Optimize for specific strategies
3. **Private Deployment**: Consider private instances
4. **Compliance Integration**: MEV reporting for audits

## 🆘 Support & Troubleshooting

### Common Issues

**Circuit Compilation Fails**
```bash
# Solution: Update circom and dependencies
npm update circom snarkjs
```

**High Gas Costs**
```bash
# Solution: Optimize gas price and timing
const gasPrice = await provider.getGasPrice();
const optimizedGasPrice = gasPrice.mul(110).div(100); // 10% above current
```

**Proof Generation Slow**
```javascript
// Solution: Use WebAssembly for faster proving
const sdk = new ZKMEVProtectionSDK(provider, address, {
    useWasm: true,
    wasmPath: './circuits/mev-protection.wasm'
});
```

### Getting Help
- **Documentation**: https://docs.zk-mev-protection.com
- **Discord**: https://discord.gg/zk-mev-protection
- **GitHub Issues**: https://github.com/your-org/zk-mev-protection/issues
- **Email Support**: support@zk-mev-protection.com

## 🚀 Ready to Integrate?

1. **Read the docs**: Start with this integration guide
2. **Run the demo**: `npm run demo` for hands-on experience
3. **Join our Discord**: Get help from the community
4. **Schedule a call**: Book technical consultation

**Let's build a MEV-free DeFi ecosystem together!**
