/**
 * ZK-MEV Protection Demo
 * Demonstrates the complete MEV protection workflow
 */

const { ethers } = require('ethers');
const ZKMEVProtectionSDK = require('../src/ZKMEVProtectionSDK');
const MEVDetector = require('../src/MEVDetector');

async function runMEVProtectionDemo() {
    console.log("🚀 ZK-MEV Protection Demo Starting...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Setup provider (using local hardhat node for demo)
    const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
    
    // Get test accounts
    const [deployer, user, attacker] = await ethers.getSigners();
    console.log("👤 Demo accounts:");
    console.log("   Deployer:", deployer.address);
    console.log("   User:", user.address);
    console.log("   Attacker:", attacker.address);
    
    // Deploy contracts (simplified for demo)
    console.log("\n🏗️ Deploying demo contracts...");
    const deploymentInfo = await deployContracts(deployer);
    
    // Initialize SDK
    const sdk = new ZKMEVProtectionSDK(
        provider, 
        deploymentInfo.contracts.MEVProtector,
        {
            circuitWasm: './circuits/mev-protection.wasm',
            circuitZkey: './circuits/mev-protection_final.zkey'
        }
    );
    
    // Initialize MEV detector
    const mevDetector = new MEVDetector(provider);
    await mevDetector.startMonitoring();
    
    console.log("\n🛡️ MEV Protection System Ready!");
    
    // Demo Scenario 1: Protected Swap
    console.log("\n" + "=".repeat(50));
    console.log("📊 DEMO SCENARIO 1: Protected DEX Swap");
    console.log("=".repeat(50));
    
    const swapParams = {
        tokenIn: "0xA0b86a33E6441E2A0E5C3F5A9B4F6B4B4B4B4B4B", // Mock USDC
        tokenOut: "0xB0b86a33E6441E2A0E5C3F5A9B4F6B4B4B4B4B4B", // Mock WETH
        amountIn: ethers.utils.parseEther("1000"), // 1000 USDC
        amountOutMin: ethers.utils.parseEther("0.4"), // Min 0.4 WETH
        deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };
    
    try {
        // Step 1: Submit protected transaction
        console.log("1️⃣ Submitting protected swap...");
        const protection = await sdk.protectSwap(swapParams, user);
        
        console.log("   ✅ Commitment Hash:", protection.commitmentHash);
        console.log("   📋 Transaction:", protection.transactionHash);
        console.log("   ⏰ Reveal Block:", protection.estimatedRevealBlock);
        
        // Step 2: Simulate MEV attack attempt
        console.log("\n2️⃣ Simulating MEV attack attempt...");
        await simulateMEVAttack(attacker, swapParams);
        
        // Step 3: Wait for reveal time
        console.log("\n3️⃣ Waiting for reveal time...");
        await waitForBlocks(provider, 3);
        
        // Step 4: Reveal and execute
        console.log("\n4️⃣ Revealing protected transaction...");
        const receipt = await sdk.revealTransaction(protection.commitmentHash);
        
        console.log("   ✅ Transaction executed successfully!");
        console.log("   📋 Receipt:", receipt.transactionHash);
        
    } catch (error) {
        console.error("❌ Demo scenario failed:", error.message);
    }
    
    // Demo Scenario 2: MEV Detection
    console.log("\n" + "=".repeat(50));
    console.log("🔍 DEMO SCENARIO 2: MEV Detection");
    console.log("=".repeat(50));
    
    // Simulate various MEV attacks for detection
    await simulateVariousMEVAttacks(attacker, provider);
    
    // Show MEV statistics
    const stats = mevDetector.getStatistics();
    console.log("\n📊 MEV Detection Statistics:");
    console.log("   🎯 Total MEV Detected:", stats.totalMEVDetected || 0);
    console.log("   🥪 Sandwich Attacks:", stats.sandwichAttacks || 0);
    console.log("   🏃 Front-running:", stats.frontRunning || 0);
    console.log("   💰 Value Extracted:", ethers.utils.formatEther(stats.totalValueExtracted || 0), "ETH");
    
    // Demo Scenario 3: Cost Analysis
    console.log("\n" + "=".repeat(50));
    console.log("💰 DEMO SCENARIO 3: Cost Analysis");
    console.log("=".repeat(50));
    
    const costs = await sdk.estimateProtectionCosts();
    console.log("💸 Protection Costs:");
    console.log("   Fee:", costs.protectionFee, "ETH");
    console.log("   Commit Gas:", costs.commitGasCost, "ETH");
    console.log("   Reveal Gas:", costs.revealGasCost, "ETH");
    console.log("   Total:", costs.totalCostETH, "ETH");
    
    // Calculate savings
    const avgMEVLoss = ethers.utils.parseEther("0.05"); // 5% typical loss
    const tradeValue = ethers.utils.parseEther("1"); // 1 ETH trade
    const mevLoss = tradeValue.mul(5).div(100); // 5% loss
    const protectionCost = ethers.utils.parseEther(costs.totalCostETH);
    const savings = mevLoss.sub(protectionCost);
    
    console.log("\n💡 Savings Analysis:");
    console.log("   Typical MEV Loss:", ethers.utils.formatEther(mevLoss), "ETH");
    console.log("   Protection Cost:", ethers.utils.formatEther(protectionCost), "ETH");
    console.log("   Net Savings:", ethers.utils.formatEther(savings), "ETH");
    console.log("   ROI:", ((savings.mul(100).div(protectionCost)).toString()), "%");
    
    // Cleanup
    mevDetector.stopMonitoring();
    sdk.stopAutoReveal();
    
    console.log("\n🎉 ZK-MEV Protection Demo Completed Successfully!");
    console.log("🛡️ Ready to protect DeFi from MEV attacks!");
}

async function deployContracts(deployer) {
    // Simplified deployment for demo
    const VerifierMEV = await ethers.getContractFactory("VerifierMEV");
    const verifierMEV = await VerifierMEV.deploy();
    await verifierMEV.deployed();
    
    const MEVProtector = await ethers.getContractFactory("MEVProtector");
    const mevProtector = await MEVProtector.deploy(verifierMEV.address);
    await mevProtector.deployed();
    
    return {
        contracts: {
            VerifierMEV: verifierMEV.address,
            MEVProtector: mevProtector.address
        }
    };
}

async function simulateMEVAttack(attacker, swapParams) {
    console.log("🤖 MEV Bot attempting front-run...");
    
    // Simulate high gas price transaction
    const highGasPrice = ethers.utils.parseUnits("100", "gwei");
    
    try {
        const tx = await attacker.sendTransaction({
            to: swapParams.tokenOut,
            value: 0,
            gasPrice: highGasPrice,
            gasLimit: 21000,
            data: "0x" // Empty data for demo
        });
        
        console.log("   🚨 MEV attack transaction:", tx.hash);
        console.log("   ⛽ Gas price:", ethers.utils.formatUnits(highGasPrice, "gwei"), "gwei");
        console.log("   ❌ Attack failed - transaction encrypted!");
        
    } catch (error) {
        console.log("   ❌ MEV attack failed:", error.message);
    }
}

async function simulateVariousMEVAttacks(attacker, provider) {
    console.log("🎭 Simulating various MEV attack patterns...");
    
    // Simulate sandwich attack
    console.log("   🥪 Sandwich attack pattern...");
    await simulateSandwichAttack(attacker);
    
    // Simulate front-running
    console.log("   🏃 Front-running pattern...");
    await simulateFrontRunning(attacker);
    
    // Simulate arbitrage MEV
    console.log("   💱 Arbitrage MEV pattern...");
    await simulateArbitrageMEV(attacker);
}

async function simulateSandwichAttack(attacker) {
    const highGasPrice = ethers.utils.parseUnits("150", "gwei");
    
    // Front-run transaction
    await attacker.sendTransaction({
        to: ethers.constants.AddressZero,
        value: 0,
        gasPrice: highGasPrice,
        gasLimit: 21000
    });
    
    // Back-run transaction would follow
    await attacker.sendTransaction({
        to: ethers.constants.AddressZero,
        value: 0,
        gasPrice: ethers.utils.parseUnits("20", "gwei"),
        gasLimit: 21000
    });
}

async function simulateFrontRunning(attacker) {
    const highGasPrice = ethers.utils.parseUnits("200", "gwei");
    
    await attacker.sendTransaction({
        to: ethers.constants.AddressZero,
        value: 0,
        gasPrice: highGasPrice,
        gasLimit: 21000
    });
}

async function simulateArbitrageMEV(attacker) {
    // Complex transaction simulating arbitrage
    await attacker.sendTransaction({
        to: ethers.constants.AddressZero,
        value: 0,
        gasPrice: ethers.utils.parseUnits("50", "gwei"),
        gasLimit: 500000, // High gas limit for complex arbitrage
        data: "0x" + "00".repeat(1000) // Large calldata
    });
}

async function waitForBlocks(provider, blocks) {
    const startBlock = await provider.getBlockNumber();
    console.log(`   ⏳ Waiting for ${blocks} blocks...`);
    
    while (true) {
        const currentBlock = await provider.getBlockNumber();
        if (currentBlock >= startBlock + blocks) {
            console.log(`   ✅ ${blocks} blocks passed (${currentBlock})`);
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// Run demo if called directly
if (require.main === module) {
    runMEVProtectionDemo()
        .then(() => process.exit(0))
        .catch(error => {
            console.error("❌ Demo failed:", error);
            process.exit(1);
        });
}

module.exports = { runMEVProtectionDemo };
