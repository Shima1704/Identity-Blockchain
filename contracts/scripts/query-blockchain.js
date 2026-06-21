const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Querying Blockchain Data...\n");
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  // Get latest block
  const latestBlock = await ethers.provider.getBlockNumber();
  console.log(`🔗 Latest Block: ${latestBlock}`);
  
  // Get some accounts
  const accounts = await ethers.getSigners();
  console.log(`👥 Available Accounts: ${accounts.length}`);
  
  // Check if IdentityRegistry is deployed
  try {
    // Get deployment addresses (if available)
    const deployments = require("../deployments/localhost");
    console.log("\n📋 Deployed Contracts:");
    console.log(deployments);
  } catch (e) {
    console.log("\n⚠️  No deployments found. Contract may not be deployed yet.");
  }
  
  // Query recent transactions
  console.log("\n🔄 Recent Transactions:");
  for (let i = Math.max(0, latestBlock - 5); i <= latestBlock; i++) {
    try {
      const block = await ethers.provider.getBlock(i, true);
      if (block && block.transactions.length > 0) {
        console.log(`Block ${i}: ${block.transactions.length} transactions`);
        block.transactions.forEach((tx, idx) => {
          console.log(`  ${idx + 1}. ${tx.hash} (${tx.from} → ${tx.to})`);
        });
      }
    } catch (e) {
      // Block might not exist
    }
  }
  
  // Get balance of first account
  const balance = await ethers.provider.getBalance(accounts[0].address);
  console.log(`\n💰 Account[0] Balance: ${ethers.formatEther(balance)} ETH`);
  
  console.log("\n✅ Query completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });