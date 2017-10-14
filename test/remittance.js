const Remittance = artifacts.require("./Remittance.sol");
const RemittanceLib = artifacts.require("./RemittanceLib.sol");

const Promise = require("bluebird");
const randomstring = require("randomstring");
const expectedException = require("../utils/expectedException.js");
const addEvmFunctions = require("../utils/evmFunctions.js");

contract('Remittance', function(accounts) {
    addEvmFunctions(web3);
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
    Promise.promisifyAll(web3.version, { suffix: "Promise" });
    Promise.promisifyAll(web3.evm, { suffix: "Promise" });

    let isTestRPC;
    let owner = accounts[0];
    let banker = accounts[1];
    let dummy = accounts[2];
    let duration = 10;
    
    let lib; 
    
    before("should identify TestRPC", function() {
        return web3.version.getNodePromise()
            .then(node => isTestRPC = node.indexOf("EthereumJS TestRPC") >= 0);
    });

    before("should create a library", function() {
        return RemittanceLib.new()
        .then(instance => { lib = instance; });
    })

    describe("contract deployment", function() {
        it("should be possible to deploy Remittance with value", function() {
            return lib.calculateHash(randomstring.generate(7), randomstring.generate(7))
            .then(hash => Remittance.new(duration, hash, { from: owner, value: 1, gas: 3000000  }))
            .then(
            () => { }, 
            e => { throw new Error(e.message); });
        });

        it("should not be possible to deploy Remittance without value", function() {
            return lib.calculateHash(randomstring.generate(7), randomstring.generate(7))
            .then(hash => Remittance.new(duration, hash, { from: owner  }))
            .then(
                () => { throw new Error("should have added some value"); },
                e => { });
        });
    });

    describe("withdrawal checks", function() {
        let pass1;
        let pass2; 
        let wrongPass1;
        let wrongPass2;
        let contract;
        let val = 239;

        beforeEach("should create a hash and a contract", function() {
            pass1 = randomstring.generate(7);
            pass2 = randomstring.generate(7);
            wrongPass1 = randomstring.generate(8);
            wrongPass2 = randomstring.generate(8);

            return lib.calculateHash(pass1, pass2)
            .then(hash => Remittance.new(duration, hash, { from: owner, value: val, gas: 3000000  }))
            .then(instance => contract = instance)
        });

        it ("should not be possible to withdraw with wrong password", function() {
            return contract.withdrawMoney(wrongPass1, wrongPass2, {from: banker})
            .then(
                txn => { throw new Error("should not have allowed to withdraw with wrong password"); },
                e => { });
        })

        it ("should be possible to withdraw with correct password", function() {
            return contract.withdrawMoney(pass1, pass2, {from: banker})
            .then(
                txn => { },
                e => { throw new Error("should have allowed to withdraw with correct password"); });
        })

        it ("should deposit the correct sum", function() {
            return web3.eth.getBalancePromise(contract.address)
            .then(bal => assert.strictEqual("0", bal.minus(val).toString(10), "Deposit is correct"))
        })

        it ("should withdraw the correct sum", function() {
            let before; let after; let gasUsed;

            return web3.eth.getBalancePromise(banker)
            .then(bal => {before = bal; return contract.withdrawMoney(pass1, pass2, {from: banker}) })
            .then(txn => { gasUsed = txn.receipt.gasUsed; return web3.eth.getTransaction(txn.tx) })
            .then(tx => { gasPrice = tx.gasPrice; return web3.eth.getBalancePromise(banker); })
            .then(bal => { 
                after = bal;
                let gasCost = gasPrice.times(gasUsed);
                assert.strictEqual(gasCost.add(after).toString(10), before.add(val).toString(10), "Sum is incorrect") })
        }) 

        it ("should not allow to owner to withdraw before that the time has passed", function() {
            return web3.evm.minePromise()
            .then(dl => { return contract.cancelAndWithdraw({from: owner}) })
            .then(
                txn => { throw new Error("should not have allowed to withdraw before "); },
                e => { });
        })

        function mineUntilFinish() {
            return checkDeadline()
            .then(finished => { if (!finished) return web3.evm.minePromise().then(() => mineUntilFinish()) })
        }
        
        // this works
        function checkDeadline() {
            let deadline;
            return contract.deadline()
            .then(dl => { deadline = dl; return web3.eth.getBlockNumberPromise()})
            .then(bl => { return deadline.cmp(bl) < 0 })
        }

        it ("should allow to owner to withdraw after that the time has passed", function() {
            return mineUntilFinish()
            .then(() => {return checkDeadline() } )
            .then(dl => { return contract.cancelAndWithdraw({from: owner})})
        })

        it ("should not allow to other party to withdraw after that the time has passed", function() {
            return mineUntilFinish()
            .then(() => {return checkDeadline() } )
            .then(dl => { return contract.cancelAndWithdraw({from: banker})})
            .then(
                txn => { throw new Error("should not have allowed to withdraw"); },
                e => { });
        })
    })
});
