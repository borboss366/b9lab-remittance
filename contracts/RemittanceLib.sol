pragma solidity ^0.4.15;

library RemittanceLib {
    function calculateHash(string firstPass, string secondPass)
    public 
    constant 
    returns (bytes32) {
        return keccak256(firstPass, secondPass);
    }
}