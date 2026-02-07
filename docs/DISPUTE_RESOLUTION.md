# Dispute Resolution Design

> How disputes are resolved in a non-custodial P2P fiat exchange.
>
> **Core Reality:** Custody is non-custodial (code holds funds). Disputes are socially enforced (humans judge fiat). We make cheating expensive, not impossible.

---

## The Core Problem

```
Smart contracts are great at:
├── Holding crypto
├── Enforcing rules
├── Executing automatically
└── Being transparent

Smart contracts CANNOT:
├── See bank transfers
├── Verify mobile money payments
├── Know if fiat was really sent
└── Judge human intent
```

**Someone must attest that fiat was sent/received.** This is the hardest part of any P2P fiat exchange.

### How Other Platforms Solve This

| Platform | Dispute Resolution | Problem |
|----------|-------------------|---------|
| **Binance P2P** | Binance staff decides | Centralized, can be biased |
| **Paxful** | Paxful staff decides | Centralized, can freeze funds |
| **LocalBitcoins** | Staff arbitration | Shut down due to regulation |
| **Bisq** | Bonded arbitrators | Closest to our model |
| **CyxTrade** | Random staked community arbitrators | Decentralized, economically accountable |

---

## Dispute Scenarios

### When Disputes Happen

| Scenario | Who Opens Dispute | Evidence Needed |
|----------|-------------------|-----------------|
| **Fiat not received** | Seller | Bank statement showing no incoming |
| **Wrong amount received** | Seller | Bank statement showing different amount |
| **Buyer claims sent, seller denies** | Either | Payment proof vs bank statement |
| **Payment reversed (chargeback)** | Seller | Reversal notification |
| **Timeout (no response)** | Either | Timestamps showing no activity |
| **Wrong payment method** | Seller | Evidence of different method used |
| **Third-party payment** | Seller | Payment from different name/account |

### Example Dispute

```
Trade: Ali sends 1000 AED to Mamadou for 163,000 XAF

Timeline:
09:00 - Trade created, Mamadou's bond locked (163,000 XAF equivalent)
09:15 - Ali marks "fiat sent" (1000 AED)
09:45 - Mamadou hasn't confirmed receipt
10:00 - Timeout warning sent to Mamadou
11:00 - Mamadou still not responding
11:15 - Ali opens dispute: "Sent payment, no confirmation"

Now what?
```

---

## Dispute Resolution Flow

### Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DISPUTE RESOLUTION FLOW                              │
│                                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│   │ DISPUTE  │    │ EVIDENCE │    │  VOTING  │    │RESOLUTION│            │
│   │ OPENED   │───►│ PERIOD   │───►│  PERIOD  │───►│          │            │
│   │          │    │  (48h)   │    │  (48h)   │    │          │            │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘            │
│        │                                               │                   │
│        │         5 arbitrators                         │                   │
│        └────────►randomly selected                     │                   │
│                                                        │                   │
│                                                        ▼                   │
│                                              ┌──────────────────┐          │
│                                              │ Smart contract   │          │
│                                              │ executes result  │          │
│                                              │ automatically    │          │
│                                              └──────────────────┘          │
│                                                        │                   │
│                                                        ▼                   │
│                                              ┌──────────────────┐          │
│                                              │ Appeal window    │          │
│                                              │ (7 days)         │          │
│                                              └──────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Dispute Opened (On-Chain)

### How to Open a Dispute

```
Either party can open dispute when:
├── Trade is in AWAITING_FIAT state
├── Timeout has passed (2h default)
├── OR other party is unresponsive
└── AND dispute fee paid (refunded if you win)
```

### Smart Contract Call

```solidity
// Ali calls this on the smart contract
function openDispute(bytes32 tradeId, uint8 reasonCode) external {
    Trade storage trade = trades[tradeId];

    require(trade.state == TradeState.AWAITING_FIAT, "Invalid state");
    require(
        msg.sender == trade.traderA || msg.sender == trade.traderB,
        "Not a party"
    );
    require(block.timestamp >= trade.createdAt + DISPUTE_DELAY, "Too early");

    // Lock dispute fee (refunded to winner)
    USDT.transferFrom(msg.sender, address(this), DISPUTE_FEE);

    trade.state = TradeState.DISPUTED;
    trade.disputeOpenedAt = block.timestamp;
    trade.disputeOpenedBy = msg.sender;
    trade.disputeReason = reasonCode;

    // Trigger arbitrator selection
    selectArbitrators(tradeId);

    emit DisputeOpened(tradeId, msg.sender, reasonCode);
}
```

### Dispute Reason Codes

```
REASON_FIAT_NOT_RECEIVED     = 1   // "I sent fiat, they didn't confirm"
REASON_FIAT_NOT_SENT         = 2   // "They claim sent but I didn't receive"
REASON_WRONG_AMOUNT          = 3   // "Received different amount"
REASON_WRONG_ACCOUNT         = 4   // "Sent to wrong account"
REASON_THIRD_PARTY_PAYMENT   = 5   // "Payment from different person"
REASON_TIMEOUT               = 6   // "No response from other party"
REASON_OTHER                 = 99  // "Other (explain in evidence)"
```

---

## Step 2: Arbitrator Selection (Random, On-Chain)

### Selection Algorithm

```solidity
function selectArbitrators(bytes32 tradeId) internal {
    Trade storage trade = trades[tradeId];

    // Create random seed from unpredictable data
    bytes32 seed = keccak256(abi.encodePacked(
        blockhash(block.number - 1),  // Recent block hash (unpredictable)
        tradeId,                       // Unique to this trade
        block.timestamp,               // Current time
        "ARBITRATOR_SELECTION"         // Domain separator
    ));

    address[] memory selected = new address[](5);
    uint256 count = 0;
    uint256 nonce = 0;

    while (count < 5) {
        // Generate candidate from seed
        bytes32 candidateHash = keccak256(abi.encodePacked(seed, nonce));
        address candidate = arbitratorPool[uint256(candidateHash) % arbitratorPool.length];
        nonce++;

        // Check eligibility
        if (isEligible(candidate, trade)) {
            selected[count] = candidate;
            count++;
        }
    }

    disputes[tradeId].arbitrators = selected;
}

function isEligible(address arb, Trade storage trade) internal view returns (bool) {
    Arbitrator storage a = arbitrators[arb];

    // Must be active arbitrator
    if (!a.active) return false;

    // Must have minimum stake
    if (a.stake < MIN_ARBITRATOR_STAKE) return false;

    // Must have minimum reputation
    if (a.reputation < MIN_ARBITRATOR_REP) return false;

    // Cannot be either party
    if (arb == trade.traderA || arb == trade.traderB) return false;

    // Cannot be voucher of either party
    if (isVoucherOf(arb, trade.traderA) || isVoucherOf(arb, trade.traderB)) return false;

    // Cannot have recent trades with either party
    if (hasRecentTrade(arb, trade.traderA) || hasRecentTrade(arb, trade.traderB)) return false;

    return true;
}
```

### Why Random Selection Works

```
ATTACK: Bribe arbitrators in advance

Problem for attacker:
├── Don't know who will be selected
├── Selection uses future block hash (unpredictable)
├── Would need to bribe entire pool (expensive)
└── Each arbitrator has 500+ USDT at stake

ATTACK: Sybil attack (create many arbitrator accounts)

Problem for attacker:
├── Each arbitrator needs 500+ USDT stake
├── 100 fake arbitrators = 50,000+ USDT at risk
├── Still only ~20% chance of controlling 3 of 5
└── If detected, all stakes slashed
```

### Arbitrator Requirements

| Requirement | Value | Rationale |
|-------------|-------|-----------|
| Minimum stake | 500 USDT | Skin in the game |
| Minimum reputation | 200 | Proven track record |
| Minimum trades | 50 | Experience in system |
| Account age | 90 days | Time-based trust |
| Recent disputes lost | <2 | Not a bad actor |

---

## Step 3: Evidence Submission (48 Hours)

### What Can Be Submitted

```
BUYER (Ali) can submit:
├── Bank transfer screenshot
├── Transaction reference number
├── Timestamp of transfer
├── Bank statement showing debit
├── Mobile money confirmation SMS
├── Chat logs from trade
└── Any other relevant proof

SELLER (Mamadou) can submit:
├── Bank statement showing no credit
├── Account balance screenshots
├── Mobile money transaction history
├── Chat logs from trade
├── Explanation of situation
└── Any other relevant proof
```

### Evidence Storage

```
WHY IPFS?

├── Decentralized (no single server)
├── Content-addressed (can't be modified)
├── Permanent (stored by network)
├── Hash recorded on-chain (verifiable)
└── Encrypted for privacy

FLOW:
1. User uploads evidence to IPFS
2. Gets content hash (CID)
3. Submits hash to smart contract
4. Arbitrators fetch from IPFS using hash
5. Decrypt with dispute-specific key
```

### Smart Contract for Evidence

```solidity
function submitEvidence(bytes32 tradeId, bytes32 ipfsHash, bytes32 encryptionKey) external {
    Dispute storage d = disputes[tradeId];
    Trade storage trade = trades[tradeId];

    require(trade.state == TradeState.DISPUTED, "Not disputed");
    require(
        msg.sender == trade.traderA || msg.sender == trade.traderB,
        "Not a party"
    );
    require(
        block.timestamp < d.evidenceDeadline,
        "Evidence period over"
    );

    if (msg.sender == trade.traderA) {
        d.evidenceA.push(Evidence({
            ipfsHash: ipfsHash,
            encryptionKey: encryptionKey,
            timestamp: block.timestamp
        }));
    } else {
        d.evidenceB.push(Evidence({
            ipfsHash: ipfsHash,
            encryptionKey: encryptionKey,
            timestamp: block.timestamp
        }));
    }

    emit EvidenceSubmitted(tradeId, msg.sender, ipfsHash);
}
```

---

## Step 4: Voting Period (48 Hours, Commit-Reveal)

### Why Commit-Reveal?

```
PROBLEM: If votes are visible immediately

├── Arbitrator 1 votes FAVOR_ALI
├── Arbitrator 2 sees this, just copies (lazy)
├── Arbitrator 3 sees majority forming, follows
├── No independent judgment
└── Groupthink wins, not truth

SOLUTION: Two-phase voting

PHASE 1 - COMMIT:
├── Each arbitrator decides independently
├── Creates hash of (vote + secret)
├── Submits hash on-chain
├── No one can see actual votes
└── Prevents copying

PHASE 2 - REVEAL:
├── Each arbitrator reveals vote + secret
├── Contract verifies hash matches
├── Votes become visible
└── Ensures earlier commitment was real
```

### Commit Phase (24 Hours)

```solidity
function commitVote(bytes32 tradeId, bytes32 voteHash) external {
    Dispute storage d = disputes[tradeId];

    require(isArbitratorFor(msg.sender, tradeId), "Not selected arbitrator");
    require(block.timestamp >= d.evidenceDeadline, "Evidence period not over");
    require(block.timestamp < d.commitDeadline, "Commit period over");
    require(d.commits[msg.sender] == bytes32(0), "Already committed");

    d.commits[msg.sender] = voteHash;

    emit VoteCommitted(tradeId, msg.sender);
}

// How arbitrator creates commit hash (off-chain):
// voteHash = keccak256(abi.encodePacked(vote, secret))
// where vote = 1 (FAVOR_A), 2 (FAVOR_B), or 3 (INCONCLUSIVE)
// and secret = random 32 bytes known only to arbitrator
```

### Reveal Phase (24 Hours)

```solidity
function revealVote(bytes32 tradeId, uint8 vote, bytes32 secret) external {
    Dispute storage d = disputes[tradeId];

    require(isArbitratorFor(msg.sender, tradeId), "Not selected arbitrator");
    require(block.timestamp >= d.commitDeadline, "Reveal not started");
    require(block.timestamp < d.revealDeadline, "Reveal period over");
    require(d.votes[msg.sender] == 0, "Already revealed");

    // Verify hash matches commitment
    bytes32 expectedHash = keccak256(abi.encodePacked(vote, secret));
    require(d.commits[msg.sender] == expectedHash, "Hash mismatch");

    // Record vote
    d.votes[msg.sender] = vote;
    d.voteCounts[vote]++;
    d.revealCount++;

    emit VoteRevealed(tradeId, msg.sender, vote);
}
```

### Vote Options

```
FAVOR_A (1):
└── Believe party A (usually buyer)
└── A gets funds from B's bond

FAVOR_B (2):
└── Believe party B (usually seller)
└── B keeps their bond, trade cancelled

INCONCLUSIVE (3):
└── Can't determine who's right
└── Evidence is unclear or contradictory
└── Results in 50/50 split
```

---

## Step 5: Resolution (Automatic, On-Chain)

### Resolution Logic

```solidity
function resolveDispute(bytes32 tradeId) external {
    Dispute storage d = disputes[tradeId];
    Trade storage trade = trades[tradeId];

    require(trade.state == TradeState.DISPUTED, "Not disputed");
    require(block.timestamp >= d.revealDeadline, "Reveal not over");
    require(!d.resolved, "Already resolved");

    uint8 favorA = d.voteCounts[FAVOR_A];
    uint8 favorB = d.voteCounts[FAVOR_B];
    uint8 inconclusive = d.voteCounts[INCONCLUSIVE];

    if (favorA >= 3) {
        // A wins - transfer from B's bond to A
        _slashBond(trade.traderB, trade.traderA, trade.amount);
        trade.state = TradeState.RESOLVED_FAVOR_A;
        d.outcome = FAVOR_A;

        // Refund dispute fee to A (they were right)
        USDT.transfer(d.openedBy, DISPUTE_FEE);

    } else if (favorB >= 3) {
        // B wins - unlock bond, cancel trade
        _unlockBond(trade.traderA, trade.amount);
        trade.state = TradeState.RESOLVED_FAVOR_B;
        d.outcome = FAVOR_B;

        // Refund dispute fee to B if they opened it
        if (d.openedBy == trade.traderB) {
            USDT.transfer(trade.traderB, DISPUTE_FEE);
        }

    } else {
        // Inconclusive - split 50/50
        uint256 half = trade.amount / 2;
        _unlockBond(trade.traderA, half);
        _slashBond(trade.traderA, trade.traderB, half);
        trade.state = TradeState.RESOLVED_SPLIT;
        d.outcome = INCONCLUSIVE;

        // Dispute fee split
        USDT.transfer(trade.traderA, DISPUTE_FEE / 2);
        USDT.transfer(trade.traderB, DISPUTE_FEE / 2);
    }

    d.resolved = true;
    d.resolvedAt = block.timestamp;

    // Update reputations
    _updateReputations(tradeId);

    // Pay arbitrators
    _distributeArbitratorFees(tradeId);

    emit DisputeResolved(tradeId, d.outcome);
}
```

### Reputation Updates

```
WINNER:
├── +5 reputation
└── No penalties

LOSER:
├── -20 reputation
├── If rep drops below 0: banned
└── 3 losses in 30 days: suspended

INCONCLUSIVE:
├── Both parties: -5 reputation
└── Not as bad as losing
```

### Arbitrator Rewards

```solidity
function _distributeArbitratorFees(bytes32 tradeId) internal {
    Dispute storage d = disputes[tradeId];
    Trade storage trade = trades[tradeId];

    // Fee is 0.1% of trade value
    uint256 totalFee = trade.amount * ARBITRATOR_FEE_BPS / 10000;

    // Count majority voters
    uint256 majorityCount = 0;
    for (uint i = 0; i < 5; i++) {
        if (d.votes[d.arbitrators[i]] == d.outcome) {
            majorityCount++;
        }
    }

    // Split fee among majority voters
    uint256 feePerArbitrator = totalFee / majorityCount;

    for (uint i = 0; i < 5; i++) {
        address arb = d.arbitrators[i];

        if (d.votes[arb] == d.outcome) {
            // Voted with majority - reward
            USDT.transfer(arb, feePerArbitrator);
            arbitrators[arb].reputation += 1;

        } else if (d.votes[arb] == 0) {
            // Didn't vote - penalty
            arbitrators[arb].reputation -= 5;
            _slashArbitratorStake(arb, TIMEOUT_SLASH_AMOUNT);

        }
        // Voted against majority - no reward, no penalty
    }
}
```

---

## Arbitrator Incentives

### Why Arbitrators Vote Honestly

| Incentive | Mechanism |
|-----------|-----------|
| **Stake at risk** | 500+ USDT staked, slashed if corrupt |
| **Reputation gain** | +1 rep for voting with majority |
| **Fee income** | 0.1% of trade value split among majority voters |
| **Future selection** | Higher rep = selected more often = more fees |

### Expected Earnings

```
Assume:
├── Average trade size: 500 USDT
├── Disputes: 1% of trades
├── You're selected for 10 disputes/month
├── You vote with majority 80% of time

Monthly earnings:
├── Fee per dispute: 500 * 0.001 / 3 = ~0.17 USDT
├── 10 disputes * 80% majority = 8 * 0.17 = ~1.36 USDT
├── Plus reputation gains for future selection

Not huge money, but:
├── Low effort (review evidence, vote)
├── Helps the community
├── Maintains your standing
└── Protects your own future trades
```

### Why Arbitrators Can't Easily Cheat

```
ATTACK: Bribe an arbitrator

Cost analysis:
├── Need to bribe 3 of 5 arbitrators
├── Don't know who will be selected
├── Each has 500+ USDT at risk
├── Would need to offer more than their stake
├── Total cost: 1500+ USDT to maybe win dispute
└── Not worth it for small trades

ATTACK: Arbitrator always votes one way

Detection:
├── All votes are public after reveal
├── Voting history is transparent
├── Pattern: "Always votes FAVOR_A" is visible
├── Community can challenge suspicious patterns

Consequence:
├── Challenge submitted with evidence
├── Meta-arbitration panel reviews
├── If guilty: Full stake slashed (500+ USDT)
├── Permanent ban from arbitration

ATTACK: Arbitrators collude before selection

Difficulty:
├── Don't know who else will be selected
├── Selection uses unpredictable block hash
├── Would need to control large portion of pool
├── Very expensive Sybil attack required
```

---

## Arbitrator Slashing

### Offense Categories

```
MINOR OFFENSE - Timeout (didn't vote):
├── -5 reputation
├── 1% stake slash (5 USDT from 500)
├── Removed from active pool for 7 days
├── Automatic, no review needed

MAJOR OFFENSE - Provable corruption:
├── Evidence required: bribe messages, coordination proof
├── Anyone can submit challenge
├── Meta-arbitration panel (7 arbitrators) reviews
├── If guilty: 100% stake slashed
├── Permanent ban from arbitration
├── Added to protocol blacklist
```

### Challenge Process

```solidity
function challengeArbitrator(
    address arbitrator,
    bytes32 evidenceHash,
    string calldata reason
) external {
    require(arbitrators[arbitrator].active, "Not an arbitrator");

    // Challenger must stake (to prevent spam)
    USDT.transferFrom(msg.sender, address(this), CHALLENGE_STAKE);

    challenges[arbitrator].push(Challenge({
        challenger: msg.sender,
        evidenceHash: evidenceHash,
        reason: reason,
        timestamp: block.timestamp,
        resolved: false
    }));

    // Select 7 meta-arbitrators
    selectMetaArbitrators(arbitrator);

    emit ArbitratorChallenged(arbitrator, msg.sender, reason);
}
```

---

## Appeal Process

### When Appeals Happen

```
Either party can appeal if:
├── They believe arbitrators were corrupt
├── New evidence emerged after deadline
├── Process was flawed (not enough reveals)
├── Result was INCONCLUSIVE and they want retry
└── Within 7 days of resolution

Appeal cost: 50 USDT (refunded if appeal succeeds)
```

### Appeal Resolution

```
APPEAL PANEL:
├── 7 arbitrators (instead of 5)
├── Higher reputation requirement (300+)
├── Higher stake requirement (1000+ USDT)
├── None from original panel
└── 5-of-7 majority required

POSSIBLE OUTCOMES:

UPHOLD (original decision stands):
├── Appellant loses appeal fee (50 USDT)
├── No changes to original resolution
└── Cannot appeal again

OVERTURN (original decision reversed):
├── Original arbitrators who voted wrong: slashed
├── Appellant refunded appeal fee
├── Bond transfers reversed
├── Reputations adjusted

RETRY (new dispute process):
├── Evidence was unclear
├── Start fresh with new arbitrators
├── Both parties submit new evidence
└── Rare outcome
```

### Appeal Contract

```solidity
function submitAppeal(bytes32 tradeId, bytes32 newEvidenceHash) external {
    Dispute storage d = disputes[tradeId];
    Trade storage trade = trades[tradeId];

    require(d.resolved, "Not resolved yet");
    require(block.timestamp < d.resolvedAt + APPEAL_WINDOW, "Appeal window closed");
    require(
        msg.sender == trade.traderA || msg.sender == trade.traderB,
        "Not a party"
    );
    require(!d.appealed, "Already appealed");

    // Collect appeal fee
    USDT.transferFrom(msg.sender, address(this), APPEAL_FEE);

    d.appealed = true;
    d.appealedBy = msg.sender;
    d.appealEvidenceHash = newEvidenceHash;
    d.appealedAt = block.timestamp;

    // Select 7 meta-arbitrators (higher requirements)
    selectAppealArbitrators(tradeId);

    emit AppealSubmitted(tradeId, msg.sender);
}
```

---

## Complete Timeline Example

```
Day 0
├── 09:00 - Trade created (Ali buys from Mamadou)
├── 09:30 - Ali sends fiat, marks "sent"
├── 11:30 - No confirmation from Mamadou
└── 11:45 - Ali opens dispute (pays 10 USDT fee)

Day 0-2: EVIDENCE PERIOD (48h)
├── 12:00 - 5 arbitrators randomly selected
├── 14:00 - Ali submits: bank transfer screenshot, ref #
├── 18:00 - Mamadou submits: bank statement (no incoming)
└── Day 2, 11:45 - Evidence period ends

Day 2-3: COMMIT PERIOD (24h)
├── Day 2, 12:00 - Commit period starts
├── Day 2, 18:00 - Arbitrator 1 commits hash
├── Day 2, 20:00 - Arbitrator 2 commits hash
├── Day 2, 22:00 - Arbitrator 3 commits hash
├── Day 3, 08:00 - Arbitrator 4 commits hash
├── Day 3, 10:00 - Arbitrator 5 commits hash
└── Day 3, 11:45 - Commit period ends

Day 3-4: REVEAL PERIOD (24h)
├── Day 3, 12:00 - Reveal period starts
├── Day 3, 14:00 - Votes revealed: 4 FAVOR_ALI, 1 FAVOR_MAMADOU
└── Day 4, 11:45 - Reveal period ends

Day 4: RESOLUTION
├── 12:00 - Contract auto-resolves
├── Mamadou's locked bond transferred to Ali
├── Mamadou: -20 reputation
├── Ali: +5 reputation, dispute fee refunded
├── Arbitrators paid 0.1% fee share
└── Dispute closed

Day 4-11: APPEAL WINDOW (7 days)
└── Mamadou can appeal with new evidence

Day 11: FINAL
├── No appeal submitted
└── Resolution is final and permanent
```

---

## Edge Cases

### What if Arbitrator Doesn't Vote?

```
Scenario: Only 3 of 5 arbitrators reveal

Resolution:
├── If 3 votes are unanimous: Proceed with resolution
├── If 3 votes are split: Extend reveal period 24h
├── Non-voting arbitrators: -5 rep, 1% stake slash
├── If still <3 after extension: Select replacements
└── Restart commit-reveal with new arbitrators
```

### What if Evidence is Fake?

```
Arbitrators must judge authenticity:
├── Check timestamps consistency
├── Verify reference number formats
├── Look for image manipulation signs
├── Compare to known bank statement formats
├── Consider overall story consistency

If suspected fake during dispute:
├── Vote accordingly (against faker)

If proven fake after resolution:
├── New evidence submitted in appeal
├── If faker won: Decision reversed
├── Faker: Additional -50 rep, possible ban
└── Original arbitrators: Not penalized (couldn't know)
```

### What if Both Parties are Scamming?

```
Scenario: Fake trade to game reputation or launder

Detection signals:
├── Always same counterparty
├── Trades complete in < 5 minutes
├── Always exact round numbers
├── Never any disputes or issues
├── High volume, low profit

Response:
├── Automatic pattern detection flags accounts
├── Investigation by arbitrator panel
├── If guilty: Both accounts banned
├── Both bonds slashed
├── Added to protocol blacklist
```

### What if Arbitrator Pool is Empty?

```
Scenario: Not enough eligible arbitrators

Fallback:
├── Lower requirements temporarily
├── Increase rewards to attract arbitrators
├── Extend selection timeout
├── Last resort: Use founding arbitrators (less ideal)

Long-term fix:
├── Incentivize more arbitrator registrations
├── Lower barrier to entry with lower stakes
└── Multi-chain arbitrator pools
```

---

## Summary

### Timeline Overview

| Stage | Duration | Who Acts | Can Be Skipped? |
|-------|----------|----------|-----------------|
| Dispute opened | Instant | Either party | No |
| Arbitrator selection | Instant | Smart contract | No |
| Evidence submission | 48 hours | Both parties | Yes (auto-closes) |
| Commit votes | 24 hours | 5 arbitrators | No |
| Reveal votes | 24 hours | 5 arbitrators | No |
| Resolution | Instant | Smart contract | No |
| Appeal window | 7 days | Either party | Yes (optional) |

### Key Principles

| Principle | Implementation |
|-----------|----------------|
| **Non-custodial** | Contract holds funds, executes transfers |
| **Socially enforced** | Humans judge fiat (unavoidable), but they're staked |
| **Random** | Arbitrators selected unpredictably |
| **Accountable** | Arbitrators have stake at risk |
| **Transparent** | All votes public after reveal |
| **Appealable** | Larger panel can review |

### The Honest Truth

```
Is dispute resolution trustless?

NO. And anyone who claims otherwise is lying.

Fiat is off-chain. Smart contracts can't see bank transfers.
Someone must attest. That's unavoidably human.

But we make cheating:
├── Expensive (arbitrators stake 500+ USDT)
├── Unpredictable (random selection)
├── Detectable (all votes are public)
├── Punishable (slashing for corruption)
└── Rare (most trades complete without disputes)

WHAT'S TRUSTLESS:
├── Custody (smart contract holds funds)
├── Execution (contract enforces vote outcome)
└── Withdrawal (no approval needed when clean)

WHAT'S SOCIALLY ENFORCED:
├── Fiat verification (humans attest)
├── Dispute judgment (humans vote)
└── Evidence evaluation (humans decide)

The goal isn't eliminating trust.
The goal is making honesty the economically rational choice.
```

---

*Last updated: 2025-02*
