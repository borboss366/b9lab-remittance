var Remittance = artifacts.require("./Remittance.sol");
var randomstring = require("randomstring");


contract('Remittance', function(accounts) {
    let owner = accounts[0];
    let banker = accounts[1];
    let dummy = accounts[2];
    let defaultWait = 10;
    let defaultEther = 239;

    // it("cannot create empty contract", 
    // () => {
    //     return makeZeroValueContractCheck()
    //     .then(makeZeroValueContractCheck())
    //     .then(makeZeroValueContractCheck())
    //     .then(makeZeroValueContractCheck())
    //     .then(makeZeroValueContractCheck())
    // })


    it("cannot withdraw, if the password was incorrect", 
    () => {
        return makeIncorrectCheck()
        .then(makeIncorrectCheck())
        .then(makeIncorrectCheck())
        .then(makeIncorrectCheck())
        .then(makeIncorrectCheck())
        .then(makeIncorrectCheck())
        .then(makeIncorrectCheck())
        .then(makeIncorrectCheck())
        .then(makeIncorrectCheck())
    })

    it("can withdraw, if the password was correct", 
    () => {
        return makeCorrectCheck()
        .then(makeCorrectCheck())
        .then(makeCorrectCheck())
    })

    it("withdraws the correct sum", 
    () => {
        return makeWithdrawCheck(239)
        .then(makeCorrectCheck(666))
        .then(makeCorrectCheck(999))
    })

    it("deposits the correct sum", 
    () => {
        return makeFundCheck(239)
        .then(makeFundCheck(666))
        .then(makeFundCheck(999))
    })

    it("allows to withdraw after time has passed",
    () => {
        return makeCancelCorrectCheck(defaultWait, defaultWait)
        .then(makeCancelCorrectCheck(defaultWait, defaultWait + 1))
        .then(makeCancelCorrectCheck(defaultWait, defaultWait + 2))
    })

    it("fails to withdraw before time has passed",
    () => {
        return makeCancelFailCheck(defaultWait, 0)
        .then(makeCancelFailCheck(defaultWait, 1))
        .then(makeCancelFailCheck(defaultWait, 2))
        .then(makeCancelFailCheck(defaultWait, defaultWait - 1))
    })

    it("fails to withdraw for a user other than the owner",
    () => {
        return makeCancelWrongUserFailCheck(defaultWait, defaultWait)
        .then(makeCancelWrongUserFailCheck(defaultWait, defaultWait + 1))
        .then(makeCancelWrongUserFailCheck(defaultWait, defaultWait + 2))
        .then(makeCancelWrongUserFailCheck(defaultWait, 0))
        .then(makeCancelWrongUserFailCheck(defaultWait, 1))
        .then(makeCancelWrongUserFailCheck(defaultWait, defaultWait - 1))
    })


    function createContract(acc, val, duration, pass1, pass2) {
        return Remittance.new(duration, pass1, pass2, {from: acc, value: val});
    }

    function makeZeroValueContractCheck() {
        return createContract(owner, 0, defaultWait, "zzz", "zzz")
        .then(txn => assert.strictEqual(true, false, "XXXIt should fail"))
        .catch(e => { 
            if (e.toString().indexOf("XXX") != -1) {
                assert.strictEqual(false, true, "Incorrect zero contract creation")
            } 
        })
    }

    function makeIncorrectCheck() {
        let pass1 = randomstring.generate(7);
        let pass2 = randomstring.generate(7);
        let wrongPass1 = randomstring.generate(8);
        let wrongPass2 = randomstring.generate(8);
        
        return createContract(owner, defaultEther, defaultWait, pass1, pass2)
        .then(contract => {return contract.withdrawMoney(wrongPass1, wrongPass2, {from: banker})})
        .then(txn => assert.strictEqual(true, false, "XXXIt should fail"))
        .catch(e => { 
            if (e.toString().indexOf("XXX") != -1) {
                assert.strictEqual(false, true, "Incorrect password allowed")
            } 
        })
    }

    function makeCorrectCheck() {
        let pass1 = randomstring.generate(7);
        let pass2 = randomstring.generate(7);
        
        return createContract(owner, defaultEther, defaultWait, pass1, pass2)
        .then(contract => { return contract.withdrawMoney(pass1, pass2, {from: banker}) })
        .then(txn => {}).catch(e => { assert.strictEqual(true, false, "It should fail") })
    }        

    function makeWithdrawCheck(value) {
        let pass1 = randomstring.generate(7);
        let pass2 = randomstring.generate(7);
        let contract;
        let contractBal;
        let before;
        let after;
        let gasUsed;
        let gasPrice;

        // create the contract with value in it
        return createContract(owner, value, defaultWait, pass1, pass2)
        .then(c => { contract = c; return getBalance(banker); })
        .then(bal => { before = bal; return getBalance(contract.address); })
        .then(bal => { contractBal = bal; return contract.withdrawMoney(pass1, pass2, {from: banker})} )
        .then(txn => { gasUsed = txn.receipt.gasUsed; return web3.eth.getTransaction(txn.tx) })
        .then(tx => { gasPrice = tx.gasPrice; return getBalance(banker); })
        .then(bal => { 
            after = bal;
            let gasCost = gasPrice.times(gasUsed);
            // console.log("Banker balance", contractBal.toString(10));
            // console.log("Banker delta ", before.minus(after).toString(10), " delta ", gasCost.minus(value).toString(10));
            // console.log(after.toString(10), " ", after.minus(before).toString(10), " ", gasCost.toString(10), gasCost.plus(after).minus(before).toString(10) ); 
            assert.strictEqual(gasCost.add(after).toString(10), before.add(value).toString(10), "Sum is incorrect") })
    }

    function makeFundCheck(value) {
        let contract;

        // create the contract with value in it
        return createContract(owner, value, defaultWait, randomstring.generate(7), randomstring.generate(7))
        .then(c => { contract = c; return getBalance(contract.address); })
        .then(bal => { assert.strictEqual("0", bal.minus(value).toString(10), "Deposit is correct") })
    }

    function makeCancelCorrectCheck(contractWait, actualWait) {
        let contract;
        
        // create the contract with value in it
        return createContract(owner, defaultEther, contractWait, randomstring.generate(7), randomstring.generate(7))
        .then(c => { contract = c; return skipBlocks(actualWait)} )
        .then(() => { return contract.cancelAndWithdraw({from: owner})})
        .then(txn => {assert.strictEqual(true, true, "Cancel withdrawal is ok")})
    }

    function makeCancelWrongUserFailCheck(contractWait, actualWait) {
        let contract;
        
        // create the contract with value in it
        return createContract(owner, defaultEther, contractWait, randomstring.generate(7), randomstring.generate(7))
        .then(c => { contract = c; return skipBlocks(actualWait)} )
        .then(() => { return contract.cancelAndWithdraw({from: dummy})})
        .then(() => { assert.strictEqual(false, true, "XXXCancel withdrawl is ok and it should not be")})
        .catch(e => { 
            if (e.toString().indexOf("XXX") != -1) {
                assert.strictEqual(false, true, "Cancel withdrawl is failed")
            } 
        })
    }


    function makeCancelFailCheck(contractWait, actualWait) {
        let contract;
        
        // create the contract with value in it
        return createContract(owner, defaultEther, contractWait, randomstring.generate(7), randomstring.generate(7))
        .then(c => { contract = c; /*return skipBlocks(actualWait)*/ return } )
        .then(() => { return contract.cancelAndWithdraw({from: owner})})
        .then(() => { assert.strictEqual(false, true, "XXXCancel withdrawl is ok and it should not be")})
        .catch(e => { 
            if (e.toString().indexOf("XXX") != -1) {
                assert.strictEqual(false, true, "Cancel withdrawl is failed")
            } 
        })
    }


    // function makeZeroValueContractCheck() {
    //     return createContract(owner, 0, defaultWait, "zzz", "zzz")
    //     .then(txn => assert.fail) 
    //     .catch(e => {})
    // }

    /*
    Utility functions!
    */
    function getBalance(acc) {
        return new Promise(function(resolve, reject) {
            web3.eth.getBalance(acc, function(e, balance) { resolve(balance); });
        });
    }

    function skipBlocks(duration) {
        return waitForBlock(web3.eth.blockNumber + duration);
    }

    function waitForBlock(endblock) {
        // console.log(endblock, " ", web3.eth.blockNumber)
        return skipBlock().then(() =>  { if (web3.eth.blockNumber <= endblock) { return waitForBlock(endblock) } else return })
    }

    function skipBlock() {
        return createContract(dummy, defaultEther, defaultWait, "xxx", "yyy")
    }
    /*
    End of utility functions!
    */
});
