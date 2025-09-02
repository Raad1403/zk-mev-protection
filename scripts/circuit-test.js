/**
 * Circuit Testing Script
 * Tests the MEV protection circuit with various inputs
 */

const snarkjs = require('snarkjs');
const circomlib = require('circomlib');
const fs = require('fs');
const path = require('path');

async function testMEVCircuit() {
    console.log("🧪 Testing MEV Protection Circuit...");
    
    const wasmFile = path.join(__dirname, '../circuits/build/mev-protection.wasm');
    const zkeyFile = path.join(__dirname, '../circuits/mev-protection_final.zkey');
    const vkeyFile = path.join(__dirname, '../circuits/verification_key.json');
    
    // Test cases
    const testCases = [
        {
            name: "Valid USDC->WETH Swap",
            input: {
                tokenIn: "6765309",  // USDC address as field element
                tokenOut: "7890123", // WETH address as field element
                amountIn: "1000000000000000000",
                amountOutMin: "400000000000000000",
                deadline: "1735689600", // Future timestamp
                userAddress: "1234567890123456789012345678901234567890",
                nonce: "12345",
                blockNumber: "100",
                signalHash: "999999"
            }
        },
        {
            name: "Large Trade Protection",
            input: {
                tokenIn: "1111111",
                tokenOut: "2222222",
                amountIn: "10000000000000000000000", // 10,000 tokens
                amountOutMin: "5000000000000000000000",
                deadline: "1735689600",
                userAddress: "9876543210987654321098765432109876543210",
                nonce: "54321",
                blockNumber: "200",
                signalHash: "888888"
            }
        },
        {
            name: "Small Trade Protection",
            input: {
                tokenIn: "3333333",
                tokenOut: "4444444",
                amountIn: "1000000000000000", // 0.001 tokens
                amountOutMin: "500000000000000",
                deadline: "1735689600",
                userAddress: "1111111111111111111111111111111111111111",
                nonce: "99999",
                blockNumber: "300",
                signalHash: "777777"
            }
        }
    ];
    
    let passedTests = 0;
    
    for (const testCase of testCases) {
        console.log(`\n🔍 Testing: ${testCase.name}`);
        
        try {
            // Generate proof
            console.log("   📝 Generating proof...");
            const startTime = Date.now();
            
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                testCase.input,
                wasmFile,
                zkeyFile
            );
            
            const proofTime = Date.now() - startTime;
            console.log(`   ⏱️ Proof generated in ${proofTime}ms`);
            
            // Verify proof
            console.log("   ✅ Verifying proof...");
            const vKey = JSON.parse(fs.readFileSync(vkeyFile));
            
            const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
            
            if (verified) {
                console.log(`   ✅ ${testCase.name} - PASSED`);
                console.log(`   📊 Public signals: [${publicSignals.join(', ')}]`);
                passedTests++;
            } else {
                console.log(`   ❌ ${testCase.name} - FAILED (verification failed)`);
            }
            
        } catch (error) {
            console.log(`   ❌ ${testCase.name} - FAILED (${error.message})`);
        }
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${testCases.length} passed`);
    
    if (passedTests === testCases.length) {
        console.log("🎉 All circuit tests passed!");
        return true;
    } else {
        console.log("⚠️ Some circuit tests failed");
        return false;
    }
}

async function benchmarkCircuit() {
    console.log("\n⚡ Circuit Performance Benchmark...");
    
    const wasmFile = path.join(__dirname, '../circuits/build/mev-protection.wasm');
    const zkeyFile = path.join(__dirname, '../circuits/mev-protection_final.zkey');
    
    const benchmarkInput = {
        tokenIn: "6765309",
        tokenOut: "7890123",
        amountIn: "1000000000000000000",
        amountOutMin: "400000000000000000",
        deadline: "1735689600",
        userAddress: "1234567890123456789012345678901234567890",
        nonce: "12345",
        blockNumber: "100",
        signalHash: "999999"
    };
    
    const iterations = 5;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await snarkjs.groth16.fullProve(
            benchmarkInput,
            wasmFile,
            zkeyFile
        );
        
        const endTime = Date.now();
        times.push(endTime - startTime);
        
        console.log(`   Run ${i + 1}: ${endTime - startTime}ms`);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log("\n📊 Performance Results:");
    console.log(`   Average: ${avgTime.toFixed(2)}ms`);
    console.log(`   Minimum: ${minTime}ms`);
    console.log(`   Maximum: ${maxTime}ms`);
    
    // Performance targets
    if (avgTime < 5000) {
        console.log("✅ Performance: Excellent (< 5s)");
    } else if (avgTime < 10000) {
        console.log("⚠️ Performance: Good (< 10s)");
    } else {
        console.log("❌ Performance: Needs optimization (> 10s)");
    }
}

async function validateCircuitConstraints() {
    console.log("\n🔍 Validating circuit constraints...");
    
    const r1csFile = path.join(__dirname, '../circuits/build/mev-protection.r1cs');
    
    if (!fs.existsSync(r1csFile)) {
        console.log("❌ R1CS file not found. Run circuit compilation first.");
        return false;
    }
    
    try {
        // Read R1CS info
        const { stdout } = await execAsync(`snarkjs r1cs info ${r1csFile}`);
        console.log("📊 Circuit Info:");
        console.log(stdout);
        
        // Check constraint count
        const constraintMatch = stdout.match(/# of Constraints: (\d+)/);
        if (constraintMatch) {
            const constraints = parseInt(constraintMatch[1]);
            console.log(`🔢 Total Constraints: ${constraints.toLocaleString()}`);
            
            if (constraints < 1000000) {
                console.log("✅ Constraint count: Optimal (< 1M)");
            } else if (constraints < 5000000) {
                console.log("⚠️ Constraint count: Acceptable (< 5M)");
            } else {
                console.log("❌ Constraint count: Too high (> 5M)");
            }
        }
        
        return true;
        
    } catch (error) {
        console.log("❌ Circuit validation failed:", error.message);
        return false;
    }
}

async function main() {
    console.log("🚀 ZK-MEV Protection Circuit Testing Suite");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
        // Validate circuit constraints
        const constraintsValid = await validateCircuitConstraints();
        
        if (constraintsValid) {
            // Run functionality tests
            const testsPass = await testMEVCircuit();
            
            if (testsPass) {
                // Run performance benchmark
                await benchmarkCircuit();
                
                console.log("\n🎉 All circuit tests completed successfully!");
                console.log("🛡️ MEV protection circuit is ready for deployment!");
            }
        }
        
    } catch (error) {
        console.error("❌ Circuit testing failed:", error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    testMEVCircuit,
    benchmarkCircuit,
    validateCircuitConstraints
};
