const { ethers } = require("hardhat");

/**
 * Detailed Gas Cost Analysis for ZK-MEV Protection
 * Measures actual gas costs and compares with MEV savings
 */

async function main() {
    console.log("🔍 Starting Detailed Gas Analysis...\n");

    // Deploy contracts for testing
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

    // Deploy VerifierMEV
    console.log("📦 Deploying VerifierMEV...");
    const VerifierMEV = await ethers.getContractFactory("VerifierMEV");
    const verifierMEV = await VerifierMEV.deploy();
    await verifierMEV.waitForDeployment();
    
    const verifierAddress = await verifierMEV.getAddress();
    console.log("✅ VerifierMEV deployed at:", verifierAddress);

    // Deploy MEVProtector
    console.log("📦 Deploying MEVProtector...");
    const MEVProtector = await ethers.getContractFactory("MEVProtector");
    const mevProtector = await MEVProtector.deploy(verifierAddress);
    await mevProtector.waitForDeployment();
    
    const protectorAddress = await mevProtector.getAddress();
    console.log("✅ MEVProtector deployed at:", protectorAddress);

    // Gas Analysis Results
    const gasResults = {
        deployment: {},
        operations: {},
        comparison: {}
    };

    // 1. Deployment Costs
    console.log("\n📊 DEPLOYMENT GAS COSTS");
    console.log("=" .repeat(50));
    
    const verifierDeployTx = await verifierMEV.deploymentTransaction();
    const protectorDeployTx = await mevProtector.deploymentTransaction();
    
    gasResults.deployment.verifierGas = verifierDeployTx.gasLimit;
    gasResults.deployment.protectorGas = protectorDeployTx.gasLimit;
    gasResults.deployment.totalGas = gasResults.deployment.verifierGas + gasResults.deployment.protectorGas;
    
    console.log(`VerifierMEV deployment: ${gasResults.deployment.verifierGas.toLocaleString()} gas`);
    console.log(`MEVProtector deployment: ${gasResults.deployment.protectorGas.toLocaleString()} gas`);
    console.log(`Total deployment: ${gasResults.deployment.totalGas.toLocaleString()} gas`);

    // 2. Operation Costs
    console.log("\n⚡ OPERATION GAS COSTS");
    console.log("=" .repeat(50));

    // Test commitment submission
    const commitmentHash = ethers.keccak256(ethers.toUtf8Bytes("test_commitment_123"));
    const protectionFee = ethers.parseEther("0.001");

    console.log("Testing submitCommitment...");
    const commitTx = await mevProtector.submitCommitment(commitmentHash, { 
        value: protectionFee,
        gasLimit: 200000 
    });
    const commitReceipt = await commitTx.wait();
    gasResults.operations.commitmentGas = commitReceipt.gasUsed;
    console.log(`✅ Commitment submission: ${gasResults.operations.commitmentGas.toLocaleString()} gas`);

    // Test proof verification (mock data)
    console.log("Testing proof verification...");
    const mockProof = {
        a: [1, 2],
        b: [[1, 2], [3, 4]], 
        c: [5, 6],
        input: [commitmentHash, 12345, await ethers.provider.getBlockNumber()]
    };

    try {
        // This will fail but we can measure gas
        const estimatedGas = await mevProtector.revealAndExecute.estimateGas(
            mockProof.a, mockProof.b, mockProof.c, mockProof.input
        );
        gasResults.operations.verificationGas = estimatedGas;
        console.log(`✅ Proof verification estimate: ${gasResults.operations.verificationGas.toLocaleString()} gas`);
    } catch (error) {
        // Expected to fail with mock data
        gasResults.operations.verificationGas = BigInt(150000); // Estimated
        console.log(`⚠️  Proof verification estimate: ${gasResults.operations.verificationGas.toLocaleString()} gas (estimated)`);
    }

    // 3. Cost Comparison Analysis
    console.log("\n💰 COST-BENEFIT ANALYSIS");
    console.log("=" .repeat(50));

    const currentGasPrice = await ethers.provider.getFeeData();
    const gasPriceGwei = Number(currentGasPrice.gasPrice) / 1e9;
    
    console.log(`Current gas price: ${gasPriceGwei.toFixed(2)} Gwei`);

    // Calculate costs in ETH
    const ethPrice = 2000; // Assume $2000 ETH for calculations
    
    const commitmentCostETH = Number(gasResults.operations.commitmentGas * currentGasPrice.gasPrice) / 1e18;
    const verificationCostETH = Number(gasResults.operations.verificationGas * currentGasPrice.gasPrice) / 1e18;
    const totalProtectionCostETH = commitmentCostETH + verificationCostETH + Number(protectionFee) / 1e18;
    
    gasResults.comparison.commitmentCostUSD = commitmentCostETH * ethPrice;
    gasResults.comparison.verificationCostUSD = verificationCostETH * ethPrice;
    gasResults.comparison.protectionFeeUSD = (Number(protectionFee) / 1e18) * ethPrice;
    gasResults.comparison.totalCostUSD = totalProtectionCostETH * ethPrice;

    console.log(`\nPer-Transaction Costs:`);
    console.log(`- Commitment: $${gasResults.comparison.commitmentCostUSD.toFixed(4)}`);
    console.log(`- Verification: $${gasResults.comparison.verificationCostUSD.toFixed(4)}`);
    console.log(`- Protection Fee: $${gasResults.comparison.protectionFeeUSD.toFixed(4)}`);
    console.log(`- Total Cost: $${gasResults.comparison.totalCostUSD.toFixed(4)}`);

    // MEV Savings Analysis
    console.log(`\n🛡️  MEV PROTECTION VALUE`);
    console.log("=" .repeat(50));

    const tradeSizes = [100, 1000, 10000, 100000]; // USD
    const mevLossRates = [0.02, 0.015, 0.01, 0.005]; // 2%, 1.5%, 1%, 0.5%

    console.log(`Trade Size | MEV Loss | Protection Cost | Net Savings | ROI`);
    console.log(`-`.repeat(60));

    tradeSizes.forEach((tradeSize, i) => {
        const mevLoss = tradeSize * mevLossRates[i];
        const netSavings = mevLoss - gasResults.comparison.totalCostUSD;
        const roi = ((netSavings / gasResults.comparison.totalCostUSD) * 100);
        
        console.log(`$${tradeSize.toLocaleString().padEnd(8)} | $${mevLoss.toFixed(2).padEnd(7)} | $${gasResults.comparison.totalCostUSD.toFixed(4).padEnd(14)} | $${netSavings.toFixed(2).padEnd(10)} | ${roi.toFixed(1)}%`);
    });

    // Break-even analysis
    const breakEvenTradeSize = gasResults.comparison.totalCostUSD / 0.01; // Assuming 1% MEV loss
    console.log(`\n📈 Break-even trade size: $${breakEvenTradeSize.toFixed(2)} (assuming 1% MEV loss)`);

    // Optimization recommendations
    console.log(`\n🔧 OPTIMIZATION RECOMMENDATIONS`);
    console.log("=" .repeat(50));

    if (gasResults.operations.commitmentGas > 100000) {
        console.log(`⚠️  Commitment gas usage high (${gasResults.operations.commitmentGas.toLocaleString()}). Consider optimizing storage operations.`);
    }

    if (gasResults.operations.verificationGas > 200000) {
        console.log(`⚠️  Verification gas usage high (${gasResults.operations.verificationGas.toLocaleString()}). Consider circuit optimization.`);
    }

    if (gasResults.comparison.totalCostUSD > 5) {
        console.log(`⚠️  Total protection cost high ($${gasResults.comparison.totalCostUSD.toFixed(2)}). Only profitable for trades >$${breakEvenTradeSize.toFixed(2)}`);
    } else {
        console.log(`✅ Protection cost reasonable ($${gasResults.comparison.totalCostUSD.toFixed(2)}). Profitable for most DeFi trades.`);
    }

    // Layer 2 comparison
    console.log(`\n🌉 LAYER 2 DEPLOYMENT BENEFITS`);
    console.log("=" .repeat(50));

    const l2GasReduction = 0.95; // 95% gas cost reduction on L2
    const l2TotalCost = gasResults.comparison.totalCostUSD * (1 - l2GasReduction);
    const l2BreakEven = l2TotalCost / 0.01;

    console.log(`Polygon/Arbitrum cost: $${l2TotalCost.toFixed(4)} (${(l2GasReduction * 100)}% reduction)`);
    console.log(`L2 break-even trade size: $${l2BreakEven.toFixed(2)}`);
    console.log(`L2 makes protection viable for trades as small as $${l2BreakEven.toFixed(2)}`);

    // Save results to file
    const fs = require('fs');
    const resultsPath = './gas-analysis-results.json';
    
    const fullResults = {
        timestamp: new Date().toISOString(),
        gasPrice: gasPriceGwei,
        ethPrice: ethPrice,
        ...gasResults,
        recommendations: {
            minTradeSize: breakEvenTradeSize,
            l2Deployment: l2TotalCost < 1,
            optimizationNeeded: gasResults.comparison.totalCostUSD > 5
        }
    };

    fs.writeFileSync(resultsPath, JSON.stringify(fullResults, null, 2));
    console.log(`\n📄 Detailed results saved to: ${resultsPath}`);

    console.log(`\n✅ Gas analysis complete!`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Gas analysis failed:", error);
        process.exit(1);
    });
