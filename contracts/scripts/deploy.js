const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 1. IdentityRegistry
  console.log("\n▶ Deploying IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await upgrades.deployProxy(
    IdentityRegistry,
    [deployer.address],
    { initializer: "initialize", kind: "uups" }
  );
  await identityRegistry.waitForDeployment();
  const identityAddr = await identityRegistry.getAddress();
  console.log(" IdentityRegistry:", identityAddr);

  // 2. CredentialRegistry
  console.log("\n▶ Deploying CredentialRegistry...");
  const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
  const credentialRegistry = await upgrades.deployProxy(
    CredentialRegistry,
    [deployer.address],
    { initializer: "initialize", kind: "uups" }
  );
  await credentialRegistry.waitForDeployment();
  const credentialAddr = await credentialRegistry.getAddress();
  console.log(" CredentialRegistry:", credentialAddr);

  // 3. DataAccessControl
  console.log("\n▶ Deploying DataAccessControl...");
  const DataAccessControl = await ethers.getContractFactory("DataAccessControl");
  const accessControl = await upgrades.deployProxy(
    DataAccessControl,
    [deployer.address],
    { initializer: "initialize", kind: "uups" }
  );
  await accessControl.waitForDeployment();
  const accessAddr = await accessControl.getAddress();
  console.log(" DataAccessControl:", accessAddr);

  // 4. Grant OPERATOR_ROLE cho backend wallet
  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
  const ISSUER_ROLE   = ethers.keccak256(ethers.toUtf8Bytes("ISSUER_ROLE"));

  if (process.env.BACKEND_WALLET) {
    await identityRegistry.grantRole(OPERATOR_ROLE, process.env.BACKEND_WALLET);
    await credentialRegistry.grantRole(ISSUER_ROLE, process.env.BACKEND_WALLET);
    console.log("\n Roles granted to backend wallet:", process.env.BACKEND_WALLET);
  }

  // 5. In summary
  console.log("\n══════════════════════════════════════");
  console.log("DEPLOYMENT SUMMARY");
  console.log("══════════════════════════════════════");
  console.log("Network:           ", (await ethers.provider.getNetwork()).name);
  console.log("IdentityRegistry:  ", identityAddr);
  console.log("CredentialRegistry:", credentialAddr);
  console.log("DataAccessControl: ", accessAddr);
  console.log("══════════════════════════════════════");

  // Save addresses to file
  const fs = require("fs");
  const addresses = { identityRegistry: identityAddr, credentialRegistry: credentialAddr, accessControl: accessAddr };
  fs.writeFileSync("../deployments/addresses.json", JSON.stringify(addresses, null, 2));
  console.log("\n Addresses saved to deployments/addresses.json");
}

main().catch(e => { console.error(e); process.exit(1); });
