// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ArbitratorRegistry
 * @notice Manages arbitrator registration, staking, and selection for disputes
 * @dev Arbitrators stake 500+ USDT. Random selection per dispute. Slashed if corrupt.
 */
contract ArbitratorRegistry is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    uint256 public constant MIN_STAKE = 500 * 1e6;  // 500 USDT (6 decimals for TRC20)
    uint256 public constant ARBITRATORS_PER_DISPUTE = 5;
    uint256 public constant SLASH_PERCENTAGE = 50;   // 50% slash for corruption

    // ============ Types ============

    struct Arbitrator {
        uint256 stake;              // Staked USDT
        uint256 reputation;         // Earned from correct votes
        uint256 disputesHandled;    // Total disputes participated
        uint256 disputesActive;     // Current active disputes
        bool active;                // Currently registered
    }

    // ============ State ============

    IERC20 public immutable usdt;
    address public disputeContract;

    mapping(address => Arbitrator) public arbitrators;
    address[] public arbitratorList;
    mapping(address => uint256) public arbitratorIndex;  // 1-indexed for existence check

    uint256 public totalArbitrators;

    // ============ Events ============

    event ArbitratorRegistered(address indexed arbitrator, uint256 stake);
    event ArbitratorUnregistered(address indexed arbitrator, uint256 stakeReturned);
    event ArbitratorSlashed(address indexed arbitrator, uint256 amount, bytes32 reason);
    event ArbitratorRewarded(address indexed arbitrator, uint256 reputation);
    event DisputeContractSet(address indexed disputeContract);

    // ============ Errors ============

    error InsufficientStake();
    error NotRegistered();
    error AlreadyRegistered();
    error HasActiveDisputes();
    error OnlyDisputeContract();
    error NotEnoughArbitrators();
    error ZeroAddress();

    // ============ Modifiers ============

    modifier onlyDisputeContract() {
        if (msg.sender != disputeContract) revert OnlyDisputeContract();
        _;
    }

    // ============ Constructor ============

    /**
     * @param _usdt USDT token address
     */
    constructor(address _usdt) {
        usdt = IERC20(_usdt);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the dispute resolution contract address
     * @param _disputeContract Address of DisputeResolution contract
     */
    function setDisputeContract(address _disputeContract) external {
        // Only allow setting once (or by dispute contract itself for upgrades)
        if (disputeContract != address(0) && msg.sender != disputeContract) {
            revert OnlyDisputeContract();
        }
        if (_disputeContract == address(0)) revert ZeroAddress();

        disputeContract = _disputeContract;
        emit DisputeContractSet(_disputeContract);
    }

    // ============ Arbitrator Functions ============

    /**
     * @notice Register as an arbitrator by staking USDT
     * @param stakeAmount Amount of USDT to stake (must be >= 500)
     */
    function register(uint256 stakeAmount) external nonReentrant {
        if (arbitrators[msg.sender].active) revert AlreadyRegistered();
        if (stakeAmount < MIN_STAKE) revert InsufficientStake();

        usdt.safeTransferFrom(msg.sender, address(this), stakeAmount);

        arbitrators[msg.sender] = Arbitrator({
            stake: stakeAmount,
            reputation: 0,
            disputesHandled: 0,
            disputesActive: 0,
            active: true
        });

        // Add to list
        arbitratorList.push(msg.sender);
        arbitratorIndex[msg.sender] = arbitratorList.length;  // 1-indexed
        totalArbitrators++;

        emit ArbitratorRegistered(msg.sender, stakeAmount);
    }

    /**
     * @notice Add more stake to existing registration
     * @param amount Additional stake amount
     */
    function addStake(uint256 amount) external nonReentrant {
        if (!arbitrators[msg.sender].active) revert NotRegistered();

        usdt.safeTransferFrom(msg.sender, address(this), amount);
        arbitrators[msg.sender].stake += amount;
    }

    /**
     * @notice Unregister and withdraw stake
     */
    function unregister() external nonReentrant {
        Arbitrator storage arb = arbitrators[msg.sender];

        if (!arb.active) revert NotRegistered();
        if (arb.disputesActive > 0) revert HasActiveDisputes();

        uint256 stake = arb.stake;
        arb.active = false;
        arb.stake = 0;

        // Remove from list
        _removeFromList(msg.sender);
        totalArbitrators--;

        usdt.safeTransfer(msg.sender, stake);

        emit ArbitratorUnregistered(msg.sender, stake);
    }

    // ============ Dispute Contract Functions ============

    /**
     * @notice Select random arbitrators for a dispute
     * @param tradeId Trade ID (used as entropy source)
     * @param count Number of arbitrators to select
     * @return selected Array of selected arbitrator addresses
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

        // Use trade ID + block info for randomness
        // Note: This is pseudo-random. For production, consider Chainlink VRF
        uint256 seed = uint256(keccak256(abi.encodePacked(
            tradeId,
            blockhash(block.number - 1),
            block.timestamp
        )));

        // Select unique arbitrators
        while (selectedCount < count) {
            uint256 randomIndex = seed % arbitratorList.length;
            address candidate = arbitratorList[randomIndex];

            // Check if already selected
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

            // Update seed for next iteration
            seed = uint256(keccak256(abi.encodePacked(seed, selectedCount)));
        }

        return selected;
    }

    /**
     * @notice Slash an arbitrator's stake for corruption
     * @param arbitrator Address of arbitrator to slash
     * @param reason Reason hash for the slash
     */
    function slash(address arbitrator, bytes32 reason)
        external
        onlyDisputeContract
    {
        Arbitrator storage arb = arbitrators[arbitrator];
        if (!arb.active) revert NotRegistered();

        uint256 slashAmount = (arb.stake * SLASH_PERCENTAGE) / 100;
        arb.stake -= slashAmount;

        // If stake falls below minimum, deactivate
        if (arb.stake < MIN_STAKE) {
            arb.active = false;
            _removeFromList(arbitrator);
            totalArbitrators--;
        }

        // Slashed funds go to contract (could be redistributed)
        emit ArbitratorSlashed(arbitrator, slashAmount, reason);
    }

    /**
     * @notice Reward an arbitrator with reputation
     * @param arbitrator Address of arbitrator to reward
     * @param reputationPoints Points to add
     */
    function reward(address arbitrator, uint256 reputationPoints)
        external
        onlyDisputeContract
    {
        Arbitrator storage arb = arbitrators[arbitrator];
        if (!arb.active) revert NotRegistered();

        arb.reputation += reputationPoints;
        arb.disputesHandled++;
        if (arb.disputesActive > 0) {
            arb.disputesActive--;
        }

        emit ArbitratorRewarded(arbitrator, reputationPoints);
    }

    /**
     * @notice Decrement active dispute count
     * @param arbitrator Address of arbitrator
     */
    function completeDispute(address arbitrator) external onlyDisputeContract {
        if (arbitrators[arbitrator].disputesActive > 0) {
            arbitrators[arbitrator].disputesActive--;
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get arbitrator details
     * @param arbitrator Address
     * @return Arbitrator struct
     */
    function getArbitrator(address arbitrator) external view returns (Arbitrator memory) {
        return arbitrators[arbitrator];
    }

    /**
     * @notice Check if address is an active arbitrator
     * @param arbitrator Address to check
     * @return isActive True if registered and active
     */
    function isArbitrator(address arbitrator) external view returns (bool) {
        return arbitrators[arbitrator].active;
    }

    /**
     * @notice Get all active arbitrators
     * @return Active arbitrator addresses
     */
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

    // ============ Internal Functions ============

    /**
     * @notice Remove arbitrator from list
     * @param arbitrator Address to remove
     */
    function _removeFromList(address arbitrator) internal {
        uint256 index = arbitratorIndex[arbitrator];
        if (index == 0) return;  // Not in list

        uint256 lastIndex = arbitratorList.length;
        if (index != lastIndex) {
            // Move last element to the removed position
            address lastArbitrator = arbitratorList[lastIndex - 1];
            arbitratorList[index - 1] = lastArbitrator;
            arbitratorIndex[lastArbitrator] = index;
        }

        arbitratorList.pop();
        arbitratorIndex[arbitrator] = 0;
    }
}
