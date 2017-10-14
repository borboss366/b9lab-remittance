var Remittance = artifacts.require("./Remittance.sol");
var RemittanceLib = artifacts.require("./RemittanceLib.sol");

module.exports = function(deployer) {
  deployer.deploy(RemittanceLib);
  deployer.link(RemittanceLib, Remittance);
  // deployer.deploy(Remittance);
};
