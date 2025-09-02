const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking MATIC balance on Polygon Mumbai...");
    
    const address = "0x23E924F0CB82e814a3e03890Fb59aF50369829f9";
    
    try {
        const balance = await ethers.provider.getBalance(address);
        const balanceInMatic = ethers.formatEther(balance);
        
        console.log("📍 Address:", address);
        console.log("💰 Balance:", balanceInMatic, "MATIC");
        
        if (parseFloat(balanceInMatic) > 0) {
            console.log("✅ MATIC received! Ready to deploy.");
        } else {
            console.log("⏳ No MATIC yet. Wait a bit more...");
        }
        
    } catch (error) {
        console.error("❌ Error checking balance:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
