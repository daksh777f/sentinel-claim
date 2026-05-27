import { expect } from "chai";
import hre from "hardhat";

describe("SentinelClaim", function () {
    let sentinelClaim;
    let owner;
    let user;
    let otherUser;
    
    // Mock platform address
    const MOCK_PLATFORM = "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776";

    beforeEach(async function () {
        [owner, user, otherUser] = await hre.ethers.getSigners();

        const SentinelClaim = await hre.ethers.getContractFactory("SentinelClaim");
        sentinelClaim = await SentinelClaim.deploy(MOCK_PLATFORM);
        await sentinelClaim.waitForDeployment();

        // Fund risk pool so coverage check passes
        await sentinelClaim.fundRiskPool({ value: hre.ethers.parseEther("100") });
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await sentinelClaim.owner()).to.equal(owner.address);
        });

        it("Should track risk pool funding", async function () {
            const stats = await sentinelClaim.getPoolStats();
            expect(stats[0]).to.equal(hre.ethers.parseEther("100"));
        });
    });

    describe("Premium Calculation", function () {
        it("Should calculate 5% premium for threshold >= 100mm", async function () {
            // 100mm = 10000
            const premium = await sentinelClaim.calculatePremium(hre.ethers.parseEther("10"), 10000);
            expect(premium).to.equal(hre.ethers.parseEther("0.5")); // 5% of 10
        });

        it("Should calculate 7.5% premium for threshold between 50mm and 100mm", async function () {
            // 75mm = 7500
            const premium = await sentinelClaim.calculatePremium(hre.ethers.parseEther("10"), 7500);
            expect(premium).to.equal(hre.ethers.parseEther("0.75")); // 150% of 5% = 7.5%
        });

        it("Should calculate 10% premium for threshold < 50mm", async function () {
            // 20mm = 2000
            const premium = await sentinelClaim.calculatePremium(hre.ethers.parseEther("10"), 2000);
            expect(premium).to.equal(hre.ethers.parseEther("1.0")); // 200% of 5% = 10%
        });

        it("Should enforce minimum premium", async function () {
            const premium = await sentinelClaim.calculatePremium(hre.ethers.parseEther("0.1"), 10000);
            // 5% of 0.1 is 0.005, which is < 0.01 ether, so it should be 0.01 ether
            expect(premium).to.equal(hre.ethers.parseEther("0.01"));
        });
    });

    describe("Policy Creation", function () {
        it("Should create a policy successfully", async function () {
            const coverage = hre.ethers.parseEther("10");
            const thresholdMm = 10000;
            const premium = await sentinelClaim.calculatePremium(coverage, thresholdMm);
            
            await expect(sentinelClaim.connect(user).createPolicy(28600000, -81600000, coverage, thresholdMm, { value: premium }))
                .to.emit(sentinelClaim, "PolicyCreated");

            const policy = await sentinelClaim.getPolicy(0);
            expect(policy.holder).to.equal(user.address);
            expect(policy.coverage).to.equal(coverage);
            expect(policy.premium).to.equal(premium);
            expect(policy.status).to.equal(0n); // Active

            const stats = await sentinelClaim.getPoolStats();
            expect(stats[1]).to.equal(premium); // Premiums collected
        });

        it("Should revert if premium is insufficient", async function () {
            const coverage = hre.ethers.parseEther("10");
            const thresholdMm = 10000;
            const premium = await sentinelClaim.calculatePremium(coverage, thresholdMm);
            
            await expect(sentinelClaim.connect(user).createPolicy(28600000, -81600000, coverage, thresholdMm, { value: premium - 1n }))
                .to.be.revertedWith("Insufficient premium paid");
        });

        it("Should revert if coverage exceeds 10% of risk pool", async function () {
            const coverage = hre.ethers.parseEther("11"); // Pool is 100 + premium, 11 > 10% of 100 roughly
            const thresholdMm = 10000;
            const premium = await sentinelClaim.calculatePremium(coverage, thresholdMm);
            
            await expect(sentinelClaim.connect(user).createPolicy(28600000, -81600000, coverage, thresholdMm, { value: premium }))
                .to.be.revertedWith("Coverage exceeds 10% of risk pool");
        });
    });

    describe("Owner Functions", function () {
        it("Should allow owner to set Agent ID", async function () {
            await sentinelClaim.setAgentId(5);
            expect(await sentinelClaim.agentId()).to.equal(5n);
        });

        it("Should revert if non-owner tries to set Agent ID", async function () {
            await expect(sentinelClaim.connect(user).setAgentId(5)).to.be.revertedWith("Not owner");
        });

        it("Should allow owner to set API Key", async function () {
            await sentinelClaim.setApiKey("test_key");
        });
    });

    describe("Trigger Claim Demo", function () {
        it("Should payout and update stats on demo trigger", async function () {
            const coverage = hre.ethers.parseEther("5");
            const thresholdMm = 10000;
            const premium = await sentinelClaim.calculatePremium(coverage, thresholdMm);
            
            await sentinelClaim.connect(user).createPolicy(28600000, -81600000, coverage, thresholdMm, { value: premium });
            
            const initialBalance = await hre.ethers.provider.getBalance(user.address);
            
            await expect(sentinelClaim.triggerClaimDemo(0))
                .to.emit(sentinelClaim, "ClaimSettled");
                
            const policy = await sentinelClaim.getPolicy(0);
            expect(policy.status).to.equal(3n); // PaidOut
            expect(policy.lastRainfall).to.equal(thresholdMm + 100);
            
            const finalBalance = await hre.ethers.provider.getBalance(user.address);
            expect(finalBalance - initialBalance).to.equal(coverage);
            
            const stats = await sentinelClaim.getPoolStats();
            expect(stats[2]).to.equal(coverage); // totalClaimsPaid
            expect(stats[3]).to.equal(1n); // totalClaimsCount
        });
    });

    describe("Policy Check", function () {
        it("Should revert on checkWeather if expired", async function () {
            const coverage = hre.ethers.parseEther("5");
            const thresholdMm = 10000;
            const premium = await sentinelClaim.calculatePremium(coverage, thresholdMm);
            
            await sentinelClaim.connect(user).createPolicy(28600000, -81600000, coverage, thresholdMm, { value: premium });
            
            // Advance time beyond policyDuration (30 days)
            await hre.ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
            await hre.ethers.provider.send("evm_mine");

            await expect(sentinelClaim.checkWeather(0)).to.be.revertedWith("Policy expired");
        });
    });
});
