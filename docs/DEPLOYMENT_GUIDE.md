# 🚀 ZK-MEV Protection: Deployment Guide

## Production Deployment Checklist

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] Hardhat environment configured
- [ ] Private keys secured (hardware wallet recommended)
- [ ] RPC endpoints configured for target networks
- [ ] Etherscan API keys for contract verification

## 🔧 Environment Setup

### 1. Clone and Install

```bash
git clone https://github.com/your-org/zk-mev-protection
cd zk-mev-protection
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Required environment variables:
```bash
# Network RPCs
BASE_SEPOLIA_RPC=https://sepolia.base.org
POLYGON_MUMBAI_RPC=https://rpc-mumbai.maticvigil.com

# Private key (use hardware wallet for mainnet)
PRIVATE_KEY=0x...

# API keys for verification
BASESCAN_API_KEY=...
POLYGONSCAN_API_KEY=...

# MEV protection settings
MEV_PROTECTION_FEE=0.001
MIN_DELAY_BLOCKS=2
MAX_DELAY_BLOCKS=10
```

## 🏗️ Circuit Setup

### 1. Compile Circuits

```bash
# Install circom if not already installed
npm install -g circom

# Compile MEV protection circuit
circom circuits/mev-protection.circom --r1cs --wasm --sym -o circuits/build/
```

### 2. Trusted Setup (Production)

```bash
# Download ceremony files (production)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau

# Generate proving key
snarkjs groth16 setup circuits/build/mev-protection.r1cs powersOfTau28_hez_final_15.ptau circuits/mev-protection_final.zkey

# Generate verification key
snarkjs zkey export verificationkey circuits/mev-protection_final.zkey circuits/verification_key.json

# Generate Solidity verifier
snarkjs zkey export solidityverifier circuits/mev-protection_final.zkey contracts/VerifierMEV.sol
```

## 📋 Smart Contract Deployment

### 1. Compile Contracts

```bash
npx hardhat compile
```

### 2. Deploy to Testnet

```bash
# Deploy to Base Sepolia
npx hardhat run scripts/deploy.js --network baseSepolia

# Deploy to Polygon Mumbai
npx hardhat run scripts/deploy.js --network polygonMumbai
```

### 3. Verify Contracts

```bash
# Verify on Base Sepolia
npx hardhat verify --network baseSepolia DEPLOYED_ADDRESS

# Verify on Polygon Mumbai
npx hardhat verify --network polygonMumbai DEPLOYED_ADDRESS
```

## 🌐 Mainnet Deployment

### Security Checklist
- [ ] **Audit Complete**: Professional smart contract audit
- [ ] **Testnet Validated**: Extensive testnet testing
- [ ] **Circuit Verified**: Trusted setup ceremony completed
- [ ] **Multisig Setup**: Use multisig for contract ownership
- [ ] **Emergency Pause**: Implement emergency stop mechanism

### Deployment Steps

```bash
# 1. Final security check
npm run test
npm run coverage

# 2. Deploy to mainnet
npx hardhat run scripts/deploy.js --network mainnet

# 3. Verify contracts
npx hardhat verify --network mainnet DEPLOYED_ADDRESS

# 4. Transfer ownership to multisig
npx hardhat run scripts/transfer-ownership.js --network mainnet
```

## 🔍 Post-Deployment Verification

### 1. Contract Verification

```javascript
// Verify deployment
const mevProtector = await ethers.getContractAt("MEVProtector", DEPLOYED_ADDRESS);

// Check initial state
console.log("Protection Fee:", await mevProtector.protectionFee());
console.log("Owner:", await mevProtector.owner());
console.log("Verifier:", await mevProtector.verifierMEV());
```

### 2. Circuit Testing

```bash
# Test circuit with sample inputs
node scripts/test-circuit.js

# Verify proof generation and verification
npm run circuit:test
```

### 3. Integration Testing

```bash
# Run full integration demo
npm run demo

# Test with real DEX interactions
npm run integration:test
```

## 📊 Monitoring Setup

### 1. MEV Detection Monitoring

```javascript
// Production monitoring setup
const detector = new MEVDetector(provider, {
    telegramBot: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    alertThreshold: ethers.utils.parseEther("0.1")
});

await detector.startMonitoring();
```

### 2. System Health Monitoring

```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
    const health = {
        contracts: await checkContractHealth(),
        circuits: await checkCircuitHealth(),
        rpc: await checkRPCHealth(),
        timestamp: new Date().toISOString()
    };
    
    res.json(health);
});
```

## 🔐 Security Best Practices

### Private Key Management
```bash
# Use hardware wallet for mainnet
# Never commit private keys to git
# Use environment variables for secrets
# Implement key rotation policies
```

### Circuit Security
```bash
# Verify circuit hash matches trusted version
sha256sum circuits/mev-protection.circom

# Use production trusted setup
# Verify ceremony transcript
# Backup proving keys securely
```

### Contract Security
```bash
# Use multisig for ownership
# Implement timelock for critical changes
# Monitor for unusual activity
# Regular security audits
```

## 📈 Scaling Configuration

### High-Volume Setup

```javascript
// Optimized for high transaction volume
const config = {
    batchSize: 100,
    parallelProving: true,
    cacheProofs: true,
    gasOptimization: true
};

const sdk = new ZKMEVProtectionSDK(provider, address, config);
```

### Load Balancing

```javascript
// Multiple RPC endpoints for reliability
const providers = [
    new ethers.providers.JsonRpcProvider(RPC_1),
    new ethers.providers.JsonRpcProvider(RPC_2),
    new ethers.providers.JsonRpcProvider(RPC_3)
];

const loadBalancer = new RPCLoadBalancer(providers);
```

## 🚨 Emergency Procedures

### Circuit Compromise
1. **Immediate**: Pause all new commitments
2. **Notify**: Alert all integrated protocols
3. **Investigate**: Determine compromise scope
4. **Remediate**: Deploy new circuit version
5. **Resume**: Gradual service restoration

### Contract Exploit
1. **Emergency Pause**: Activate pause mechanism
2. **Assess Damage**: Determine exploit impact
3. **User Communication**: Transparent incident report
4. **Fix Deploy**: Deploy patched contracts
5. **Compensation**: Consider user reimbursement

## 📞 Support Contacts

### Technical Support
- **Discord**: https://discord.gg/zk-mev-protection
- **Email**: tech-support@zk-mev-protection.com
- **GitHub**: https://github.com/your-org/zk-mev-protection/issues

### Business Support
- **Sales**: sales@zk-mev-protection.com
- **Partnerships**: partnerships@zk-mev-protection.com
- **Enterprise**: enterprise@zk-mev-protection.com

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Code review completed
- [ ] Security audit passed
- [ ] Testnet deployment successful
- [ ] Integration testing completed
- [ ] Documentation updated
- [ ] Team training completed

### Deployment
- [ ] Circuits compiled and verified
- [ ] Contracts deployed and verified
- [ ] Ownership transferred to multisig
- [ ] Monitoring systems active
- [ ] Emergency procedures tested

### Post-Deployment
- [ ] Integration partners notified
- [ ] Documentation published
- [ ] Community announcement
- [ ] Marketing campaign launched
- [ ] Support team ready
- [ ] Success metrics tracking

## 🎉 Go Live!

Once all checklist items are complete:

1. **Announce**: Public launch announcement
2. **Monitor**: 24/7 monitoring for first 48 hours
3. **Support**: Rapid response team ready
4. **Iterate**: Collect feedback and improve

**Your ZK-MEV Protection system is now live and protecting DeFi users from MEV attacks!**
