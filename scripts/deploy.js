import hre from "hardhat";
import fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    console.log("Deploying contracts...");

    // Setup accounts
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Platform addresses for Somnia Agents
    const platformAddress = hre.network.name === 'somnia_mainnet' 
        ? "0x5E5205CF39E766118C01636bED000A54D93163E6" 
        : "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776";

    console.log("Using Agent Platform:", platformAddress);

    // 1. Deploy SentinelClaim
    const SentinelClaim = await hre.ethers.getContractFactory("SentinelClaim");
    const sentinelClaim = await SentinelClaim.deploy(platformAddress);
    await sentinelClaim.waitForDeployment();
    const sentinelClaimAddress = await sentinelClaim.getAddress();
    console.log("SentinelClaim deployed to:", sentinelClaimAddress);

    // 2. Fund the risk pool with 0.1 STT (for demo claims)
    console.log("Funding risk pool with 0.1 STT...");
    const fundTx = await sentinelClaim.fundRiskPool({ value: hre.ethers.parseEther("0.1") });
    await fundTx.wait();
    console.log("Risk pool funded.");

    // 3. Skip RiskPoolReactor deployment as it requires 32 STT minimum for subscription
    // const RiskPoolReactor = await hre.ethers.getContractFactory("RiskPoolReactor");
    // const riskPoolReactor = await RiskPoolReactor.deploy(sentinelClaimAddress, { value: hre.ethers.parseEther("0.1") });
    // await riskPoolReactor.waitForDeployment();
    // const riskPoolReactorAddress = await riskPoolReactor.getAddress();
    // console.log("RiskPoolReactor deployed to:", riskPoolReactorAddress);
    const riskPoolReactorAddress = hre.ethers.ZeroAddress;

    // 4. Set the agent ID on SentinelClaim
    const agentId = process.env.AGENT_ID || "1";
    console.log(`Setting Agent ID to ${agentId}...`);
    const setAgentTx = await sentinelClaim.setAgentId(agentId);
    await setAgentTx.wait();

    // 5. Set the API key on SentinelClaim
    const apiKey = process.env.API_KEY || "demo_key";
    console.log("Setting OpenWeather API Key...");
    const setApiKeyTx = await sentinelClaim.setApiKey(apiKey);
    await setApiKeyTx.wait();

    // 6. Save addresses to deployments.json
    const deployments = {
        SentinelClaim: sentinelClaimAddress,
        RiskPoolReactor: riskPoolReactorAddress,
        PlatformAddress: platformAddress
    };

    fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
    console.log("Deployment info saved to deployments.json");
    console.log("Deployment complete.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
