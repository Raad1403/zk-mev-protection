# 📚 ZK-MEV Protection: API Reference

## SDK API

### ZKMEVProtectionSDK Class

#### Constructor
```javascript
new ZKMEVProtectionSDK(provider, contractAddress, config)
```

**Parameters:**
- `provider`: Ethereum provider (ethers.js)
- `contractAddress`: MEVProtector contract address
- `config`: Optional configuration object

**Config Options:**
```javascript
{
    circuitWasm: './circuits/mev-protection.wasm',
    circuitZkey: './circuits/mev-protection_final.zkey',
    minDelayBlocks: 2,
    maxDelayBlocks: 10,
    autoReveal: true
}
```

#### Methods

##### `protectSwap(swapParams, signer)`
Protects a DEX swap transaction from MEV attacks.

**Parameters:**
```javascript
swapParams = {
    tokenIn: "0x...",      // Input token address
    tokenOut: "0x...",     // Output token address
    amountIn: "1000...",   // Input amount (wei)
    amountOutMin: "400...", // Minimum output (wei)
    deadline: 1234567890   // Unix timestamp
}
```

**Returns:**
```javascript
{
    commitmentHash: "0x...",
    transactionHash: "0x...",
    estimatedRevealBlock: 12345
}
```

##### `revealTransaction(commitmentHash)`
Reveals and executes a protected transaction.

**Returns:** Transaction receipt object

##### `getProtectionStatus(userAddress)`
Gets protection status for a user.

**Returns:**
```javascript
{
    activeCommitments: 3,
    totalProtected: 150,
    readyForReveal: 1
}
```

##### `estimateProtectionCosts()`
Estimates gas and fee costs for protection.

**Returns:**
```javascript
{
    protectionFee: "0.001",
    commitGasCost: "0.002",
    revealGasCost: "0.003",
    totalCostETH: "0.006"
}
```

##### `startAutoReveal()` / `stopAutoReveal()`
Manages automatic transaction revealing.

## Smart Contract API

### MEVProtector Contract

#### State Variables
```solidity
mapping(uint256 => bool) public commitments;
mapping(uint256 => bool) public nullifiers;
mapping(uint256 => uint256) public commitmentBlocks;
uint256 public constant MIN_DELAY_BLOCKS = 2;
uint256 public constant MAX_DELAY_BLOCKS = 10;
uint256 public protectionFee;
```

#### Functions

##### `submitCommitment(uint256 commitmentHash)`
Submits encrypted transaction commitment.

**Parameters:**
- `commitmentHash`: Hash of encrypted transaction

**Requirements:**
- Must send protection fee
- Commitment must be unique

**Events:**
```solidity
event CommitmentSubmitted(
    uint256 indexed commitmentHash,
    uint256 indexed blockNumber,
    address indexed user
);
```

##### `revealAndExecute(uint[2] a, uint[2][2] b, uint[2] c, uint[3] input)`
Reveals and executes protected transaction.

**Parameters:**
- `a, b, c`: Groth16 proof components
- `input`: Public inputs [commitmentHash, nullifier, blockNumber]

**Returns:** `bool` - Execution success

**Events:**
```solidity
event TransactionRevealed(
    uint256 indexed commitmentHash,
    uint256 indexed nullifier,
    address indexed user,
    bool success
);
```

##### `isReadyForReveal(uint256 commitmentHash)`
Checks if commitment is ready for reveal.

**Returns:** `bool` - Ready status

##### `getCommitmentInfo(uint256 commitmentHash)`
Gets commitment information.

**Returns:**
```solidity
(bool exists, uint256 blockNumber, bool expired)
```

##### `reportMEV(uint256 blockNumber, address attacker, uint256 extractedValue)`
Reports detected MEV activity.

**Events:**
```solidity
event MEVDetected(
    uint256 indexed blockNumber,
    address indexed attacker,
    uint256 extractedValue
);
```

## MEV Detector API

### MEVDetector Class

#### Constructor
```javascript
new MEVDetector(provider, config)
```

**Config Options:**
```javascript
{
    minProfitThreshold: ethers.utils.parseEther("0.01"),
    maxSlippageThreshold: 300, // 3%
    monitoringEnabled: true,
    telegramBot: "bot_token",
    chatId: "chat_id"
}
```

#### Methods

##### `startMonitoring()` / `stopMonitoring()`
Controls MEV detection monitoring.

##### `getStatistics()`
Returns MEV detection statistics.

**Returns:**
```javascript
{
    totalMEVDetected: 150,
    sandwichAttacks: 45,
    frontRunning: 80,
    arbitrageMEV: 25,
    totalValueExtracted: "150.5", // ETH
    protectedTransactions: 1200
}
```

## Circuit API

### MEV Protection Circuit

#### Private Inputs
```circom
signal private input tokenIn;        // Input token address
signal private input tokenOut;       // Output token address
signal private input amountIn;       // Input amount
signal private input amountOutMin;   // Minimum output
signal private input deadline;       // Transaction deadline
signal private input userAddress;    // User's address
signal private input nonce;          // Unique nonce
```

#### Public Inputs
```circom
signal input blockNumber;    // Current block number
signal input signalHash;     // Transaction signal hash
```

#### Outputs
```circom
signal output commitmentHash;  // Public commitment
signal output nullifier;       // Unique nullifier
signal output validityProof;   // Validity proof
```

## Error Codes

### SDK Errors
- `MEV_001`: Invalid swap parameters
- `MEV_002`: Insufficient protection fee
- `MEV_003`: Commitment not found
- `MEV_004`: Not ready for reveal
- `MEV_005`: ZK proof generation failed
- `MEV_006`: Transaction execution failed

### Contract Errors
- `MEV_101`: "Insufficient protection fee"
- `MEV_102`: "Commitment already exists"
- `MEV_103`: "Invalid commitment"
- `MEV_104`: "Nullifier already used"
- `MEV_105`: "Too early to reveal"
- `MEV_106`: "Commitment expired"
- `MEV_107`: "Invalid ZK proof"

## Event Monitoring

### Contract Events

```javascript
// Listen for commitments
mevProtector.on("CommitmentSubmitted", (commitmentHash, blockNumber, user) => {
    console.log(`New commitment: ${commitmentHash} from ${user}`);
});

// Listen for reveals
mevProtector.on("TransactionRevealed", (commitmentHash, nullifier, user, success) => {
    console.log(`Transaction revealed: ${commitmentHash}, success: ${success}`);
});

// Listen for MEV detection
mevProtector.on("MEVDetected", (blockNumber, attacker, extractedValue) => {
    console.log(`MEV detected: ${extractedValue} ETH extracted by ${attacker}`);
});
```

## Gas Optimization

### Estimated Gas Costs

| Operation | Gas Limit | Typical Usage | Cost (30 gwei) |
|-----------|-----------|---------------|----------------|
| Submit Commitment | 100,000 | 80,000 | $7.20 |
| Reveal & Execute | 200,000 | 150,000 | $13.50 |
| MEV Report | 50,000 | 35,000 | $3.15 |

### Optimization Tips

```javascript
// Batch multiple commitments
const commitments = [hash1, hash2, hash3];
await mevProtector.batchSubmitCommitments(commitments, {
    value: protectionFee.mul(commitments.length)
});

// Use optimal gas price
const gasPrice = await provider.getGasPrice();
const optimizedGasPrice = gasPrice.mul(110).div(100); // 10% above current
```

## Rate Limits

### Circuit Proving
- **Max Concurrent Proofs**: 10 per client
- **Proof Generation Time**: 2-5 seconds
- **Memory Usage**: 500MB per proof

### Contract Interactions
- **Max Commitments per Block**: 100
- **Max Reveals per Block**: 50
- **Cooldown Period**: 1 block between user actions

## Network Configurations

### Mainnet Networks

```javascript
const networks = {
    ethereum: {
        chainId: 1,
        rpc: "https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY",
        mevProtector: "0x...",
        gasPrice: "auto"
    },
    base: {
        chainId: 8453,
        rpc: "https://mainnet.base.org",
        mevProtector: "0x...",
        gasPrice: "auto"
    },
    polygon: {
        chainId: 137,
        rpc: "https://polygon-rpc.com",
        mevProtector: "0x...",
        gasPrice: "auto"
    }
};
```

### Testnet Networks

```javascript
const testnets = {
    baseSepolia: {
        chainId: 84532,
        rpc: "https://sepolia.base.org",
        mevProtector: "0x...",
        gasPrice: 2000000000
    },
    polygonMumbai: {
        chainId: 80001,
        rpc: "https://rpc-mumbai.maticvigil.com",
        mevProtector: "0x...",
        gasPrice: 2000000000
    }
};
```

## Integration Examples

### React Frontend

```jsx
import { ZKMEVProtectionSDK } from 'zk-mev-protection';

function SwapComponent() {
    const [protection, setProtection] = useState(null);
    
    const handleProtectedSwap = async () => {
        const sdk = new ZKMEVProtectionSDK(provider, CONTRACT_ADDRESS);
        
        const result = await sdk.protectSwap({
            tokenIn: tokenInAddress,
            tokenOut: tokenOutAddress,
            amountIn: amountIn,
            amountOutMin: amountOutMin,
            deadline: Math.floor(Date.now() / 1000) + 3600
        }, signer);
        
        setProtection(result);
    };
    
    return (
        <button onClick={handleProtectedSwap}>
            🛡️ Protected Swap
        </button>
    );
}
```

### Node.js Backend

```javascript
const express = require('express');
const { ZKMEVProtectionSDK } = require('zk-mev-protection');

const app = express();
const sdk = new ZKMEVProtectionSDK(provider, CONTRACT_ADDRESS);

app.post('/api/protect-swap', async (req, res) => {
    try {
        const { swapParams, userAddress } = req.body;
        
        const protection = await sdk.protectSwap(swapParams, signer);
        
        res.json({
            success: true,
            protection: protection
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});
```

## Testing Framework

### Unit Tests

```javascript
describe("MEV Protection", () => {
    it("should protect swap from MEV", async () => {
        const protection = await sdk.protectSwap(swapParams, signer);
        expect(protection.commitmentHash).to.be.a('string');
    });
});
```

### Integration Tests

```javascript
describe("Full Protection Flow", () => {
    it("should complete commit-reveal cycle", async () => {
        // Submit commitment
        const protection = await sdk.protectSwap(swapParams, signer);
        
        // Wait for reveal time
        await waitForBlocks(3);
        
        // Reveal transaction
        const receipt = await sdk.revealTransaction(protection.commitmentHash);
        expect(receipt.status).to.equal(1);
    });
});
```

---

**Complete API documentation for seamless ZK-MEV Protection integration!**
