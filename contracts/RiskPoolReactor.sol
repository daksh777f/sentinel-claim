// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol"; 
import { SomniaExtensions } from "@somnia-chain/reactivity-contracts/contracts/interfaces/SomniaExtensions.sol"; 

contract RiskPoolReactor is SomniaEventHandler {
    address public sentinelClaimAddress;
    uint256 public claimsProcessed;
    uint256 public totalPayoutsTracked;
    address public owner;

    event RiskPoolAdjusted(uint256 claimsProcessed, uint256 totalPayoutsTracked, uint256 averagePayout, uint256 timestamp);
    event AuditEntry(uint256 indexed policyId, address indexed holder, uint256 amount, uint256 rainfall, uint256 timestamp);

    uint256 public subscriptionId;

    constructor(address _sentinelClaimAddress) payable SomniaEventHandler() {
        require(msg.value >= 0.1 ether, "Must send at least 0.1 STT for subscription funding");
        owner = msg.sender;
        sentinelClaimAddress = _sentinelClaimAddress;
        
        bytes32 CLAIM_SETTLED_SIG = keccak256("ClaimSettled(uint256,address,uint256,uint256,uint256)");
        
        SomniaExtensions.SubscriptionFilter memory filter = SomniaExtensions.SubscriptionFilter({
            eventTopics: [CLAIM_SETTLED_SIG, bytes32(0), bytes32(0), bytes32(0)],
            origin: address(0),
            emitter: sentinelClaimAddress
        });
        
        SomniaExtensions.SubscriptionOptions memory options = SomniaExtensions.SubscriptionOptions({
            priorityFeePerGas: 1,
            maxFeePerGas: 20 gwei,
            gasLimit: 2000000
        });
        
        subscriptionId = SomniaExtensions.subscribe(address(this), filter, options);
    }

    function _onEvent(
        address /* emitter */,
        bytes32[] calldata /* eventTopics */,
        bytes calldata _data
    ) internal override {
        (uint256 policyId, address holder, uint256 amount, uint256 rainfall, uint256 timestamp) = abi.decode(
            _data,
            (uint256, address, uint256, uint256, uint256)
        );

        claimsProcessed++;
        totalPayoutsTracked += amount;
        uint256 averagePayout = totalPayoutsTracked / claimsProcessed;

        emit RiskPoolAdjusted(claimsProcessed, totalPayoutsTracked, averagePayout, block.timestamp);
        emit AuditEntry(policyId, holder, amount, rainfall, block.timestamp);
    }

    function stop() external {
        require(msg.sender == owner, "Only owner can stop");
        SomniaExtensions.unsubscribe(subscriptionId);
    }
}
