// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IAgentRequester {      
    function createRequest(          
        uint256 agentId,         
        address callbackAddress,          
        bytes4 callbackSelector,          
        bytes calldata payload      
    ) external payable returns (uint256 requestId);
    
    function getRequestDeposit() external view returns (uint256); 
}

interface IJsonApiAgent {
    function fetchUint(string calldata url, string calldata selector, uint8 decimals) external returns (uint256);
} 

enum ResponseStatus { None, Pending, Success, Failed, TimedOut }

struct Response {      
    address validator;
    bytes result;      
    ResponseStatus status;      
    uint256 receipt;      
    uint256 timestamp;      
    uint256 executionCost;  
}  

struct Request {      
    uint256 id;      
    address requester;      
    address callbackAddress;      
    bytes4 callbackSelector;      
    address[] subcommittee;      
    Response[] responses;      
    uint256 responseCount; 
    uint256 failureCount;       
    uint256 threshold;      
    uint256 createdAt;      
    uint256 deadline;      
    ResponseStatus status;      
    uint8 consensusType;  // 0=Majority, 1=Threshold      
    uint256 remainingBudget;      
    uint256 perAgentBudget;  
}

enum PolicyStatus { Active, CheckingWeather, ClaimApproved, PaidOut, Expired, Failed }  

struct Policy {      
    address holder;      
    int256 latitude;       // scaled by 1e6 (e.g., 28600000 = 28.6 degrees)      
    int256 longitude;      // scaled by 1e6      
    uint256 premium;       // amount paid by user      
    uint256 coverage;      // max payout amount      
    uint256 thresholdMm;   // rainfall threshold in mm (scaled by 1e2 for decimals)      
    PolicyStatus status;      
    uint256 createdAt;      
    uint256 expiresAt;     // policy expiration timestamp      
    uint256 lastCheckRequestId;  // tracks pending agent request      
    uint256 lastRainfall;  // last recorded rainfall for this policy  
}

/// @title SentinelClaim
/// @dev Autonomous parametric insurance protocol for weather insurance on Somnia.
/// Utilizes Somnia Agents to autonomously fetch off-chain weather data and process claims without human intervention.
contract SentinelClaim {
    mapping(uint256 => Policy) public policies;
    uint256 public policyCount; 
    uint256 public riskPool; 
    uint256 public totalPremiumsCollected;
    uint256 public totalClaimsPaid;
    uint256 public totalClaimsCount; 
    address public owner;
    
    /// @notice The Somnia Agent ID used to fetch data off-chain. Settable by owner.
    uint256 public agentId; 
    
    /// @notice Default policy duration in seconds.
    uint256 public policyDuration = 30 days;
    
    /// @notice Maps agent request IDs to policy IDs.
    mapping(uint256 => uint256) public requestToPolicyId;
    
    string private OPENWEATHER_API_KEY;
    IAgentRequester public platform;

    event PolicyCreated(uint256 indexed policyId, address indexed holder, int256 latitude, int256 longitude, uint256 coverage, uint256 thresholdMm, uint256 premium, uint256 expiresAt);
    event WeatherCheckRequested(uint256 indexed policyId, uint256 requestId);
    event WeatherChecked(uint256 indexed policyId, uint256 rainfall);
    event ClaimSettled(uint256 indexed policyId, address indexed holder, uint256 coverage, uint256 rainfall, uint256 timestamp);
    event WeatherCheckFailed(uint256 indexed policyId, uint256 requestId);
    event RiskPoolFunded(address indexed funder, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @notice Initializes the SentinelClaim contract.
    /// @param _platformAddress The address of the Somnia Agent platform contract.
    constructor(address _platformAddress) {
        owner = msg.sender;
        platform = IAgentRequester(_platformAddress);
    }

    /// @notice Allows the contract to receive funds (rebates or direct funding).
    receive() external payable {}

    /// @notice Funds the risk pool so claims can be paid.
    /// @dev Anyone can contribute to the pool.
    function fundRiskPool() external payable {
        riskPool += msg.value;
        emit RiskPoolFunded(msg.sender, msg.value);
    }

    /// @notice Helper to convert int256 to string, specifically used to format URL parameters for the Agent.
    function intToString(int256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value < 0 ? uint256(-value) : uint256(value);
        uint256 digits;
        uint256 temp2 = temp;
        while (temp2 != 0) {
            digits++;
            temp2 /= 10;
        }
        bytes memory buffer = new bytes(value < 0 ? digits + 1 : digits);
        uint256 index = buffer.length;
        temp2 = temp;
        while (temp2 != 0) {
            index -= 1;
            buffer[index] = bytes1(uint8(48 + temp2 % 10));
            temp2 /= 10;
        }
        if (value < 0) {
            buffer[0] = "-";
        }
        return string(buffer);
    }

    /// @notice Creates a new weather insurance policy.
    /// @dev The user pays the calculated premium. Limits coverage to 10% of the current risk pool to prevent draining.
    /// @param latitude The latitude scaled by 1e6.
    /// @param longitude The longitude scaled by 1e6.
    /// @param coverageAmount The maximum payout amount for this policy.
    /// @param thresholdMm The rainfall threshold in mm (scaled by 1e2).
    function createPolicy(int256 latitude, int256 longitude, uint256 coverageAmount, uint256 thresholdMm) external payable {
        uint256 premium = calculatePremium(coverageAmount, thresholdMm);
        require(msg.value >= premium, "Insufficient premium paid");
        require(coverageAmount <= riskPool / 10, "Coverage exceeds 10% of risk pool");

        uint256 policyId = policyCount++;
        uint256 expiresAt = block.timestamp + policyDuration;

        policies[policyId] = Policy({
            holder: msg.sender,
            latitude: latitude,
            longitude: longitude,
            premium: premium,
            coverage: coverageAmount,
            thresholdMm: thresholdMm,
            status: PolicyStatus.Active,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            lastCheckRequestId: 0,
            lastRainfall: 0
        });

        riskPool += premium;
        totalPremiumsCollected += premium;

        // Refund excess premium
        if (msg.value > premium) {
            payable(msg.sender).transfer(msg.value - premium);
        }

        emit PolicyCreated(policyId, msg.sender, latitude, longitude, coverageAmount, thresholdMm, premium, expiresAt);
    }

    /// @notice Calculates the required premium based on requested coverage and threshold.
    /// @param coverageAmount The maximum payout amount.
    /// @param thresholdMm The rainfall threshold. Lower thresholds imply higher risk.
    function calculatePremium(uint256 coverageAmount, uint256 thresholdMm) public pure returns (uint256) {
        uint256 baseRate = (coverageAmount * 5) / 100; // 5% base rate
        uint256 finalPremium = baseRate;

        if (thresholdMm < 5000) {
            finalPremium = (baseRate * 200) / 100; // 200% base
        } else if (thresholdMm < 10000) {
            finalPremium = (baseRate * 150) / 100; // 150% base
        }

        if (finalPremium < 0.01 ether) { // Using ether unit for STT
            finalPremium = 0.01 ether;
        }

        return finalPremium;
    }

    /// @notice Initiates a check for weather data using Somnia Agents.
    /// @dev Builds an OpenWeatherMap API URL and encodes the request using the IJsonApiAgent interface.
    ///      It utilizes the Somnia platform to autonomously query off-chain API reliably.
    /// @param policyId The ID of the policy to check.
    function checkWeather(uint256 policyId) external payable {
        Policy storage policy = policies[policyId];
        require(policy.holder != address(0), "Policy does not exist");
        require(policy.status == PolicyStatus.Active, "Policy not active");
        require(block.timestamp <= policy.expiresAt, "Policy expired");

        policy.status = PolicyStatus.CheckingWeather;

        string memory url = string(abi.encodePacked(
            "https://api.openweathermap.org/data/2.5/weather?lat=",
            intToString(policy.latitude / 1e6),
            "&lon=",
            intToString(policy.longitude / 1e6),
            "&appid=",
            OPENWEATHER_API_KEY
        ));

        bytes memory payload = abi.encodeWithSelector(IJsonApiAgent.fetchUint.selector, url, "rain.1h", uint8(2));
        
        uint256 deposit = platform.getRequestDeposit() + (0.03 ether * 3);
        require(msg.value >= deposit, "Insufficient deposit for agent request");

        uint256 requestId = platform.createRequest{value: msg.value}(
            agentId, 
            address(this), 
            this.handleWeatherResponse.selector, 
            payload
        );

        requestToPolicyId[requestId] = policyId;
        policy.lastCheckRequestId = requestId;

        emit WeatherCheckRequested(policyId, requestId);
    }

    /// @notice Callback function executed by Somnia Agents to provide the fetched weather data.
    /// @dev Automatically processes claims based on the fetched off-chain data securely provided by the Somnia network.
    /// @param requestId The ID of the request being resolved.
    /// @param responses Array of responses provided by the agent.
    /// @param status The status of the request (Success, Failed, etc.).
    /// @param details The original request details.
    function handleWeatherResponse(uint256 requestId, Response[] memory responses, ResponseStatus status, Request memory details) external {
        require(msg.sender == address(platform), "Only platform can call");
        
        uint256 policyId = requestToPolicyId[requestId];
        Policy storage policy = policies[policyId];

        if (status == ResponseStatus.Success && responses.length > 0) {
            uint256 rainfall = abi.decode(responses[0].result, (uint256));
            policy.lastRainfall = rainfall;

            if (rainfall >= policy.thresholdMm) {
                policy.status = PolicyStatus.ClaimApproved;
                
                require(riskPool >= policy.coverage, "Insufficient risk pool");
                riskPool -= policy.coverage;
                totalClaimsPaid += policy.coverage;
                totalClaimsCount += 1;
                
                policy.status = PolicyStatus.PaidOut;
                
                payable(policy.holder).transfer(policy.coverage);
                
                emit ClaimSettled(policyId, policy.holder, policy.coverage, rainfall, block.timestamp);
            } else {
                policy.status = PolicyStatus.Active;
                emit WeatherChecked(policyId, rainfall);
            }
        } else if (status == ResponseStatus.Failed || status == ResponseStatus.TimedOut) {
            policy.status = PolicyStatus.Active;
            emit WeatherCheckFailed(policyId, requestId);
        }
    }

    /// @notice Sets the API key used for querying weather data.
    /// @param _apiKey The OpenWeatherMap API key.
    function setApiKey(string calldata _apiKey) external onlyOwner {
        OPENWEATHER_API_KEY = _apiKey;
    }

    /// @notice Sets the Agent ID on the Somnia platform.
    /// @param _agentId The ID of the agent to route requests to.
    function setAgentId(uint256 _agentId) external onlyOwner {
        agentId = _agentId;
    }

    /// @notice FOR DEMO PURPOSES ONLY. Simulates a successful claim payout without invoking external agents.
    /// @dev Used for demonstrations to circumvent potential testnet agent congestion or API delays.
    /// @param policyId The ID of the policy to forcefully settle.
    function triggerClaimDemo(uint256 policyId) external onlyOwner {
        Policy storage policy = policies[policyId];
        require(policy.holder != address(0), "Policy does not exist");
        require(policy.status == PolicyStatus.Active, "Policy not active");
        
        uint256 simulatedRainfall = policy.thresholdMm + 100;
        policy.lastRainfall = simulatedRainfall;
        policy.status = PolicyStatus.ClaimApproved;
        
        require(riskPool >= policy.coverage, "Insufficient risk pool");
        riskPool -= policy.coverage;
        totalClaimsPaid += policy.coverage;
        totalClaimsCount += 1;
        
        policy.status = PolicyStatus.PaidOut;
        payable(policy.holder).transfer(policy.coverage);
        
        emit ClaimSettled(policyId, policy.holder, policy.coverage, simulatedRainfall, block.timestamp);
    }

    /// @notice Retrieves the details of a specific policy.
    /// @param policyId The ID of the policy.
    /// @return The policy struct.
    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        return policies[policyId];
    }

    /// @notice Retrieves aggregate statistics about the insurance protocol.
    /// @return pool Total available funds in the risk pool.
    /// @return premiums Total premium amount collected from users.
    /// @return claims Total coverage amounts paid out.
    /// @return claimCount Total number of claims paid.
    /// @return lossRatio Loss ratio calculated in basis points (paid claims / collected premiums * 10000).
    function getPoolStats() external view returns (uint256 pool, uint256 premiums, uint256 claims, uint256 claimCount, uint256 lossRatio) {
        pool = riskPool;
        premiums = totalPremiumsCollected;
        claims = totalClaimsPaid;
        claimCount = totalClaimsCount;
        if (totalPremiumsCollected > 0) {
            lossRatio = (totalClaimsPaid * 10000) / totalPremiumsCollected;
        } else {
            lossRatio = 0;
        }
    }
}
