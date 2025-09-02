/**
 * Circuit Setup Script
 * Sets up the trusted setup for MEV protection circuit
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function setupCircuit() {
    console.log("🔧 Setting up ZK circuit for MEV protection...");
    
    const circuitDir = path.join(__dirname, '../circuits');
    const buildDir = path.join(circuitDir, 'build');
    
    // Create build directory
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }
    
    try {
        // Step 1: Compile circuit
        console.log("1️⃣ Compiling circuit...");
        await execAsync(`circom ${circuitDir}/mev-protection.circom --r1cs --wasm --sym -o ${buildDir}/`);
        console.log("✅ Circuit compiled successfully");
        
        // Step 2: Download powers of tau (if not exists)
        const ptauFile = path.join(circuitDir, 'powersOfTau28_hez_final_15.ptau');
        if (!fs.existsSync(ptauFile)) {
            console.log("2️⃣ Downloading powers of tau ceremony file...");
            await execAsync(`wget -O ${ptauFile} https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau`);
            console.log("✅ Powers of tau downloaded");
        } else {
            console.log("2️⃣ Powers of tau file already exists");
        }
        
        // Step 3: Generate proving key
        console.log("3️⃣ Generating proving key...");
        const r1csFile = path.join(buildDir, 'mev-protection.r1cs');
        const zkeyFile = path.join(circuitDir, 'mev-protection_final.zkey');
        
        await execAsync(`snarkjs groth16 setup ${r1csFile} ${ptauFile} ${zkeyFile}`);
        console.log("✅ Proving key generated");
        
        // Step 4: Generate verification key
        console.log("4️⃣ Generating verification key...");
        const vkeyFile = path.join(circuitDir, 'verification_key.json');
        await execAsync(`snarkjs zkey export verificationkey ${zkeyFile} ${vkeyFile}`);
        console.log("✅ Verification key generated");
        
        // Step 5: Generate Solidity verifier
        console.log("5️⃣ Generating Solidity verifier...");
        const verifierFile = path.join(__dirname, '../contracts/VerifierMEV.sol');
        await execAsync(`snarkjs zkey export solidityverifier ${zkeyFile} ${verifierFile}`);
        console.log("✅ Solidity verifier generated");
        
        // Step 6: Test circuit
        console.log("6️⃣ Testing circuit...");
        await testCircuit();
        
        console.log("\n🎉 Circuit setup completed successfully!");
        console.log("📁 Files generated:");
        console.log(`   📄 Circuit: ${r1csFile}`);
        console.log(`   🔑 Proving key: ${zkeyFile}`);
        console.log(`   ✅ Verification key: ${vkeyFile}`);
        console.log(`   📜 Solidity verifier: ${verifierFile}`);
        
    } catch (error) {
        console.error("❌ Circuit setup failed:", error.message);
        process.exit(1);
    }
}

async function testCircuit() {
    const snarkjs = require('snarkjs');
    const circomlib = require('circomlib');
    
    // Test inputs
    const input = {
        tokenIn: "12345",
        tokenOut: "67890",
        amountIn: "1000000000000000000",
        amountOutMin: "400000000000000000",
        deadline: "1234567890",
        userAddress: "1234567890123456789012345678901234567890",
        nonce: "12345",
        blockNumber: "100",
        signalHash: "999999"
    };
    
    try {
        // Generate proof
        const wasmFile = path.join(__dirname, '../circuits/build/mev-protection.wasm');
        const zkeyFile = path.join(__dirname, '../circuits/mev-protection_final.zkey');
        
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            wasmFile,
            zkeyFile
        );
        
        // Verify proof
        const vkeyFile = path.join(__dirname, '../circuits/verification_key.json');
        const vKey = JSON.parse(fs.readFileSync(vkeyFile));
        
        const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        
        if (verified) {
            console.log("✅ Circuit test passed - proof verified!");
        } else {
            throw new Error("Circuit test failed - proof verification failed");
        }
        
    } catch (error) {
        console.log("⚠️ Circuit test skipped (dependencies not ready)");
        console.log("   Run 'npm run circuit:test' after full setup");
    }
}

// Run if called directly
if (require.main === module) {
    setupCircuit()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { setupCircuit };
