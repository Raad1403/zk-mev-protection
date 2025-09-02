/**
 * Gas Analysis Script
 * Analyzes gas costs for MEV protection operations
 */

const { ethers } = require('hardhat');

async function analyzeGasCosts() {
    console.log("⛽ ZK-MEV Protection Gas Analysis");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const [deployer, user] = await ethers.getSigners();
    
    // Deploy contracts for testing
    console.log("🏗️ Deploying contracts for gas analysis...");
    
    const VerifierMEV = await ethers.getContractFactory("VerifierMEV");
    const verifierMEV = await VerifierMEV.deploy();
    await verifierMEV.deployed();
    
    const MEVProtector = await ethers.getContractFactory("MEVProtector");
    const mevProtector = await MEVProtector.deploy(verifierMEV.address);
    await mevProtector.deployed();
    
    console.log("✅ Contracts deployed for testing");
    
    // Test gas costs
    const gasResults = {};
    
    // 1. Commitment submission
    console.log("\n1️⃣ Testing commitment submission...");
    const commitmentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
    const protectionFee = await mevProtector.protectionFee();
    
    const commitTx = await mevProtector.connect(user).submitCommitment(commitmentHash, {
        value: protectionFee
    });
    const commitReceipt = await commitTx.wait();
    
    gasResults.commitmentSubmission = {
        gasUsed: commitReceipt.gasUsed.toString(),
        gasPrice: commitReceipt.effectiveGasPrice.toString(),
        costETH: ethers.utils.formatEther(
            commitReceipt.gasUsed.mul(commitReceipt.effectiveGasPrice)
        ),
        costUSD: calculateUSDCost(
            commitReceipt.gasUsed.mul(commitReceipt.effectiveGasPrice)
        )
    };
    
    console.log(`   ⛽ Gas used: ${gasResults.commitmentSubmission.gasUsed}`);
    console.log(`   💰 Cost: ${gasResults.commitmentSubmission.costETH} ETH ($${gasResults.commitmentSubmission.costUSD})`);
    
    // 2. MEV reporting
    console.log("\n2️⃣ Testing MEV reporting...");
    const blockNumber = await ethers.provider.getBlockNumber();
    const extractedValue = ethers.utils.parseEther("0.1");
    
    const reportTx = await mevProtector.connect(user).reportMEV(
        blockNumber,
        deployer.address,
        extractedValue
    );
    const reportReceipt = await reportTx.wait();
    
    gasResults.mevReporting = {
        gasUsed: reportReceipt.gasUsed.toString(),
        gasPrice: reportReceipt.effectiveGasPrice.toString(),
        costETH: ethers.utils.formatEther(
            reportReceipt.gasUsed.mul(reportReceipt.effectiveGasPrice)
        ),
        costUSD: calculateUSDCost(
            reportReceipt.gasUsed.mul(reportReceipt.effectiveGasPrice)
        )
    };
    
    console.log(`   ⛽ Gas used: ${gasResults.mevReporting.gasUsed}`);
    console.log(`   💰 Cost: ${gasResults.mevReporting.costETH} ETH ($${gasResults.mevReporting.costUSD})`);
    
    // 3. Batch operations simulation
    console.log("\n3️⃣ Simulating batch operations...");
    
    const batchSize = 10;
    let totalGas = ethers.BigNumber.from(0);
    
    for (let i = 0; i < batchSize; i++) {
        const batchCommitment = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(`batch_test_${i}`)
        );
        
        const batchTx = await mevProtector.connect(user).submitCommitment(batchCommitment, {
            value: protectionFee
        });
        const batchReceipt = await batchTx.wait();
        totalGas = totalGas.add(batchReceipt.gasUsed);
    }
    
    const avgGasPerCommitment = totalGas.div(batchSize);
    gasResults.batchOperations = {
        batchSize: batchSize,
        totalGas: totalGas.toString(),
        avgGasPerCommitment: avgGasPerCommitment.toString(),
        totalCostETH: ethers.utils.formatEther(
            totalGas.mul(await ethers.provider.getGasPrice())
        )
    };
    
    console.log(`   📦 Batch size: ${batchSize} commitments`);
    console.log(`   ⛽ Average gas per commitment: ${avgGasPerCommitment}`);
    console.log(`   💰 Total batch cost: ${gasResults.batchOperations.totalCostETH} ETH`);
    
    // Generate comprehensive report
    console.log("\n📊 Gas Analysis Report");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    generateGasReport(gasResults);
    
    // Save results to file
    const reportFile = path.join(__dirname, '../gas-analysis-report.json');
    fs.writeFileSync(reportFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        network: await ethers.provider.getNetwork(),
        gasResults: gasResults,
        recommendations: generateRecommendations(gasResults)
    }, null, 2));
    
    console.log(`\n📁 Report saved to: ${reportFile}`);
}

function calculateUSDCost(weiCost, ethPrice = 3000) {
    const ethCost = parseFloat(ethers.utils.formatEther(weiCost));
    return (ethCost * ethPrice).toFixed(2);
}

function generateGasReport(results) {
    console.log("\n🔍 Detailed Gas Analysis:");
    
    // Commitment submission analysis
    console.log("\n📝 Commitment Submission:");
    console.log(`   Gas Used: ${parseInt(results.commitmentSubmission.gasUsed).toLocaleString()}`);
    console.log(`   Cost: ${results.commitmentSubmission.costETH} ETH ($${results.commitmentSubmission.costUSD})`);
    
    // MEV reporting analysis
    console.log("\n🚨 MEV Reporting:");
    console.log(`   Gas Used: ${parseInt(results.mevReporting.gasUsed).toLocaleString()}`);
    console.log(`   Cost: ${results.mevReporting.costETH} ETH ($${results.mevReporting.costUSD})`);
    
    // Batch operations analysis
    console.log("\n📦 Batch Operations:");
    console.log(`   Average Gas: ${parseInt(results.batchOperations.avgGasPerCommitment).toLocaleString()}`);
    console.log(`   Batch Efficiency: ${calculateBatchEfficiency(results)}%`);
    
    // Cost comparison
    console.log("\n💰 Cost vs MEV Savings:");
    const protectionCost = parseFloat(results.commitmentSubmission.costUSD);
    const avgMEVLoss = 50; // $50 average MEV loss per transaction
    const savings = avgMEVLoss - protectionCost;
    const roi = ((savings / protectionCost) * 100).toFixed(0);
    
    console.log(`   Protection Cost: $${protectionCost}`);
    console.log(`   Average MEV Loss: $${avgMEVLoss}`);
    console.log(`   Net Savings: $${savings.toFixed(2)}`);
    console.log(`   ROI: ${roi}%`);
}

function calculateBatchEfficiency(results) {
    const singleGas = parseInt(results.commitmentSubmission.gasUsed);
    const batchAvgGas = parseInt(results.batchOperations.avgGasPerCommitment);
    
    return ((singleGas - batchAvgGas) / singleGas * 100).toFixed(1);
}

function generateRecommendations(results) {
    const recommendations = [];
    
    const commitGas = parseInt(results.commitmentSubmission.gasUsed);
    const reportGas = parseInt(results.mevReporting.gasUsed);
    
    if (commitGas > 100000) {
        recommendations.push("Consider optimizing commitment submission gas usage");
    }
    
    if (reportGas > 50000) {
        recommendations.push("MEV reporting could be optimized for lower gas costs");
    }
    
    recommendations.push("Implement batch operations for high-volume users");
    recommendations.push("Consider Layer 2 deployment for lower costs");
    
    return recommendations;
}

// Run if called directly
if (require.main === module) {
    analyzeGasCosts()
        .then(() => process.exit(0))
        .catch(error => {
            console.error("❌ Gas analysis failed:", error);
            process.exit(1);
        });
}

module.exports = { analyzeGasCosts };
