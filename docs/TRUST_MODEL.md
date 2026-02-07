# CyxTrade Trust Model: Non-Custodial Digital Hawala

> Reputation, vouching, and community arbitration - with custody secured by code, disputes resolved by staked humans.

---

## Core Philosophy

### The Trust Problem

Traditional P2P platforms say: "Trust us to hold your money and resolve disputes."

CyxTrade says: "Don't trust us. We have no access to your money. Community arbitrators resolve disputes."

### From Hawala (Adapted for Non-Custodial Operation)

| Hawala Principle | CyxTrade Implementation |
|------------------|------------------------|
| Trust is earned, not given | Must be vouched to join |
| Reputation is currency | Reputation score gates trading limits |
| Betrayal is expensive | Bond slashed via smart contract |
| Community enforcement | **Staked arbitrators**, not founders |
| Long-term relationships | Trade history on-chain, transparent |

### Key Insight

Hawala doesn't prevent fraud through technology. It makes fraud **economically irrational**.

CyxTrade adds: **No human can steal your funds.** Smart contracts enforce everything.

---

## Network Structure

### Pure Protocol Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      NETWORK                                │
│                                                             │
│   ┌─────────────┐                                          │
│   │ ARBITRATORS │  Staked community members                │
│   │  Stake:500+ │  Randomly selected for disputes          │
│   │             │  NO special access to funds              │
│   └─────────────┘                                          │
│                                                             │
│   ┌─────────────┐                                          │
│   │   ANCHORS   │  High-reputation traders                 │
│   │  Rep: 500+  │  Can vouch others (limited)              │
│   │  Bond: 10k+ │  Eligible to become arbitrators          │
│   └──────┬──────┘                                          │
│          │ vouches                                          │
│          ▼                                                  │
│   ┌─────────────┐                                          │
│   │   TRADERS   │  Vouched by anchor or senior trader      │
│   │  Rep: 100+  │  Can vouch others (limited)              │
│   │             │  Can stake to become arbitrator          │
│   └──────┬──────┘                                          │
│          │ vouches                                          │
│          ▼                                                  │
│   ┌─────────────┐                                          │
│   │   MEMBERS   │  Vouched by trader                       │
│   │  Rep: 1-99  │  Cannot vouch others yet                 │
│   │             │  Can trade with limits                    │
│   └─────────────┘                                          │
│                                                             │
│   NOTE: NO ONE has custody of funds. Smart contract only.  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Roles (Pure Protocol)

| Role | Min Reputation | Can Vouch | Trade Limit | Arbitration |
|------|----------------|-----------|-------------|-------------|
| **Arbitrator** | 200+ | Yes | Unlimited | Eligible |
| **Anchor** | 500+ | 5 active | Unlimited | Eligible |
| **Trader** | 100-499 | 2 active | 10,000 USDT/trade | Can stake to join |
| **Member** | 10-99 | 0 | 1,000 USDT/trade | No |
| **New Member** | 1-9 | 0 | 100 USDT/trade | No |

**Key difference from old model:** No "founders" with special powers. All custody is via smart contract.

---

## Vouching System

### Vouch Requirements

To vouch for someone, you must:
1. Have reputation ≥ 100 (Trader level)
2. Have available vouch slots
3. Not be under dispute yourself
4. Have completed ≥ 10 trades

### Vouch Process

```
┌─────────────────────────────────────────────────────────────┐
│                    VOUCHING FLOW                            │
│                                                             │
│   1. New user requests to join network                      │
│      └─► Provides: public key, optional intro message       │
│                                                             │
│   2. Existing member decides to vouch                       │
│      └─► Voucher signs vouch message with their key         │
│      └─► Vouch includes: new user pubkey, timestamp, stake  │
│                                                             │
│   3. Network records vouch chain                            │
│      └─► New user linked to voucher                         │
│      └─► Voucher's vouch slot consumed                      │
│                                                             │
│   4. New user active with starting reputation               │
│      └─► Starting rep = 1                                   │
│      └─► Inherits voucher's trust (for trade matching)      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Vouch Stake

When you vouch for someone, you stake reputation:

```
vouch_stake = your_reputation * 0.1

Example:
- Your reputation: 200
- You vouch for Alice
- Your stake: 20 rep points
- If Alice scams: you lose 20 rep
```

### Vouch Chain

Every user has a traceable vouch chain back to a founder:

```
Founder (OG)
    └─► vouched Mamadou (stake: 100)
            └─► vouched Ali (stake: 20)
                    └─► vouched Marie (stake: 5)

If Marie scams:
- Marie: expelled, rep = 0
- Ali: loses 5 rep (his stake on Marie)
- Mamadou: loses 2 rep (10% of Ali's loss, cascading)
- Founder: loses 0.2 rep (10% cascade)
```

### Vouch Withdrawal

You can withdraw a vouch (un-vouch) under conditions:
- Vouched user has completed < 5 trades
- No active trades in progress
- No pending disputes involving them
- 7-day cooldown period

After withdrawal:
- Your vouch slot is freed
- Vouched user has 30 days to find new voucher
- If no new voucher: account suspended (can't trade, funds safe)

---

## Reputation System

### Reputation Score

```
reputation = base_score + trade_score + vouch_score + time_score - penalties

Where:
- base_score: Starting reputation (1 for new members)
- trade_score: Points from completed trades
- vouch_score: Bonus from high-rep voucher
- time_score: Longevity bonus
- penalties: Deductions from disputes, vouched user scams
```

### Trade Score Calculation

```python
def calculate_trade_score(trade):
    base_points = 1

    # Volume bonus (logarithmic, caps at 5x)
    volume_multiplier = min(5, 1 + log10(trade.volume_usdt / 100))

    # Partner reputation bonus
    partner_bonus = 0.1 if trade.partner_rep > 100 else 0

    # Speed bonus (completed within 30 min)
    speed_bonus = 0.2 if trade.duration_minutes < 30 else 0

    return base_points * volume_multiplier + partner_bonus + speed_bonus

Example trades:
- 100 USDT trade, slow: 1.0 points
- 1000 USDT trade, fast, high-rep partner: 2.0 + 0.1 + 0.2 = 2.3 points
- 10000 USDT trade, fast: 3.0 + 0.2 = 3.2 points
```

### Vouch Score

```python
def calculate_vouch_bonus(voucher_reputation):
    # Higher rep voucher = better starting position
    # But capped to prevent gaming
    return min(10, voucher_reputation * 0.02)

Examples:
- Vouched by rep 100 trader: +2 bonus
- Vouched by rep 500 senior: +10 bonus (capped)
- Vouched by rep 1000 founder: +10 bonus (capped)
```

### Time Score (Longevity)

```python
def calculate_time_bonus(account_age_days, trades_completed):
    if trades_completed < 10:
        return 0  # Must be active to earn time bonus

    # 1 point per month, max 12
    monthly_bonus = min(12, account_age_days / 30)

    return monthly_bonus
```

### Penalties

| Offense | Penalty |
|---------|---------|
| Trade cancelled by you | -0.5 |
| Trade timeout (you didn't respond) | -1 |
| Dispute raised against you | -5 (pending) |
| Dispute lost | -20 |
| Vouched user scams | -vouch_stake |
| Vouched user loses dispute | -vouch_stake * 0.5 |
| Expelled from network | rep = 0 (permanent) |

### Reputation Decay

Inactive accounts decay slowly:

```python
def apply_decay(reputation, days_since_last_trade):
    if days_since_last_trade < 30:
        return reputation  # No decay

    # 1% decay per week after 30 days, minimum 10
    weeks_inactive = (days_since_last_trade - 30) / 7
    decay_factor = 0.99 ** weeks_inactive

    return max(10, reputation * decay_factor)
```

---

## Trading Limits

### Limit Tiers

| Reputation | Single Trade Limit | Daily Limit | Concurrent Trades |
|------------|-------------------|-------------|-------------------|
| 1-9 | 100 USDT | 200 USDT | 1 |
| 10-49 | 500 USDT | 1,000 USDT | 2 |
| 50-99 | 1,000 USDT | 3,000 USDT | 3 |
| 100-249 | 5,000 USDT | 15,000 USDT | 5 |
| 250-499 | 10,000 USDT | 50,000 USDT | 10 |
| 500+ | 50,000 USDT | 200,000 USDT | 20 |
| 1000+ (Founder) | Unlimited | Unlimited | Unlimited |

### Limit Increase Path

New user journey:

```
Day 1: Join, rep = 1
       Can trade: 100 USDT max

Week 1: Complete 5 small trades
        Rep: ~6
        Can trade: 100 USDT max

Week 2-4: Complete 15 more trades
          Rep: ~25
          Can trade: 500 USDT max

Month 2-3: Active trading, 50+ trades
           Rep: ~80
           Can trade: 1,000 USDT max

Month 4+: Consistent good behavior
          Rep: 100+
          Can trade: 5,000 USDT max
          Can vouch others
```

---

## Dispute Resolution (Socially Enforced)

> For complete dispute resolution details, see [DISPUTE_RESOLUTION.md](DISPUTE_RESOLUTION.md)

### The Fiat Verification Problem

Smart contracts can't verify fiat transfers. Someone must attest.

**Solution:** Community arbitrators with stake. They lose money if corrupt.

### Dispute Triggers

A dispute can be raised when:
1. Fiat payment not received within timeout (2 hours default)
2. Wrong amount received
3. Payment to wrong account
4. Buyer claims payment made, seller denies

### Dispute Process (On-Chain)

```
┌─────────────────────────────────────────────────────────────┐
│                    DISPUTE FLOW                             │
│                                                             │
│   1. Party raises dispute (on-chain transaction)            │
│      └─► Smart contract locks trade                         │
│      └─► Both parties notified                              │
│      └─► 48h evidence period begins                         │
│                                                             │
│   2. Arbitrator selection (random, on-chain)                │
│      └─► 5 arbitrators selected using block hash            │
│      └─► Must have 500+ USDT staked                         │
│      └─► Cannot be voucher of either party                  │
│      └─► Selection is verifiable, not gameable              │
│                                                             │
│   3. Evidence submission (48h)                              │
│      └─► Screenshots, transaction IDs, chat logs            │
│      └─► Stored on IPFS, hash recorded on-chain             │
│      └─► Visible to arbitrators only                        │
│                                                             │
│   4. Voting period (48h, commit-reveal)                     │
│      └─► Arbitrators review evidence                        │
│      └─► Submit encrypted vote (commit)                     │
│      └─► Reveal votes after period ends                     │
│      └─► Prevents copying others' votes                     │
│                                                             │
│   5. Resolution (automatic, on-chain)                       │
│      └─► Smart contract counts votes                        │
│      └─► Majority wins (3 of 5)                             │
│      └─► Winner: Gets trade amount from loser's bond        │
│      └─► Loser: Bond slashed automatically                  │
│      └─► Arbitrators: Get 0.1% fee share                    │
│      └─► If INCONCLUSIVE: Split 50/50, small fee to both    │
│                                                             │
│   NOTE: No human can override. Contract executes result.    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Arbitrator Incentives

| Outcome | Consequence |
|---------|-------------|
| Voted with majority | +1 reputation, +0.1% fee share |
| Voted against majority | 0 reputation change |
| Didn't vote (timeout) | -5 reputation, small slash |
| Provably corrupt | Full stake slashed (500+ USDT) |

### Corruption Prevention

```
Why arbitrators can't easily cheat:

1. RANDOM SELECTION
   └── Can't know who will be selected before dispute

2. STAKE AT RISK
   └── Each arbitrator has 500+ USDT staked
   └── Corrupt = lose it all

3. COMMIT-REVEAL VOTING
   └── Can't see others' votes until after submission
   └── Can't coordinate easily

4. PATTERN DETECTION
   └── Always voting for same party = flagged
   └── Community can challenge suspicious patterns

5. APPEAL PROCESS
   └── Disputed decisions go to larger panel (7-of-11)
   └── Corrupt arbitrators slashed
```

### Dispute Limits

- Max 2 open disputes per user at a time
- 3 lost disputes in 30 days = automatic trading suspension
- 5 lost disputes lifetime = permanent ban (contract-enforced)

---

## Expulsion (Contract-Enforced)

### Automatic Expulsion

Triggered automatically by smart contract when:
- Reputation drops below 0 (calculated on-chain)
- 3 lost disputes in 30 days
- Bond fully slashed

No human decision required. Contract enforces.

### Community-Initiated Ban

Any member can propose ban with:
- Evidence of wrongdoing (hash on-chain)
- Support from 3 other members (rep > 100)

Ban vote:
- All traders (rep > 100) can vote
- 72h voting period
- 2/3 majority required
- **No founder veto** (pure protocol)

### Ban Consequences

```
When user is banned:

1. Address added to contract blacklist
2. Cannot create new trades
3. Active trades: Counterparty can claim after timeout
4. Voucher loses stake (contract-enforced)
5. Cannot rejoin with same address
6. Reputation data remains public (for other networks)
```

### Appeal Process

Banned users can appeal once:
- Submit appeal (on-chain transaction)
- 7 arbitrators randomly selected
- Review evidence
- 5-of-7 vote required to reinstate
- If reinstated: starts fresh, rep = 1, small bond only
- If denied: permanent, no further appeals

---

## Sybil Resistance

### The Sybil Problem

Without identity verification, one person could create many accounts to:
- Self-vouch through chain of fake accounts
- Fake reputation through self-trades
- Outvote legitimate users

### Countermeasures

**1. Vouch Cost**
```
Each vouch costs reputation stake
Creating 10 fake accounts = massive rep investment
One scam = all connected accounts penalized
```

**2. Trade Velocity Limits**
```
New accounts limited to 1 trade/day for first week
Prevents rapid self-trading to build fake rep
```

**3. Vouch Graph Analysis**
```
Network monitors vouch patterns:
- Circular vouching detected and flagged
- Isolated clusters (only trade with each other) flagged
- Low diversity (same partners always) flagged
```

**4. Trade Pattern Analysis**
```
Suspicious patterns:
- Always exact round numbers
- Always same counterparty
- Trades complete in < 1 minute
- Never any disputes or issues
```

**5. Proof of Humanity (Optional)**
```
Networks can require:
- Video call with founder before first vouch
- Existing member physically met new user
- Social media account link (Twitter, etc.)
```

---

## Protocol Governance

### Protocol Parameters

Set at contract deployment (immutable):

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Arbitrator stake | 500 USDT | High enough to deter corruption |
| Dispute timeout | 48h | Enough time for evidence |
| Trade timeout | 2h | Standard for fiat transfers |
| Arbitrators per dispute | 5 | Odd number, majority wins |
| Appeal panel size | 7 | Larger for appeals |
| Ban threshold | 2/3 | Supermajority required |

### What CAN'T Change

These are immutable (no admin keys):
- Contract logic
- Fee structure
- Custody rules

### What Networks CAN Customize

Each trading network (off-chain coordination) can agree on:
- Entry requirements (more verification)
- Minimum bond for membership
- Supported corridors
- Local arbitrator pools

But these are **social agreements**, not protocol-enforced.

---

## Example Scenarios

### Scenario 1: Normal Trade

```
Ali (rep: 150) wants to buy 500 USDT from Mamadou (rep: 400)

1. Ali posts buy order: 500 USDT for 1850 AED
2. Mamadou accepts
3. Mamadou's 500 USDT → escrow
4. Ali sends 1850 AED to Mamadou's bank
5. Mamadou confirms receipt (within 2h)
6. Escrow releases 500 USDT to Ali
7. Both get +1.5 rep (volume bonus)

Total time: 25 minutes
Dispute: None
```

### Scenario 2: New User First Trade

```
Marie (rep: 1, new) wants to buy 50 USDT from Ali (rep: 150)

1. Marie posts buy order: 50 USDT for 33,000 XAF
2. Ali sees Marie is new (rep: 1)
3. Ali checks Marie's voucher: Mamadou (rep: 400) ✓
4. Ali accepts (trusts Mamadou's judgment)
5. Trade completes normally
6. Marie: +1 rep (now rep: 2)
7. Ali: +1 rep

Marie needs ~10 successful trades to reach rep 10
Then limit increases to 500 USDT
```

### Scenario 3: Dispute - Buyer Wins

```
Ali claims he paid Mamadou, Mamadou says no payment received

1. Ali raises dispute, provides:
   - Bank transfer screenshot
   - Transaction reference number
   - Timestamp

2. Mamadou provides:
   - Bank statement showing no incoming transfer

3. 5 voters selected (rep > 200, not vouched by Ali or Mamadou)

4. Voters investigate:
   - Ali's screenshot looks legitimate
   - Transaction ref matches bank format
   - Mamadou's statement is from wrong date

5. Vote: 4-1 favor Ali

6. Resolution:
   - Escrow released to Ali
   - Mamadou: -20 rep
   - Mamadou's voucher: -4 rep (10% of 40 stake)
```

### Scenario 4: Scammer Expelled

```
New user "Bob" vouched by Ali, completes 5 small trades
Bob's rep: 6
Bob attempts 100 USDT trade, receives USDT, claims fiat sent, disappears

1. Seller raises dispute
2. Bob provides no evidence
3. Vote: 5-0 favor seller
4. Bob expelled:
   - Rep: 0
   - Pubkey blacklisted
   - Ali loses 15 rep (vouch stake)
   - Ali's voucher loses 1.5 rep (cascade)

5. Seller gets escrow back (Bob never held the USDT)

Network learns: Bob's pubkey shared to other networks
Ali learns: Be more careful who you vouch for
```

---

## Appendix: Reputation Math Summary

```python
# Constants
VOUCH_STAKE_PERCENT = 0.10
CASCADE_PENALTY_PERCENT = 0.10
MAX_CASCADE_DEPTH = 2
BASE_TRADE_POINTS = 1.0
DISPUTE_LOSS_PENALTY = 20
DECAY_START_DAYS = 30
DECAY_RATE_PER_WEEK = 0.01

# Reputation calculation
def calculate_reputation(user):
    base = 1  # Everyone starts at 1

    # Trade score
    trade_score = sum(calculate_trade_score(t) for t in user.completed_trades)

    # Vouch bonus
    vouch_bonus = min(10, user.voucher.reputation * 0.02)

    # Time bonus
    if user.completed_trades >= 10:
        time_bonus = min(12, user.account_age_days / 30)
    else:
        time_bonus = 0

    # Penalties
    penalties = sum(user.penalties)

    # Decay
    raw_rep = base + trade_score + vouch_bonus + time_bonus - penalties
    final_rep = apply_decay(raw_rep, user.days_since_last_trade)

    return max(0, final_rep)
```

---

## Summary: What's Trustless, What's Not

| Aspect | Model | Explanation |
|--------|-------|-------------|
| **Custody** | Non-custodial | Smart contract holds funds, no human access |
| **Fund theft** | Code-enforced | Team can't steal - we have no keys |
| **Disputes** | Socially enforced | Humans must judge fiat - arbitrators are staked, not trustless |
| **Arbitrator honesty** | Economically incentivized | They lose money if corrupt, but it's still humans |

| Question | Honest Answer |
|----------|---------------|
| Who holds the money? | Smart contract (no humans) |
| Who resolves disputes? | Staked arbitrators (humans) |
| Can the team steal? | No - we have no access |
| Are disputes trustless? | **No** - humans judge fiat, but they're economically accountable |
| What if arbitrators collude? | They lose their stake. Appeal to larger panel. |

### The Honest Truth

No system is perfect. CyxTrade is designed so that:

1. **Custody is non-custodial** - Team has no access to funds
2. **Disputes are socially enforced** - Humans judge fiat, but they're staked
3. **Everything is transparent** - On-chain, auditable
4. **Cheating is expensive** - Arbitrators lose stake if corrupt

**What we DON'T claim:** Fully trustless dispute resolution. Fiat can't be verified on-chain. Someone must judge.

**What we DO provide:** Economic incentives that make honesty the rational choice.

---

## Next Steps

1. Deploy escrow smart contract (Tron, Ethereum, Polygon)
2. Deploy arbitrator registry contract
3. Implement commit-reveal voting
4. Build reputation system (on-chain or hybrid)
5. Audit contracts
6. Launch with conservative limits

---

*Last updated: 2025-02*
