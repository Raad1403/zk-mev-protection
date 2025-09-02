const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying MEVProtector only...");
    
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
    
    // Use existing VerifierMEV address
    const verifierAddress = "0x4536227D719E6aB27506E9c3Ec529ea9688D2754";
    
    console.log("2️⃣ Deploying MEVProtector...");
    const MEVProtector = await ethers.getContractFactory("MEVProtector");
    const mevProtector = await MEVProtector.deploy(verifierAddress, {
        gasLimit: 3000000,
        gasPrice: ethers.parseUnits("10", "gwei") // Lower gas price
    });
    
    await mevProtector.waitForDeployment();
    const mevProtectorAddress = await mevProtector.getAddress();
    
    console.log("✅ MEVProtector deployed to:", mevProtectorAddress);
    
    // Save deployment info
    const deploymentInfo = {
        network: "sepolia",
        chainId: 11155111,
        deployer: deployer.address,
        contracts: {
            VerifierMEV: verifierAddress,
            MEVProtector: mevProtectorAddress
        },
        timestamp: new Date().toISOString()
    };
    
    console.log("\n📊 Deployment Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🌐 Network: sepolia");
    console.log("🔗 Chain ID:", deploymentInfo.chainId);
    console.log("👤 Deployer:", deployer.address);
    console.log("🛡️ MEVProtector:", mevProtectorAddress);
    console.log("✅ VerifierMEV:", verifierAddress);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    console.log("\n🎉 ZK-MEV Protection System fully deployed on Sepolia!");
    console.log("🔗 View on Etherscan:");
    console.log(`   MEVProtector: https://sepolia.etherscan.io/address/${mevProtectorAddress}`);
    console.log(`   VerifierMEV: https://sepolia.etherscan.io/address/${verifierAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
