// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title CyxTradeEscrow
 * @notice Non-custodial escrow for CyxTrade P2P fiat exchange
 * @dev Traders deposit USDT bonds. Backend creates trades. If trader scams, bond is slashed.
 *
 * KEY SECURITY PROPERTIES:
 * - No admin functions (immutable)
 * - Backend can lock bonds but CANNOT withdraw them
 * - Only trader's wallet can withdraw their own bond
 * - Contract address set at deployment (can't change)
 */
contract CyxTradeEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Types ============

    enum TradeState {
        CREATED,        // Trade initiated, bond locked
        ACCEPTED,       // Trader accepted
        USER_PAID,      // User confirms sent fiat to trader
        DELIVERING,     // Trader confirms received, sending to recipient
        COMPLETED,      // User confirms recipient received
        DISPUTED,       // Dispute opened
        RESOLVED,       // Dispute resolved
        CANCELLED       // Cancelled before USER_PAID
    }

    struct Bond {
        uint256 amount;     // Total deposited USDT
        uint256 locked;     // Amount locked in active trades
        bool active;        // Has deposited at least once
    }

    struct Trade {
        bytes32 tradeId;            // Unique trade identifier
        address trader;             // Trader handling this trade
        bytes32 userId;             // Off-chain user reference (hash)
        uint256 sendAmount;         // Fiat amount user sends (for record, e.g., 1000 AED)
        uint256 receiveAmount;      // Fiat amount recipient gets (for record, e.g., 163000 XAF)
        uint256 bondLocked;         // USDT locked from trader's bond
        TradeState state;
        uint256 createdAt;
        uint256 timeout;            // Timeout timestamp for auto-dispute
    }

    // ============ State ============

    IERC20 public immutable usdt;
    address public immutable backend;
    address public disputeResolver;     // ArbitratorRegistry/DisputeResolution contract

    mapping(address => Bond) public bonds;
    mapping(bytes32 => Trade) public trades;

    // Track active trades per trader (for withdrawal check)
    mapping(address => uint256) public activeTradeCount;

    // ============ Events ============

    event BondDeposited(address indexed trader, uint256 amount, uint256 totalBond);
    event BondWithdrawn(address indexed trader, uint256 amount, uint256 remaining);

    event TradeCreated(
        bytes32 indexed tradeId,
        address indexed trader,
        bytes32 userId,
        uint256 sendAmount,
        uint256 receiveAmount,
        uint256 bondLocked
    );
    event TradeStateChanged(bytes32 indexed tradeId, TradeState oldState, TradeState newState);
    event TradeCompleted(bytes32 indexed tradeId, address indexed trader, uint256 bondUnlocked);
    event TradeCancelled(bytes32 indexed tradeId, address indexed trader, uint256 bondUnlocked);

    event DisputeOpened(bytes32 indexed tradeId, address indexed trader);
    event DisputeResolved(bytes32 indexed tradeId, bool favorUser, uint256 bondSlashed);

    // ============ Errors ============

    error OnlyBackend();
    error OnlyDisputeResolver();
    error InsufficientBond();
    error NoBondToWithdraw();
    error BondLocked();
    error TradeNotFound();
    error InvalidStateTransition();
    error TradeAlreadyExists();
    error ZeroAmount();
    error TradeNotDisputed();
    error TradeAlreadyResolved();

    // ============ Modifiers ============

    modifier onlyBackend() {
        if (msg.sender != backend) revert OnlyBackend();
        _;
    }

    modifier onlyDisputeResolver() {
        if (msg.sender != disputeResolver) revert OnlyDisputeResolver();
        _;
    }

    modifier tradeExists(bytes32 tradeId) {
        if (trades[tradeId].trader == address(0)) revert TradeNotFound();
        _;
    }

    // ============ Constructor ============

    /**
     * @param _usdt USDT token address (TRC20 on Tron)
     * @param _backend Backend address that can create/update trades
     */
    constructor(address _usdt, address _backend) {
        usdt = IERC20(_usdt);
        backend = _backend;
    }

    // ============ Trader Functions ============

    /**
     * @notice Deposit USDT to bond
     * @param amount Amount of USDT to deposit
     */
    function depositBond(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        usdt.safeTransferFrom(msg.sender, address(this), amount);

        bonds[msg.sender].amount += amount;
        bonds[msg.sender].active = true;

        emit BondDeposited(msg.sender, amount, bonds[msg.sender].amount);
    }

    /**
     * @notice Withdraw unlocked bond
     * @param amount Amount to withdraw
     */
    function withdrawBond(uint256 amount) external nonReentrant {
        Bond storage bond = bonds[msg.sender];

        if (amount == 0) revert ZeroAmount();
        if (!bond.active || bond.amount == 0) revert NoBondToWithdraw();

        uint256 available = bond.amount - bond.locked;
        if (amount > available) revert BondLocked();

        bond.amount -= amount;

        usdt.safeTransfer(msg.sender, amount);

        emit BondWithdrawn(msg.sender, amount, bond.amount);
    }

    /**
     * @notice Get available (unlocked) bond for a trader
     * @param trader Trader address
     * @return available Unlocked bond amount
     */
    function getAvailableBond(address trader) external view returns (uint256) {
        Bond storage bond = bonds[trader];
        return bond.amount - bond.locked;
    }

    // ============ Backend Functions ============

    /**
     * @notice Create a trade and lock trader's bond
     * @param tradeId Unique trade identifier
     * @param trader Trader handling this trade
     * @param userId Off-chain user reference (hashed)
     * @param sendAmount Fiat amount user sends (for record)
     * @param receiveAmount Fiat amount recipient gets (for record)
     * @param bondToLock Amount of USDT to lock from trader's bond
     * @param timeout Timeout timestamp for auto-dispute
     */
    function createTrade(
        bytes32 tradeId,
        address trader,
        bytes32 userId,
        uint256 sendAmount,
        uint256 receiveAmount,
        uint256 bondToLock,
        uint256 timeout
    ) external onlyBackend {
        if (trades[tradeId].trader != address(0)) revert TradeAlreadyExists();
        if (bondToLock == 0) revert ZeroAmount();

        Bond storage bond = bonds[trader];
        uint256 available = bond.amount - bond.locked;
        if (available < bondToLock) revert InsufficientBond();

        // Lock bond
        bond.locked += bondToLock;
        activeTradeCount[trader]++;

        // Create trade
        trades[tradeId] = Trade({
            tradeId: tradeId,
            trader: trader,
            userId: userId,
            sendAmount: sendAmount,
            receiveAmount: receiveAmount,
            bondLocked: bondToLock,
            state: TradeState.CREATED,
            createdAt: block.timestamp,
            timeout: timeout
        });

        emit TradeCreated(tradeId, trader, userId, sendAmount, receiveAmount, bondToLock);
    }

    /**
     * @notice Update trade state
     * @param tradeId Trade identifier
     * @param newState New state to transition to
     */
    function updateTradeState(bytes32 tradeId, TradeState newState)
        external
        onlyBackend
        tradeExists(tradeId)
    {
        Trade storage trade = trades[tradeId];
        TradeState oldState = trade.state;

        // Validate state transitions
        if (!_isValidTransition(oldState, newState)) revert InvalidStateTransition();

        trade.state = newState;

        emit TradeStateChanged(tradeId, oldState, newState);
    }

    /**
     * @notice Complete a trade successfully - unlocks trader's bond
     * @param tradeId Trade identifier
     */
    function completeTrade(bytes32 tradeId)
        external
        onlyBackend
        tradeExists(tradeId)
    {
        Trade storage trade = trades[tradeId];

        // Can only complete from DELIVERING state
        if (trade.state != TradeState.DELIVERING) revert InvalidStateTransition();

        // Unlock bond
        uint256 bondUnlocked = trade.bondLocked;
        bonds[trade.trader].locked -= bondUnlocked;
        activeTradeCount[trade.trader]--;

        trade.state = TradeState.COMPLETED;

        emit TradeCompleted(tradeId, trade.trader, bondUnlocked);
    }

    /**
     * @notice Cancel a trade - only allowed before USER_PAID
     * @param tradeId Trade identifier
     */
    function cancelTrade(bytes32 tradeId)
        external
        onlyBackend
        tradeExists(tradeId)
    {
        Trade storage trade = trades[tradeId];

        // Can only cancel before user has paid
        if (trade.state != TradeState.CREATED && trade.state != TradeState.ACCEPTED) {
            revert InvalidStateTransition();
        }

        // Unlock bond
        uint256 bondUnlocked = trade.bondLocked;
        bonds[trade.trader].locked -= bondUnlocked;
        activeTradeCount[trade.trader]--;

        trade.state = TradeState.CANCELLED;

        emit TradeCancelled(tradeId, trade.trader, bondUnlocked);
    }

    /**
     * @notice Open a dispute - freezes trade for arbitration
     * @param tradeId Trade identifier
     */
    function openDispute(bytes32 tradeId)
        external
        onlyBackend
        tradeExists(tradeId)
    {
        Trade storage trade = trades[tradeId];

        // Can only dispute after user has paid
        if (trade.state != TradeState.USER_PAID && trade.state != TradeState.DELIVERING) {
            revert InvalidStateTransition();
        }

        trade.state = TradeState.DISPUTED;

        emit DisputeOpened(tradeId, trade.trader);
    }

    // ============ Dispute Resolution Functions ============

    /**
     * @notice Set the dispute resolver contract address
     * @param _disputeResolver Address of DisputeResolution contract
     */
    function setDisputeResolver(address _disputeResolver) external onlyBackend {
        disputeResolver = _disputeResolver;
    }

    /**
     * @notice Resolve a dispute - called by DisputeResolution contract
     * @param tradeId Trade identifier
     * @param favorUser True if user wins, false if trader wins
     * @param compensationAddress Address to send slashed bond (if user wins)
     */
    function resolveDispute(bytes32 tradeId, bool favorUser, address compensationAddress)
        external
        onlyDisputeResolver
        tradeExists(tradeId)
    {
        Trade storage trade = trades[tradeId];

        if (trade.state != TradeState.DISPUTED) revert TradeNotDisputed();

        uint256 bondAmount = trade.bondLocked;
        address trader = trade.trader;

        if (favorUser) {
            // Slash trader's bond - send to compensation address
            bonds[trader].locked -= bondAmount;
            bonds[trader].amount -= bondAmount;

            usdt.safeTransfer(compensationAddress, bondAmount);

            emit DisputeResolved(tradeId, true, bondAmount);
        } else {
            // Trader wins - unlock bond
            bonds[trader].locked -= bondAmount;

            emit DisputeResolved(tradeId, false, 0);
        }

        activeTradeCount[trader]--;
        trade.state = TradeState.RESOLVED;
    }

    // ============ View Functions ============

    /**
     * @notice Get trade details
     * @param tradeId Trade identifier
     * @return Trade struct
     */
    function getTrade(bytes32 tradeId) external view returns (Trade memory) {
        return trades[tradeId];
    }

    /**
     * @notice Get bond details for a trader
     * @param trader Trader address
     * @return Bond struct
     */
    function getBond(address trader) external view returns (Bond memory) {
        return bonds[trader];
    }

    // ============ Internal Functions ============

    /**
     * @notice Validate state transitions
     * @param from Current state
     * @param to Target state
     * @return valid True if transition is allowed
     */
    function _isValidTransition(TradeState from, TradeState to) internal pure returns (bool) {
        // CREATED -> ACCEPTED
        if (from == TradeState.CREATED && to == TradeState.ACCEPTED) return true;

        // ACCEPTED -> USER_PAID
        if (from == TradeState.ACCEPTED && to == TradeState.USER_PAID) return true;

        // USER_PAID -> DELIVERING
        if (from == TradeState.USER_PAID && to == TradeState.DELIVERING) return true;

        // DELIVERING -> COMPLETED is handled by completeTrade()
        // CREATED/ACCEPTED -> CANCELLED is handled by cancelTrade()
        // USER_PAID/DELIVERING -> DISPUTED is handled by openDispute()

        return false;
    }
}
