const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Deploying ZK-MEV Protection System...");
    
    const signers = await ethers.getSigners();
    if (signers.length === 0) {
        throw new Error("No signers found. Check your PRIVATE_KEY in .env file");
    }
    
    const deployer = signers[0];
    console.log("📝 Deploying with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
    
    // Deploy VerifierMEV first
    console.log("\n1️⃣ Deploying VerifierMEV...");
    const VerifierMEV = await ethers.getContractFactory("VerifierMEV");
    const verifierMEV = await VerifierMEV.deploy();
    await verifierMEV.waitForDeployment();
    
    console.log("✅ VerifierMEV deployed to:", await verifierMEV.getAddress());
    
    // Deploy MEVProtector
    console.log("\n2️⃣ Deploying MEVProtector...");
    const MEVProtector = await ethers.getContractFactory("MEVProtector");
    const mevProtector = await MEVProtector.deploy(await verifierMEV.getAddress());
    await mevProtector.waitForDeployment();
    
    console.log("✅ MEVProtector deployed to:", await mevProtector.getAddress());
    
    // Get deployment info
    const network = await ethers.provider.getNetwork();
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    
    const deploymentInfo = {
        network: network.name,
        chainId: Number(network.chainId),
        deployer: deployer.address,
        contracts: {
            VerifierMEV: await verifierMEV.getAddress(),
            MEVProtector: await mevProtector.getAddress()
        },
        deployment: {
            gasPrice: gasPrice ? ethers.formatUnits(gasPrice, "gwei") : "N/A",
            timestamp: new Date().toISOString(),
            blockNumber: Number(await ethers.provider.getBlockNumber())
        }
    };
    
    // Save deployment info
    const deploymentFile = `deployed-${network.name}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n📊 Deployment Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🌐 Network:", network.name);
    console.log("🔗 Chain ID:", network.chainId);
    console.log("👤 Deployer:", deployer.address);
    console.log("🛡️ MEVProtector:", await mevProtector.getAddress());
    console.log("✅ VerifierMEV:", await verifierMEV.getAddress());
    console.log("⛽ Gas Price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("📁 Saved to:", deploymentFile);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Test basic functionality
    console.log("\n🧪 Testing basic functionality...");
    
    const protectionFee = await mevProtector.protectionFee();
    console.log("💸 Protection fee:", ethers.formatEther(protectionFee), "ETH");
    
    // Test commitment submission
    const testCommitment = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const testTx = await mevProtector.connect(deployer).submitCommitment(testCommitment, {
        value: protectionFee
    });
    await testTx.wait();
    
    console.log("✅ Test commitment successful");
    
    console.log("\n🎉 ZK-MEV Protection System deployed successfully!");
    console.log("🔗 Start protecting transactions from MEV attacks!");
    
    return deploymentInfo;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
