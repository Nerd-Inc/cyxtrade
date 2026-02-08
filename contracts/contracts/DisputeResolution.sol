// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/ICyxTradeEscrow.sol";

/**
 * @title DisputeResolution
 * @notice Handles dispute lifecycle with commit-reveal voting
 * @dev Evidence (48h) -> Commit (24h) -> Reveal (24h) -> Resolution
 */
contract DisputeResolution {
    // ============ Constants ============

    uint256 public constant EVIDENCE_PERIOD = 48 hours;
    uint256 public constant COMMIT_PERIOD = 24 hours;
    uint256 public constant REVEAL_PERIOD = 24 hours;
    uint256 public constant ARBITRATORS_COUNT = 5;
    uint256 public constant REWARD_POINTS = 1;

    // ============ Types ============

    enum DisputeState {
        NONE,           // Not created
        EVIDENCE,       // Evidence submission period
        COMMIT,         // Vote commitment period
        REVEAL,         // Vote reveal period
        RESOLVED        // Final resolution
    }

    enum Vote {
        NONE,           // No vote
        FAVOR_USER,     // User wins
        FAVOR_TRADER    // Trader wins
    }

    struct Dispute {
        bytes32 tradeId;
        address[] arbitrators;
        bytes32[] commitments;      // Hash of (vote + nonce)
        Vote[] revealedVotes;
        bool[] hasCommitted;
        bool[] hasRevealed;
        string userEvidence;        // IPFS hash
        string traderEvidence;      // IPFS hash
        uint256 createdAt;
        uint256 evidenceDeadline;
        uint256 commitDeadline;
        uint256 revealDeadline;
        DisputeState state;
        Vote outcome;
        address compensationAddress; // Where to send slashed bond if user wins
    }

    // ============ State ============

    ICyxTradeEscrow public immutable escrow;
    address public arbitratorRegistry;
    address public backend;

    mapping(bytes32 => Dispute) public disputes;

    // ============ Events ============

    event DisputeCreated(
        bytes32 indexed tradeId,
        address[] arbitrators,
        uint256 evidenceDeadline,
        uint256 commitDeadline,
        uint256 revealDeadline
    );
    event EvidenceSubmitted(bytes32 indexed tradeId, bool isUser, string ipfsHash);
    event VoteCommitted(bytes32 indexed tradeId, address indexed arbitrator);
    event VoteRevealed(bytes32 indexed tradeId, address indexed arbitrator, Vote vote);
    event DisputeResolved(bytes32 indexed tradeId, Vote outcome, uint256 userVotes, uint256 traderVotes);

    // ============ Errors ============

    error OnlyBackend();
    error OnlyArbitrator();
    error DisputeExists();
    error DisputeNotFound();
    error WrongPhase();
    error AlreadySubmitted();
    error InvalidCommitment();
    error NotArbitrator();

    // ============ Modifiers ============

    modifier onlyBackend() {
        if (msg.sender != backend) revert OnlyBackend();
        _;
    }

    modifier disputeExists(bytes32 tradeId) {
        if (disputes[tradeId].state == DisputeState.NONE) revert DisputeNotFound();
        _;
    }

    // ============ Constructor ============

    /**
     * @param _escrow CyxTradeEscrow contract address
     * @param _backend Backend address for evidence submission
     */
    constructor(address _escrow, address _backend) {
        escrow = ICyxTradeEscrow(_escrow);
        backend = _backend;
    }

    /**
     * @notice Set arbitrator registry (called once after deployment)
     * @param _registry ArbitratorRegistry address
     */
    function setArbitratorRegistry(address _registry) external onlyBackend {
        arbitratorRegistry = _registry;
    }

    // ============ Dispute Lifecycle ============

    /**
     * @notice Open a new dispute
     * @param tradeId Trade ID
     * @param compensationAddress Where to send slashed bond if user wins
     * @param selectedArbitrators Pre-selected arbitrators (from registry)
     */
    function openDispute(
        bytes32 tradeId,
        address compensationAddress,
        address[] calldata selectedArbitrators
    ) external onlyBackend {
        if (disputes[tradeId].state != DisputeState.NONE) revert DisputeExists();

        uint256 now_ = block.timestamp;
        uint256 evidenceDeadline = now_ + EVIDENCE_PERIOD;
        uint256 commitDeadline = evidenceDeadline + COMMIT_PERIOD;
        uint256 revealDeadline = commitDeadline + REVEAL_PERIOD;

        Dispute storage d = disputes[tradeId];
        d.tradeId = tradeId;
        d.arbitrators = selectedArbitrators;
        d.commitments = new bytes32[](selectedArbitrators.length);
        d.revealedVotes = new Vote[](selectedArbitrators.length);
        d.hasCommitted = new bool[](selectedArbitrators.length);
        d.hasRevealed = new bool[](selectedArbitrators.length);
        d.createdAt = now_;
        d.evidenceDeadline = evidenceDeadline;
        d.commitDeadline = commitDeadline;
        d.revealDeadline = revealDeadline;
        d.state = DisputeState.EVIDENCE;
        d.compensationAddress = compensationAddress;

        emit DisputeCreated(
            tradeId,
            selectedArbitrators,
            evidenceDeadline,
            commitDeadline,
            revealDeadline
        );
    }

    /**
     * @notice Submit evidence (IPFS hash) for dispute
     * @param tradeId Trade ID
     * @param isUser True if user's evidence, false if trader's
     * @param ipfsHash IPFS hash of evidence
     */
    function submitEvidence(bytes32 tradeId, bool isUser, string calldata ipfsHash)
        external
        onlyBackend
        disputeExists(tradeId)
    {
        Dispute storage d = disputes[tradeId];

        if (d.state != DisputeState.EVIDENCE) revert WrongPhase();
        if (block.timestamp > d.evidenceDeadline) {
            _advancePhase(tradeId);
            revert WrongPhase();
        }

        if (isUser) {
            d.userEvidence = ipfsHash;
        } else {
            d.traderEvidence = ipfsHash;
        }

        emit EvidenceSubmitted(tradeId, isUser, ipfsHash);
    }

    /**
     * @notice Commit a vote (hash of vote + nonce)
     * @param tradeId Trade ID
     * @param commitment keccak256(abi.encodePacked(vote, nonce))
     */
    function commitVote(bytes32 tradeId, bytes32 commitment)
        external
        disputeExists(tradeId)
    {
        Dispute storage d = disputes[tradeId];

        // Auto-advance phase if needed
        _advancePhaseIfNeeded(tradeId);

        if (d.state != DisputeState.COMMIT) revert WrongPhase();

        // Find arbitrator index
        uint256 arbIndex = _findArbitratorIndex(d, msg.sender);
        if (arbIndex == type(uint256).max) revert NotArbitrator();

        if (d.hasCommitted[arbIndex]) revert AlreadySubmitted();

        d.commitments[arbIndex] = commitment;
        d.hasCommitted[arbIndex] = true;

        emit VoteCommitted(tradeId, msg.sender);
    }

    /**
     * @notice Reveal a previously committed vote
     * @param tradeId Trade ID
     * @param vote The actual vote
     * @param nonce The nonce used in commitment
     */
    function revealVote(bytes32 tradeId, Vote vote, bytes32 nonce)
        external
        disputeExists(tradeId)
    {
        Dispute storage d = disputes[tradeId];

        // Auto-advance phase if needed
        _advancePhaseIfNeeded(tradeId);

        if (d.state != DisputeState.REVEAL) revert WrongPhase();

        // Find arbitrator index
        uint256 arbIndex = _findArbitratorIndex(d, msg.sender);
        if (arbIndex == type(uint256).max) revert NotArbitrator();

        if (d.hasRevealed[arbIndex]) revert AlreadySubmitted();

        // Verify commitment
        bytes32 expectedCommitment = keccak256(abi.encodePacked(vote, nonce));
        if (d.commitments[arbIndex] != expectedCommitment) revert InvalidCommitment();

        d.revealedVotes[arbIndex] = vote;
        d.hasRevealed[arbIndex] = true;

        emit VoteRevealed(tradeId, msg.sender, vote);

        // Check if all votes revealed
        _checkResolution(tradeId);
    }

    /**
     * @notice Force resolution after reveal period ends
     * @param tradeId Trade ID
     */
    function finalizeDispute(bytes32 tradeId)
        external
        disputeExists(tradeId)
    {
        Dispute storage d = disputes[tradeId];

        _advancePhaseIfNeeded(tradeId);

        if (d.state != DisputeState.RESOLVED) {
            // Force resolution after reveal deadline
            if (block.timestamp > d.revealDeadline) {
                _resolveDispute(tradeId);
            }
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get dispute details
     * @param tradeId Trade ID
     * @return Dispute struct
     */
    function getDispute(bytes32 tradeId) external view returns (
        bytes32,
        address[] memory,
        DisputeState,
        uint256,
        uint256,
        uint256,
        Vote
    ) {
        Dispute storage d = disputes[tradeId];
        return (
            d.tradeId,
            d.arbitrators,
            d.state,
            d.evidenceDeadline,
            d.commitDeadline,
            d.revealDeadline,
            d.outcome
        );
    }

    /**
     * @notice Get evidence for a dispute
     * @param tradeId Trade ID
     * @return userEvidence IPFS hash
     * @return traderEvidence IPFS hash
     */
    function getEvidence(bytes32 tradeId) external view returns (
        string memory userEvidence,
        string memory traderEvidence
    ) {
        Dispute storage d = disputes[tradeId];
        return (d.userEvidence, d.traderEvidence);
    }

    /**
     * @notice Check current phase of dispute
     * @param tradeId Trade ID
     * @return Current phase
     */
    function getCurrentPhase(bytes32 tradeId) external view returns (DisputeState) {
        Dispute storage d = disputes[tradeId];
        if (d.state == DisputeState.NONE) return DisputeState.NONE;
        if (d.state == DisputeState.RESOLVED) return DisputeState.RESOLVED;

        uint256 now_ = block.timestamp;

        if (now_ <= d.evidenceDeadline) return DisputeState.EVIDENCE;
        if (now_ <= d.commitDeadline) return DisputeState.COMMIT;
        if (now_ <= d.revealDeadline) return DisputeState.REVEAL;

        return DisputeState.RESOLVED;
    }

    // ============ Internal Functions ============

    /**
     * @notice Find arbitrator's index in dispute
     */
    function _findArbitratorIndex(Dispute storage d, address arb) internal view returns (uint256) {
        for (uint256 i = 0; i < d.arbitrators.length; i++) {
            if (d.arbitrators[i] == arb) return i;
        }
        return type(uint256).max;
    }

    /**
     * @notice Advance phase if deadline passed
     */
    function _advancePhaseIfNeeded(bytes32 tradeId) internal {
        Dispute storage d = disputes[tradeId];
        uint256 now_ = block.timestamp;

        if (d.state == DisputeState.EVIDENCE && now_ > d.evidenceDeadline) {
            d.state = DisputeState.COMMIT;
        }
        if (d.state == DisputeState.COMMIT && now_ > d.commitDeadline) {
            d.state = DisputeState.REVEAL;
        }
    }

    /**
     * @notice Force advance phase
     */
    function _advancePhase(bytes32 tradeId) internal {
        Dispute storage d = disputes[tradeId];

        if (d.state == DisputeState.EVIDENCE) {
            d.state = DisputeState.COMMIT;
        } else if (d.state == DisputeState.COMMIT) {
            d.state = DisputeState.REVEAL;
        }
    }

    /**
     * @notice Check if all votes revealed and resolve
     */
    function _checkResolution(bytes32 tradeId) internal {
        Dispute storage d = disputes[tradeId];

        // Count revealed votes
        uint256 revealed = 0;
        for (uint256 i = 0; i < d.arbitrators.length; i++) {
            if (d.hasRevealed[i]) revealed++;
        }

        // If all voted, resolve early
        if (revealed == d.arbitrators.length) {
            _resolveDispute(tradeId);
        }
    }

    /**
     * @notice Execute dispute resolution
     */
    function _resolveDispute(bytes32 tradeId) internal {
        Dispute storage d = disputes[tradeId];

        if (d.state == DisputeState.RESOLVED) return;

        uint256 userVotes = 0;
        uint256 traderVotes = 0;

        for (uint256 i = 0; i < d.arbitrators.length; i++) {
            if (d.hasRevealed[i]) {
                if (d.revealedVotes[i] == Vote.FAVOR_USER) {
                    userVotes++;
                } else if (d.revealedVotes[i] == Vote.FAVOR_TRADER) {
                    traderVotes++;
                }
            }
            // Non-revealed votes don't count (arbitrator may be slashed separately)
        }

        // Determine outcome (majority wins)
        Vote outcome;
        bool favorUser;

        if (userVotes > traderVotes) {
            outcome = Vote.FAVOR_USER;
            favorUser = true;
        } else {
            // Tie or trader wins -> trader keeps bond
            outcome = Vote.FAVOR_TRADER;
            favorUser = false;
        }

        d.outcome = outcome;
        d.state = DisputeState.RESOLVED;

        // Call escrow to execute resolution
        escrow.resolveDispute(tradeId, favorUser, d.compensationAddress);

        emit DisputeResolved(tradeId, outcome, userVotes, traderVotes);
    }
}
