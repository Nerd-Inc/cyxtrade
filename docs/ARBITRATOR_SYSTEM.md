# Arbitrator System Design

> How traders become arbitrators, earn from disputes, and get slashed for corruption.
>
> **Core Principle:** Arbitrators are experienced traders with skin in the game.

---

## Overview

Arbitrators are **not random people** - they're experienced traders who:
1. Have proven track record (50+ trades)
2. Have reputation to lose
3. Stake 500+ USDT as collateral
4. Earn fees for honest voting

**Why traders?** Because they understand the system, have experience with fiat transfers, and have existing reputation at stake.

---

## Becoming an Arbitrator

### Eligibility Requirements

Before you can even apply, you must meet these criteria:

| Requirement | Value | Why |
|-------------|-------|-----|
| **Trader Tier** | Trusted (Tier 3) or higher | Proven track record |
| **Completed Trades** | 50+ | Experience with the system |
| **Dispute Rate** | <2% | Not a problematic trader |
| **Account Age** | 6+ months | Time-tested reliability |
| **Reputation Score** | 200+ | Community trust |
| **Active Disputes** | 0 | No pending issues |
| **Wallet** | Tron wallet | To stake and receive payments |

### The Path: Trader → Arbitrator

```
Observer ─→ Starter ─→ Verified ─→ Trusted ─→ [ELIGIBLE] ─→ Arbitrator
   │           │           │           │            │            │
   │           │           │           │            │            │
   0 trades    10 trades   50 trades   6 months     Apply +      Active
                                       active       stake 500    arbitrator
                                                    USDT
```

### Application Process

1. **Meet Eligibility** - System automatically tracks your progress
2. **Apply in App** - Click "Become Arbitrator" (only visible when eligible)
3. **Stake USDT** - Deposit 500+ USDT to ArbitratorRegistry contract
4. **Verification** - System checks on-chain trader stats
5. **Active** - Start receiving dispute assignments

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ARBITRATOR APPLICATION FLOW                              │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐│
│  │ Check        │    │ Connect      │    │ Approve &    │    │ Application││
│  │ Eligibility  │───►│ Wallet       │───►│ Stake USDT   │───►│ Complete   ││
│  │              │    │              │    │              │    │            ││
│  └──────────────┘    └──────────────┘    └──────────────┘    └────────────┘│
│        │                                        │                          │
│        ▼                                        ▼                          │
│  System checks:                          Contract checks:                  │
│  - 50+ trades                            - 500+ USDT stake                 │
│  - <2% dispute rate                      - Wallet balance                  │
│  - 6+ months active                      - Approval granted                │
│  - 200+ reputation                                                         │
│  - Tier 3+ trader                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Arbitrator Earnings

### How Arbitrators Make Money

| Source | Amount | When |
|--------|--------|------|
| **Dispute Fee Share** | 0.1% of trade value | Per dispute resolved |
| **Correct Vote Bonus** | Split among majority voters | When voting with majority |
| **Reputation Points** | +1 per correct vote | Increases selection chance |

### Earnings Example

```
Dispute: Trade worth 500 USDT

Fee pool: 500 × 0.1% = 0.50 USDT
5 arbitrators assigned
4 vote correctly (majority)
2 arbitrators in majority

Each majority voter earns: 0.50 / 4 = 0.125 USDT

That's small, but consider:
- Selected for ~20 disputes/month (if active pool is small)
- 80% majority rate = 16 paid disputes
- Monthly earnings: ~2 USDT

Plus:
- Reputation builds = more selection = more earnings
- Larger trades = larger fees
- Volume grows = more disputes = more opportunities
```

### Realistic Earnings Projection

| Scenario | Avg Trade | Disputes/Mo | Win Rate | Monthly |
|----------|-----------|-------------|----------|---------|
| **Early MVP** | $500 | 5 | 80% | ~$0.50 |
| **Growing** | $1,000 | 20 | 80% | ~$4 |
| **Mature** | $2,000 | 50 | 85% | ~$21 |
| **High Volume** | $5,000 | 100 | 90% | ~$112 |

**Honest truth:** Early arbitrators earn little money. The real value is:
1. **Protecting the network** - You use this network too
2. **Building reputation** - Higher rep = more selection = more fees later
3. **Community standing** - Respected role in the ecosystem

---

## How Disputes Work for Arbitrators

### Selection

When a dispute opens:

1. **5 arbitrators randomly selected** from eligible pool
2. Selection uses on-chain randomness (trade ID + block hash)
3. You're notified in app: "You've been selected for dispute #xyz"
4. **48 hours** to review evidence and vote

### What You Do

```
STEP 1: Review Evidence (48h window)
├── Both parties submit screenshots, receipts, chat logs
├── Evidence stored on IPFS, linked on-chain
├── You can view all submitted evidence
└── Form your own judgment

STEP 2: Commit Vote (24h window)
├── Decide: FAVOR_USER / FAVOR_TRADER / INCONCLUSIVE
├── Create secret + vote hash
├── Submit hash on-chain
└── Your vote is hidden (commit phase)

STEP 3: Reveal Vote (24h window)
├── Submit your actual vote + secret
├── Contract verifies hash matches
├── Vote becomes public
└── Majority wins

STEP 4: Get Paid (automatic)
├── If you voted with majority: Get fee share + reputation
├── If you voted against majority: No fee, no penalty
├── If you didn't vote: Lose reputation + small slash
```

### Timeline

```
Day 0:        Dispute opened, you're selected
Day 0-2:      Evidence period (review materials)
Day 2-3:      Commit phase (submit encrypted vote)
Day 3-4:      Reveal phase (reveal your vote)
Day 4:        Resolution + payment
```

---

## Arbitrator Incentives

### Why Vote Honestly?

| Incentive | Mechanism |
|-----------|-----------|
| **Stake at risk** | 500+ USDT slashed if corrupt |
| **Reputation gain** | +1 rep for voting with majority |
| **Fee income** | Only majority voters get paid |
| **Future selection** | Higher rep = selected more often |
| **Network protection** | You trade here too |

### Why You Can't Cheat

```
ATTACK: Accept bribes

Problem:
├── Don't know who else is selected (random)
├── Need to bribe 3 of 5 (majority)
├── Each has 500+ USDT at stake
├── Briber would need to offer more than stake
├── Still might not work (honest arbitrators exist)
└── Cost: 1500+ USDT to MAYBE win

ATTACK: Always vote one way

Detection:
├── All votes are public after reveal
├── Voting history is transparent
├── Pattern: "Always votes FAVOR_TRADER" visible
├── Community can challenge
└── Result: Full stake slashed (500+ USDT)

ATTACK: Sybil (create many arbitrator accounts)

Problem:
├── Each needs 500+ USDT stake
├── 100 accounts = 50,000+ USDT at risk
├── Still only ~20% chance of controlling 3 of 5
├── If detected: All stakes slashed
└── Very expensive attack
```

---

## Reputation System

### How Reputation Works

| Action | Points | Notes |
|--------|--------|-------|
| Vote with majority | +1 | Correct vote |
| Vote against majority | 0 | Honest disagreement |
| Don't vote (timeout) | -5 | Unreliable |
| Corruption (proven) | -100 + slash | Removed from system |

### Reputation Benefits

| Rep Level | Benefits |
|-----------|----------|
| 0-100 | Base selection chance |
| 100-300 | 1.5x selection weight |
| 300-500 | 2x selection weight |
| 500+ | 3x selection weight + appeal panel eligible |

Higher reputation = selected more often = more earnings.

### Reputation Decay

To prevent inactive arbitrators from clogging the pool:

- -1 rep per month of no dispute participation
- After 6 months inactive: flagged for review
- After 12 months: auto-removed (stake returned)

---

## Slashing

### When Arbitrators Get Slashed

| Offense | Penalty | Automatic? |
|---------|---------|------------|
| **Timeout** (didn't vote) | -5 rep, 1% stake slash | Yes |
| **Repeated timeout** (3x in 30 days) | Suspended 30 days | Yes |
| **Provable corruption** | 100% stake slash + ban | After review |

### Corruption Detection

How is corruption proven?

```
Evidence required:
├── Bribe messages (screenshots, on-chain transfers)
├── Coordination proof (same votes as colluding group)
├── Pattern analysis (always votes for same trader)
└── Whistleblower reports with evidence

Process:
1. Challenge submitted with evidence
2. 7 meta-arbitrators review (higher tier)
3. 5-of-7 vote required to convict
4. If guilty: Full slash + permanent ban
5. If not guilty: Challenger loses challenge stake
```

### Slash Destination

Slashed funds go to:
- 50% to dispute compensation pool
- 50% to protocol treasury (for future development)

---

## Arbitrator Tiers

As arbitrators gain experience, they unlock additional roles:

| Tier | Requirements | Privileges |
|------|--------------|------------|
| **Arbitrator** | Base requirements | Vote on standard disputes |
| **Senior Arbitrator** | 100+ disputes, 300+ rep | 2x selection weight |
| **Appeal Arbitrator** | 200+ disputes, 500+ rep, 1000 USDT stake | Vote on appeals (7-person panels) |
| **Meta-Arbitrator** | 500+ disputes, 800+ rep, 2000 USDT stake | Vote on corruption challenges |

---

## Smart Contract Interface

### Registration

```solidity
// Check if you're eligible (view function)
function isEligible(address trader) external view returns (bool);

// Get your eligibility status
function getEligibilityStatus(address trader) external view returns (
    bool eligible,
    uint256 trades,
    uint256 reputation,
    uint256 accountAge,
    uint256 disputeRate
);

// Register as arbitrator (requires eligibility + stake)
function register(uint256 stakeAmount) external;

// Add more stake
function addStake(uint256 amount) external;

// Unregister (only if no active disputes)
function unregister() external;
```

### For Disputes

```solidity
// Called by DisputeResolution contract
function selectArbitrators(bytes32 tradeId, uint256 count) external returns (address[] memory);

// Reward arbitrator for correct vote
function reward(address arbitrator, uint256 reputationPoints, uint256 feeShare) external;

// Slash arbitrator for timeout or corruption
function slash(address arbitrator, bytes32 reason) external;
```

---

## FAQ

### "Why can't anyone be an arbitrator?"

Because judging disputes requires:
1. Understanding of fiat transfer processes
2. Experience with common scam patterns
3. Skin in the game (trader reputation)
4. Economic stake (USDT bond)

Random people have no context and nothing to lose.

### "What if I disagree with the majority?"

You're not penalized for honest disagreement. You just don't get paid for that dispute.

If you consistently disagree, either:
- You have different judgment (which is fine)
- The pool is corrupt (file a challenge)

### "What if there aren't enough arbitrators?"

MVP will launch with founding arbitrators (team + early community members).

As the network grows:
- More traders reach Tier 3
- Incentives increase (more disputes = more fees)
- Pool naturally expands

### "Can I be a trader AND an arbitrator?"

Yes! You can:
- Continue trading normally
- Get selected for disputes on trades you're not involved in
- Never arbitrate your own trades (automatically excluded)

### "How much time does it take?"

Per dispute:
- Review evidence: 15-30 minutes
- Submit vote: 2 minutes
- Reveal vote: 2 minutes

Total: ~20-35 minutes per dispute, spread over 4 days.

If selected for 20 disputes/month = ~10 hours/month.

### "What if I'm on vacation?"

You can:
1. **Temporarily deactivate** - No new selections, finish existing disputes
2. **Risk timeout penalty** - Lose some rep if you miss votes
3. **Unregister** - Get stake back (if no active disputes)

---

## Summary

| Principle | Implementation |
|-----------|----------------|
| **Earned access** | Only Tier 3+ traders can apply |
| **Skin in the game** | 500+ USDT stake required |
| **Incentive alignment** | Earnings from honest voting |
| **Accountability** | Slashing for corruption |
| **Transparency** | All votes public after reveal |
| **Progression** | Reputation → more selection → more earnings |

### The Path

```
Trade → Build reputation → Reach Tier 3 → Apply → Stake → Arbitrate → Earn
```

**Bottom line:** Arbitrators are trusted community members who understand the system, have reputation to protect, and earn by keeping the network honest.

---

*Last updated: 2026-02*
