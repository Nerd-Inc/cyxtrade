// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ICyxTradeEscrow
 * @notice Interface for CyxTradeEscrow contract
 */
interface ICyxTradeEscrow {
    enum TradeState {
        CREATED,
        ACCEPTED,
        USER_PAID,
        DELIVERING,
        COMPLETED,
        DISPUTED,
        RESOLVED,
        CANCELLED
    }

    struct Bond {
        uint256 amount;
        uint256 locked;
        bool active;
    }

    struct Trade {
        bytes32 tradeId;
        address trader;
        bytes32 userId;
        uint256 sendAmount;
        uint256 receiveAmount;
        uint256 bondLocked;
        TradeState state;
        uint256 createdAt;
        uint256 timeout;
    }

    // Events
    event BondDeposited(address indexed trader, uint256 amount, uint256 totalBond);
    event BondWithdrawn(address indexed trader, uint256 amount, uint256 remaining);
    event TradeCreated(bytes32 indexed tradeId, address indexed trader, bytes32 userId, uint256 sendAmount, uint256 receiveAmount, uint256 bondLocked);
    event TradeStateChanged(bytes32 indexed tradeId, TradeState oldState, TradeState newState);
    event TradeCompleted(bytes32 indexed tradeId, address indexed trader, uint256 bondUnlocked);
    event TradeCancelled(bytes32 indexed tradeId, address indexed trader, uint256 bondUnlocked);
    event DisputeOpened(bytes32 indexed tradeId, address indexed trader);
    event DisputeResolved(bytes32 indexed tradeId, bool favorUser, uint256 bondSlashed);

    // Trader functions
    function depositBond(uint256 amount) external;
    function withdrawBond(uint256 amount) external;
    function getAvailableBond(address trader) external view returns (uint256);

    // Backend functions
    function createTrade(
        bytes32 tradeId,
        address trader,
        bytes32 userId,
        uint256 sendAmount,
        uint256 receiveAmount,
        uint256 bondToLock,
        uint256 timeout
    ) external;
    function updateTradeState(bytes32 tradeId, TradeState newState) external;
    function completeTrade(bytes32 tradeId) external;
    function cancelTrade(bytes32 tradeId) external;
    function openDispute(bytes32 tradeId) external;

    // Dispute resolution
    function setDisputeResolver(address _disputeResolver) external;
    function resolveDispute(bytes32 tradeId, bool favorUser, address compensationAddress) external;

    // View functions
    function getTrade(bytes32 tradeId) external view returns (Trade memory);
    function getBond(address trader) external view returns (Bond memory);
}
