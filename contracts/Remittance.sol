pragma solidity ^0.4.15;


contract Remittance {
    // the person who runs this exchange shop
    address public owner;
    uint public deadline;
    bytes32 public hashCode;

    event LogWithdrawn(uint amount, address userAddress);
    event LogCancelled(uint amount, address ownerAddress);

    function Remittance(uint duration, string firstPass, string secondPass) 
        payable
        public {
        require(msg.value > 0);
        owner = msg.sender;
        deadline = block.number + duration;
        hashCode = keccak256(firstPass, secondPass);
    }

    function withdrawMoney(string firstPass, string secondPass) 
        external {
        require(hashCode == keccak256(firstPass, secondPass));
        LogWithdrawn(this.balance, msg.sender);
        selfdestruct(msg.sender);
    }

    /*block.number > deadline
    If the creator of the remittance contract decided to cancel it
    */
    function cancelAndWithdraw() 
        ownerCall
        finished
        external {
        LogCancelled(this.balance, msg.sender);
        selfdestruct(msg.sender);
    }

    modifier ownerCall() {
        require(msg.sender == owner);
        _;
    }
    modifier finished() {
        require (block.number > deadline);
        _;
    }

    function() 
        public {
        revert();
    }
}