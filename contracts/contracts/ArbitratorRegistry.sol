// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ArbitratorRegistry
 * @notice Manages arbitrator registration, staking, eligibility, and earnings
 * @dev Arbitrators must be Tier 3+ traders with 50+ trades. Stake 500+ USDT.
 *
 * ELIGIBILITY REQUIREMENTS:
 * - 50+ completed trades
 * - <2% dispute rate
 * - 6+ months active (account age)
 * - 200+ reputation score
 * - No pending disputes
 */
contract ArbitratorRegistry is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    uint256 public constant MIN_STAKE = 500 * 1e6;          // 500 USDT
    uint256 public constant MIN_TRADES = 50;                 // 50 completed trades
    uint256 public constant MIN_REPUTATION = 200;            // 200 rep points
    uint256 public constant MIN_ACCOUNT_AGE = 180 days;      // 6 months
    uint256 public constant MAX_DISPUTE_RATE = 200;          // 2% (basis points)
    uint256 public constant ARBITRATORS_PER_DISPUTE = 5;
    uint256 public constant SLASH_TIMEOUT_PERCENT = 1;       // 1% for timeout
    uint256 public constant SLASH_CORRUPTION_PERCENT = 100;  // 100% for corruption
    uint256 public constant ARBITRATOR_FEE_BPS = 10;         // 0.1% of trade value

    // ============ Types ============

    struct Arbitrator {
        uint256 stake;              // Staked USDT
        uint256 reputation;         // Earned from correct votes
        uint256 disputesHandled;    // Total disputes participated
        uint256 disputesActive;     // Current active disputes
        uint256 totalEarnings;      // Total USDT earned
        uint256 registeredAt;       // When they registered
        bool active;                // Currently registered
    }

    struct TraderStats {
        uint256 completedTrades;
        uint256 disputeCount;
        uint256 registeredAt;
        uint256 reputation;
        bool exists;
    }

    // ============ State ============

    IERC20 public immutable usdt;
    address public escrowContract;
    address public disputeContract;

    mapping(address => Arbitrator) public arbitrators;
    address[] public arbitratorList;
    mapping(address => uint256) public arbitratorIndex;  // 1-indexed

    // Trader stats (synced from escrow or set by backend)
    mapping(address => TraderStats) public traderStats;

    uint256 public totalArbitrators;
    uint256 public feePool;  // Accumulated fees for distribution

    // ============ Events ============

    event ArbitratorRegistered(address indexed arbitrator, uint256 stake);
    event ArbitratorUnregistered(address indexed arbitrator, uint256 stakeReturned);
    event ArbitratorSlashed(address indexed arbitrator, uint256 amount, bytes32 reason);
    event ArbitratorRewarded(address indexed arbitrator, uint256 reputation, uint256 feeShare);
    event ArbitratorEarnings(address indexed arbitrator, uint256 amount);
    event TraderStatsUpdated(address indexed trader, uint256 trades, uint256 reputation);
    event DisputeContractSet(address indexed disputeContract);
    event EscrowContractSet(address indexed escrowContract);
    event FeeDeposited(uint256 amount);

    // ============ Errors ============

    error InsufficientStake();
    error NotRegistered();
    error AlreadyRegistered();
    error HasActiveDisputes();
    error OnlyDisputeContract();
    error OnlyEscrowOrBackend();
    error NotEnoughArbitrators();
    error ZeroAddress();
    error NotEligible(string reason);

    // ============ Modifiers ============

    modifier onlyDisputeContract() {
        if (msg.sender != disputeContract) revert OnlyDisputeContract();
        _;
    }

    modifier onlyEscrowOrDispute() {
        if (msg.sender != escrowContract && msg.sender != disputeContract) {
            revert OnlyEscrowOrBackend();
        }
        _;
    }

    // ============ Constructor ============

    constructor(address _usdt) {
        usdt = IERC20(_usdt);
    }

    // ============ Admin Functions ============

    function setDisputeContract(address _disputeContract) external {
        if (disputeContract != address(0) && msg.sender != disputeContract) {
            revert OnlyDisputeContract();
        }
        if (_disputeContract == address(0)) revert ZeroAddress();
        disputeContract = _disputeContract;
        emit DisputeContractSet(_disputeContract);
    }

    function setEscrowContract(address _escrowContract) external {
        if (escrowContract != address(0) && msg.sender != escrowContract) {
            revert OnlyEscrowOrBackend();
        }
        if (_escrowContract == address(0)) revert ZeroAddress();
        escrowContract = _escrowContract;
        emit EscrowContractSet(_escrowContract);
    }

    // ============ Eligibility Functions ============

    /**
     * @notice Check if a trader is eligible to become an arbitrator
     * @param trader Address to check
     * @return eligible True if all requirements met
     */
    function isEligible(address trader) public view returns (bool eligible) {
        TraderStats memory stats = traderStats[trader];

        if (!stats.exists) return false;
        if (stats.completedTrades < MIN_TRADES) return false;
        if (stats.reputation < MIN_REPUTATION) return false;

        // Account age check
        if (block.timestamp < stats.registeredAt + MIN_ACCOUNT_AGE) return false;

        // Dispute rate check (disputes / trades * 10000 < 200 means <2%)
        if (stats.completedTrades > 0) {
            uint256 disputeRate = (stats.disputeCount * 10000) / stats.completedTrades;
            if (disputeRate > MAX_DISPUTE_RATE) return false;
        }

        return true;
    }

    /**
     * @notice Get detailed eligibility status
     * @param trader Address to check
     */
    function getEligibilityStatus(address trader) external view returns (
        bool eligible,
        uint256 trades,
        uint256 tradesRequired,
        uint256 reputation,
        uint256 reputationRequired,
        uint256 accountAgeDays,
        uint256 accountAgeRequiredDays,
        uint256 disputeRateBps,
        uint256 maxDisputeRateBps
    ) {
        TraderStats memory stats = traderStats[trader];

        trades = stats.completedTrades;
        tradesRequired = MIN_TRADES;
        reputation = stats.reputation;
        reputationRequired = MIN_REPUTATION;

        if (stats.registeredAt > 0 && block.timestamp > stats.registeredAt) {
            accountAgeDays = (block.timestamp - stats.registeredAt) / 1 days;
        }
        accountAgeRequiredDays = MIN_ACCOUNT_AGE / 1 days;

        if (stats.completedTrades > 0) {
            disputeRateBps = (stats.disputeCount * 10000) / stats.completedTrades;
        }
        maxDisputeRateBps = MAX_DISPUTE_RATE;

        eligible = isEligible(trader);
    }

    /**
     * @notice Update trader stats (called by escrow contract or backend)
     * @param trader Trader address
     * @param completedTrades Number of completed trades
     * @param disputeCount Number of disputes
     * @param registeredAt Registration timestamp
     * @param reputation Reputation score
     */
    function updateTraderStats(
        address trader,
        uint256 completedTrades,
        uint256 disputeCount,
        uint256 registeredAt,
        uint256 reputation
    ) external onlyEscrowOrDispute {
        traderStats[trader] = TraderStats({
            completedTrades: completedTrades,
            disputeCount: disputeCount,
            registeredAt: registeredAt,
            reputation: reputation,
            exists: true
        });

        emit TraderStatsUpdated(trader, completedTrades, reputation);
    }

    // ============ Arbitrator Functions ============

    /**
     * @notice Register as an arbitrator (must be eligible + stake)
     * @param stakeAmount Amount of USDT to stake (must be >= 500)
     */
    function register(uint256 stakeAmount) external nonReentrant {
        if (arbitrators[msg.sender].active) revert AlreadyRegistered();
        if (stakeAmount < MIN_STAKE) revert InsufficientStake();

        // Check eligibility
        if (!isEligible(msg.sender)) {
            TraderStats memory stats = traderStats[msg.sender];
            if (!stats.exists) revert NotEligible("No trading history");
            if (stats.completedTrades < MIN_TRADES) revert NotEligible("Need 50+ trades");
            if (stats.reputation < MIN_REPUTATION) revert NotEligible("Need 200+ reputation");
            if (block.timestamp < stats.registeredAt + MIN_ACCOUNT_AGE) revert NotEligible("Account too new");
            revert NotEligible("Dispute rate too high");
        }

        usdt.safeTransferFrom(msg.sender, address(this), stakeAmount);

        arbitrators[msg.sender] = Arbitrator({
            stake: stakeAmount,
            reputation: traderStats[msg.sender].reputation,  // Start with trader rep
            disputesHandled: 0,
            disputesActive: 0,
            totalEarnings: 0,
            registeredAt: block.timestamp,
            active: true
        });

        arbitratorList.push(msg.sender);
        arbitratorIndex[msg.sender] = arbitratorList.length;
        totalArbitrators++;

        emit ArbitratorRegistered(msg.sender, stakeAmount);
    }

    /**
     * @notice Add more stake to existing registration
     */
    function addStake(uint256 amount) external nonReentrant {
        if (!arbitrators[msg.sender].active) revert NotRegistered();
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        arbitrators[msg.sender].stake += amount;
    }

    /**
     * @notice Unregister and withdraw stake + accumulated earnings
     */
    function unregister() external nonReentrant {
        Arbitrator storage arb = arbitrators[msg.sender];

        if (!arb.active) revert NotRegistered();
        if (arb.disputesActive > 0) revert HasActiveDisputes();

        uint256 totalReturn = arb.stake;
        arb.active = false;
        arb.stake = 0;

        _removeFromList(msg.sender);
        totalArbitrators--;

        usdt.safeTransfer(msg.sender, totalReturn);

        emit ArbitratorUnregistered(msg.sender, totalReturn);
    }

    /**
     * @notice Claim accumulated earnings
     */
    function claimEarnings() external nonReentrant {
        // Earnings are paid directly now, this is for future accumulated model
    }

    // ============ Dispute Contract Functions ============

    /**
     * @notice Deposit fees from a dispute resolution
     * @param amount Fee amount to deposit
     */
    function depositFees(uint256 amount) external onlyDisputeContract {
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        feePool += amount;
        emit FeeDeposited(amount);
    }

    /**
     * @notice Select random arbitrators for a dispute
     */
    function selectArbitrators(bytes32 tradeId, uint256 count)
        external
        onlyDisputeContract
        returns (address[] memory selected)
    {
        if (totalArbitrators < count) revert NotEnoughArbitrators();

        selected = new address[](count);
        uint256[] memory indices = new uint256[](count);
        uint256 selectedCount = 0;

        uint256 seed = uint256(keccak256(abi.encodePacked(
            tradeId,
            blockhash(block.number - 1),
            block.timestamp
        )));

        while (selectedCount < count) {
            uint256 randomIndex = seed % arbitratorList.length;
            address candidate = arbitratorList[randomIndex];

            bool alreadySelected = false;
            for (uint256 i = 0; i < selectedCount; i++) {
                if (indices[i] == randomIndex) {
                    alreadySelected = true;
                    break;
                }
            }

            if (!alreadySelected && arbitrators[candidate].active) {
                selected[selectedCount] = candidate;
                indices[selectedCount] = randomIndex;
                arbitrators[candidate].disputesActive++;
                selectedCount++;
            }

            seed = uint256(keccak256(abi.encodePacked(seed, selectedCount)));
        }

        return selected;
    }

    /**
     * @notice Reward arbitrators who voted correctly
     * @param arbitrator Address of arbitrator
     * @param reputationPoints Reputation to add
     * @param feeShare USDT fee share to pay
     */
    function reward(address arbitrator, uint256 reputationPoints, uint256 feeShare)
        external
        onlyDisputeContract
    {
        Arbitrator storage arb = arbitrators[arbitrator];
        if (!arb.active) revert NotRegistered();

        arb.reputation += reputationPoints;
        arb.disputesHandled++;
        arb.totalEarnings += feeShare;

        if (arb.disputesActive > 0) {
            arb.disputesActive--;
        }

        // Pay fee directly
        if (feeShare > 0 && feePool >= feeShare) {
            feePool -= feeShare;
            usdt.safeTransfer(arbitrator, feeShare);
            emit ArbitratorEarnings(arbitrator, feeShare);
        }

        emit ArbitratorRewarded(arbitrator, reputationPoints, feeShare);
    }

    /**
     * @notice Slash for timeout (didn't vote)
     */
    function slashTimeout(address arbitrator) external onlyDisputeContract {
        Arbitrator storage arb = arbitrators[arbitrator];
        if (!arb.active) revert NotRegistered();

        uint256 slashAmount = (arb.stake * SLASH_TIMEOUT_PERCENT) / 100;
        arb.stake -= slashAmount;
        arb.reputation = arb.reputation > 5 ? arb.reputation - 5 : 0;

        if (arb.disputesActive > 0) {
            arb.disputesActive--;
        }

        if (arb.stake < MIN_STAKE) {
            arb.active = false;
            _removeFromList(arbitrator);
            totalArbitrators--;
        }

        emit ArbitratorSlashed(arbitrator, slashAmount, "TIMEOUT");
    }

    /**
     * @notice Slash for corruption (proven bad actor)
     */
    function slashCorruption(address arbitrator, bytes32 evidenceHash)
        external
        onlyDisputeContract
    {
        Arbitrator storage arb = arbitrators[arbitrator];
        if (!arb.active) revert NotRegistered();

        uint256 slashAmount = arb.stake;  // 100% slash
        arb.stake = 0;
        arb.reputation = 0;
        arb.active = false;

        _removeFromList(arbitrator);
        totalArbitrators--;

        emit ArbitratorSlashed(arbitrator, slashAmount, evidenceHash);
    }

    /**
     * @notice Complete dispute without reward (voted against majority)
     */
    function completeDispute(address arbitrator) external onlyDisputeContract {
        Arbitrator storage arb = arbitrators[arbitrator];
        if (arb.disputesActive > 0) {
            arb.disputesActive--;
            arb.disputesHandled++;
        }
    }

    // ============ View Functions ============

    function getArbitrator(address arbitrator) external view returns (Arbitrator memory) {
        return arbitrators[arbitrator];
    }

    function isArbitrator(address arbitrator) external view returns (bool) {
        return arbitrators[arbitrator].active;
    }

    function getActiveArbitrators() external view returns (address[] memory) {
        address[] memory active = new address[](totalArbitrators);
        uint256 count = 0;

        for (uint256 i = 0; i < arbitratorList.length; i++) {
            if (arbitrators[arbitratorList[i]].active) {
                active[count] = arbitratorList[i];
                count++;
            }
        }

        return active;
    }

    function getArbitratorEarnings(address arbitrator) external view returns (uint256) {
        return arbitrators[arbitrator].totalEarnings;
    }

    // ============ Internal Functions ============

    function _removeFromList(address arbitrator) internal {
        uint256 index = arbitratorIndex[arbitrator];
        if (index == 0) return;

        uint256 lastIndex = arbitratorList.length;
        if (index != lastIndex) {
            address lastArbitrator = arbitratorList[lastIndex - 1];
            arbitratorList[index - 1] = lastArbitrator;
            arbitratorIndex[lastArbitrator] = index;
        }

        arbitratorList.pop();
        arbitratorIndex[arbitrator] = 0;
    }
}
