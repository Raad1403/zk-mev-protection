pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";

// ZK-MEV Protection Circuit
// Encrypts transaction details until execution time
template MEVProtection() {
    // Private inputs (hidden from MEV bots)
    signal private input tokenIn;
    signal private input tokenOut;
    signal private input amountIn;
    signal private input amountOutMin;
    signal private input deadline;
    signal private input userAddress;
    signal private input nonce;
    
    // Public inputs
    signal input blockNumber;
    signal input signalHash;
    
    // Outputs
    signal output commitmentHash;
    signal output nullifier;
    signal output validityProof;
    
    // Components
    component poseidon1 = Poseidon(7);
    component poseidon2 = Poseidon(3);
    component poseidon3 = Poseidon(2);
    
    // Generate commitment hash (public)
    poseidon1.inputs[0] <== tokenIn;
    poseidon1.inputs[1] <== tokenOut;
    poseidon1.inputs[2] <== amountIn;
    poseidon1.inputs[3] <== amountOutMin;
    poseidon1.inputs[4] <== deadline;
    poseidon1.inputs[5] <== userAddress;
    poseidon1.inputs[6] <== nonce;
    
    commitmentHash <== poseidon1.out;
    
    // Generate nullifier (prevents replay)
    poseidon2.inputs[0] <== userAddress;
    poseidon2.inputs[1] <== nonce;
    poseidon2.inputs[2] <== signalHash;
    
    nullifier <== poseidon2.out;
    
    // Generate validity proof
    poseidon3.inputs[0] <== commitmentHash;
    poseidon3.inputs[1] <== blockNumber;
    
    validityProof <== poseidon3.out;
    
    // Constraints
    // Ensure deadline is in the future
    component deadlineCheck = GreaterThan(32);
    deadlineCheck.in[0] <== deadline;
    deadlineCheck.in[1] <== blockNumber;
    deadlineCheck.out === 1;
    
    // Ensure amount is positive
    component amountCheck = GreaterThan(32);
    amountCheck.in[0] <== amountIn;
    amountCheck.in[1] <== 0;
    amountCheck.out === 1;
}

// Greater than comparison template
template GreaterThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;
    
    component lt = LessThan(n+1);
    lt.in[0] <== in[1];
    lt.in[1] <== in[0] + 1;
    out <== lt.out;
}

// Less than comparison template  
template LessThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;
    
    component n2b = Num2Bits(n+1);
    n2b.in <== in[0] + (1<<n) - in[1];
    out <== 1 - n2b.out[n];
}

// Main component
component main = MEVProtection();
