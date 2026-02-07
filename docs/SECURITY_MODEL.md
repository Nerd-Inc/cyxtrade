# CyxTrade Security Model

> Combining Binance P2P security practices with decentralized enforcement.

---

## Security Philosophy

**We cannot prevent all fraud. We can make fraud economically irrational.**

Three pillars:
1. **Security Bonds** - Skin in the game (money at risk)
2. **Strict Rules** - Binance-style payment verification
3. **Swift Enforcement** - Automatic penalties, bond forfeiture

---

## Pillar 1: Security Bonds

### What Is a Security Bond?

A refundable deposit that:
- Locks funds in network escrow
- Determines your trading limits
- Gets forfeited if you scam
- Compensates victims

### Bond Requirements

| Bond Amount | Trade Limit | Max Single Trade | Concurrent Trades |
|-------------|-------------|------------------|-------------------|
| 0 USDT | Cannot trade | - | - |
| 10 USDT | 100 USDT | 50 USDT | 1 |
| 25 USDT | 250 USDT | 100 USDT | 2 |
| 50 USDT | 500 USDT | 200 USDT | 3 |
| 100 USDT | 1,000 USDT | 500 USDT | 5 |
| 250 USDT | 2,500 USDT | 1,000 USDT | 10 |
| 500 USDT | 5,000 USDT | 2,500 USDT | 15 |
| 1,000 USDT | 10,000 USDT | 5,000 USDT | 20 |
| 2,500 USDT | 25,000 USDT | 10,000 USDT | Unlimited |
| 5,000+ USDT | 50,000 USDT | 25,000 USDT | Unlimited |

### Bond + Reputation Combined Limits

Your actual limit is the **lower** of bond limit and reputation limit:

```
actual_limit = min(bond_limit, reputation_limit)

Examples:

New user:
- Bond: 50 USDT → bond_limit: 500 USDT
- Rep: 1 → rep_limit: 100 USDT
- Actual: 100 USDT

Established user:
- Bond: 100 USDT → bond_limit: 1,000 USDT
- Rep: 150 → rep_limit: 5,000 USDT
- Actual: 1,000 USDT (need more bond)

High-volume trader:
- Bond: 1,000 USDT → bond_limit: 10,000 USDT
- Rep: 500 → rep_limit: 50,000 USDT
- Actual: 10,000 USDT
```

### Bond Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    BOND LIFECYCLE                           │
│                                                             │
│   DEPOSIT                                                   │
│   ├─► User sends USDT to network escrow                    │
│   ├─► Bond locked, trading enabled                         │
│   └─► Minimum lock period: 7 days                          │
│                                                             │
│   ACTIVE                                                    │
│   ├─► Bond remains locked while trading                    │
│   ├─► Can add more bond anytime                            │
│   └─► Cannot reduce bond with active trades                │
│                                                             │
│   WITHDRAWAL                                                │
│   ├─► Must have no active trades                           │
│   ├─► Must have no pending disputes                        │
│   ├─► 7-day withdrawal cooldown                            │
│   └─► Bond returned minus any penalties                    │
│                                                             │
│   FORFEITURE                                                │
│   ├─► User found guilty in dispute                         │
│   ├─► Bond transferred to victim                           │
│   ├─► If bond < damage, partial compensation               │
│   └─► User banned from network                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Partial Forfeiture

If trade amount > bond:

```
Scenario:
- Scammer has 100 USDT bond
- Scammer steals 500 USDT trade
- Victim receives 100 USDT (full bond)
- Victim still loses 400 USDT

This is why limits exist:
- 100 USDT bond = max 500 USDT trade
- But combined with reputation limits
- New scammer (low rep) can only do 100 USDT trade
- So bond covers 100% of possible damage
```

### Bond Escrow (3-of-5 Network Nodes)

Bonds are held by network, not individuals:

```
┌─────────────────────────────────────────────────────────────┐
│                    BOND ESCROW                              │
│                                                             │
│   User deposits 100 USDT bond                               │
│                                                             │
│   100 USDT split via MPC:                                   │
│   ├─► Node 1: [share 1]                                    │
│   ├─► Node 2: [share 2]                                    │
│   ├─► Node 3: [share 3]                                    │
│   ├─► Node 4: [share 4]                                    │
│   └─► Node 5: [share 5]                                    │
│                                                             │
│   To release (return or forfeit):                           │
│   └─► 3 of 5 nodes must sign                               │
│                                                             │
│   No single node can steal bonds                            │
│   Collusion requires 3 nodes = harder                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Pillar 2: Binance-Style Payment Rules

### Rule 1: Declared Payment Source

**Before trading, you must declare your payment accounts.**

```
User profile setup:

"Add your payment methods:"

1. Bank Transfer
   - Bank name: [First Bank Cameroon]
   - Account number: [XXXX-XXXX-XXXX]
   - Account holder: [Your registered name]

2. Mobile Money
   - Provider: [Orange Money]
   - Phone number: [+237 6XX XXX XXX]
   - Registered name: [Your registered name]

"These details will be shared with counterparties.
 You may ONLY send/receive from these accounts."
```

### Rule 2: No Third-Party Payments

**Payment MUST come from YOUR declared account.**

```
During trade initiation:

┌─────────────────────────────────────────────────────────────┐
│  ⚠️  IMPORTANT: PAYMENT VERIFICATION                        │
│                                                             │
│  You are buying from: Mamadou                               │
│                                                             │
│  You MUST pay from your declared account:                   │
│  • Orange Money: +237 6XX XXX XXX (Ali)                    │
│                                                             │
│  Mamadou will ONLY accept payment from this number.         │
│                                                             │
│  ❌ DO NOT:                                                  │
│  • Pay from a friend's account                              │
│  • Pay from a different number                              │
│  • Ask someone else to pay for you                          │
│                                                             │
│  Third-party payments will be:                              │
│  • Rejected by seller                                       │
│  • Subject to dispute                                       │
│  • Result in reputation penalty and possible bond loss      │
│                                                             │
│  [ ] I confirm I will pay from my declared account          │
│                                                             │
│  [Proceed to Trade]                                         │
└─────────────────────────────────────────────────────────────┘
```

### Rule 3: Payment Verification for Sellers

**Sellers must verify payment source before confirming.**

```
When buyer marks payment sent:

┌─────────────────────────────────────────────────────────────┐
│  💰 PAYMENT RECEIVED - VERIFY BEFORE CONFIRMING             │
│                                                             │
│  Buyer: Ali                                                 │
│  Expected amount: 66,000 XAF                                │
│  Expected source: +237 6XX XXX XXX                         │
│                                                             │
│  BEFORE confirming, verify:                                 │
│                                                             │
│  ✓ Correct amount received?                                 │
│  ✓ Payment came from +237 6XX XXX XXX?                     │
│  ✓ Sender name matches "Ali"?                              │
│                                                             │
│  If payment came from DIFFERENT source:                     │
│  → DO NOT CONFIRM                                           │
│  → Raise dispute: "Third-party payment"                     │
│                                                             │
│  [Confirm Payment ✓]  [Raise Dispute ⚠️]                    │
└─────────────────────────────────────────────────────────────┘
```

### Rule 4: Time Limits

Strict timeouts prevent stalling tactics:

| Phase | Timeout | If Timeout |
|-------|---------|------------|
| Accept trade | 15 min | Trade cancelled, no penalty |
| Deposit escrow | 30 min | Trade cancelled, seller -1 rep |
| Send fiat | 2 hours | Escrow refunded, buyer -5 rep |
| Confirm receipt | 2 hours | Auto-dispute raised |
| Submit evidence | 24 hours | Decide with available evidence |
| Voting | 48 hours | Non-voters penalized |

### Rule 5: Evidence Requirements

**Every dispute requires specific evidence:**

```
Buyer claiming "I paid":
REQUIRED:
- Screenshot of outgoing payment
- Transaction reference number
- Timestamp of payment
- Amount shown

Seller claiming "No payment received":
REQUIRED:
- Screenshot of account/wallet
- Transaction history for relevant period
- Account balance before/after claim time

Third-party payment dispute:
REQUIRED:
- Screenshot showing sender details
- Expected sender vs actual sender
- Buyer's declared payment source
```

---

## Pillar 3: Enforcement

### Automatic Penalties

Some violations trigger immediate, automatic penalties:

| Violation | Automatic Penalty |
|-----------|------------------|
| Trade timeout (your fault) | -1 to -5 rep (based on phase) |
| 3 cancelled trades in 24h | 24h trading suspension |
| Dispute raised against you | Trading suspended until resolved |
| Lost dispute | -20 rep + bond forfeiture (if applicable) |
| Third-party payment (confirmed) | -10 rep + trade reversed |
| Multiple accounts detected | All accounts banned, all bonds forfeited |

### Dispute Resolution Tiers

```
┌─────────────────────────────────────────────────────────────┐
│               DISPUTE RESOLUTION TIERS                      │
│                                                             │
│   TIER 1: Auto-Resolution (immediate)                       │
│   ├─► Clear timeout violation                              │
│   ├─► Buyer never marked fiat sent                         │
│   └─► Resolution: Escrow refunded to seller                │
│                                                             │
│   TIER 2: Evidence-Based (24-48h)                          │
│   ├─► Buyer claims paid, seller claims not received        │
│   ├─► Third-party payment claim                            │
│   ├─► Wrong amount claim                                   │
│   └─► Resolution: Voter panel reviews evidence             │
│                                                             │
│   TIER 3: Founder Review (48-72h)                          │
│   ├─► Voter panel deadlocked                               │
│   ├─► Complex fraud case                                   │
│   ├─► Appeal of Tier 2 decision                            │
│   └─► Resolution: Founders make binding decision           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Voter Selection for Disputes

```
Eligible voters:
- Reputation > 200
- No active dispute themselves
- Not involved in this trade
- Not voucher of either party
- Has been active in last 30 days

Selection:
- 5 voters selected randomly (weighted by reputation)
- Higher rep = higher chance of selection
- Voters notified via secure message

Incentives:
- Vote with majority: +1 rep
- Vote against majority: 0 rep
- Don't vote: -2 rep
- Biased voting pattern detected: -10 rep, voter privileges revoked
```

### Bond Forfeiture Process

```
When user loses dispute:

1. Dispute outcome: GUILTY
2. Calculate damages:
   - Trade amount victim lost
   - Any fees victim paid

3. Forfeiture amount = min(damages, bond)

4. Execute forfeiture:
   - 3-of-5 escrow nodes sign release
   - Bond transferred to victim
   - Guilty user's account suspended

5. If damages > bond:
   - Victim receives full bond
   - Remaining loss unrecoverable
   - This is why limits exist

6. User can appeal within 7 days
   - Must provide new evidence
   - Founders review
   - If appeal succeeds: bond returned, rep restored
   - If appeal fails: permanent ban
```

---

## Security Scenarios

### Scenario 1: New User Scam Attempt

```
Scammer joins network:
1. Deposits minimum 10 USDT bond
2. Bond limit: 100 USDT, Rep limit: 100 USDT
3. Can only trade 50 USDT max per trade

Scammer initiates trade:
4. Buys 50 USDT from honest seller
5. Marks "fiat sent" but never sends
6. Hopes seller releases escrow anyway

Outcome:
7. Seller doesn't confirm (because no payment received)
8. 2-hour timeout triggers auto-dispute
9. Seller shows no payment in account
10. Scammer cannot show valid payment proof
11. Dispute: SELLER WINS
12. Escrow returned to seller
13. Scammer loses 10 USDT bond (goes to seller as penalty)
14. Scammer banned

Net result:
- Scammer lost 10 USDT
- Seller lost nothing
- Network protected by bond system
```

### Scenario 2: Third-Party Payment Fraud

```
Scammer buys USDT:
1. Initiates trade to buy 200 USDT
2. Instead of paying themselves, uses stolen credit card
3. Payment arrives at seller's account from unknown source

Seller verifies:
4. Payment received but from "John Smith" not "Ali"
5. Seller raises dispute: "Third-party payment"

Resolution:
6. Evidence shows sender name doesn't match buyer's declared account
7. Dispute: BUYER GUILTY
8. Escrow returned to seller
9. Buyer's bond forfeited
10. Buyer banned

Why this matters:
- If buyer used stolen funds, the original owner will chargeback
- Seller would lose the money
- By rejecting third-party payments, seller is protected
```

### Scenario 3: Dispute Gaming (False Claims)

```
Dishonest seller:
1. Receives legitimate payment from buyer
2. Claims "payment not received" to keep both fiat and crypto

Resolution:
3. Buyer submits payment proof (screenshot, reference)
4. Voters see payment clearly sent to seller's declared account
5. Voters see timestamp matches
6. Dispute: SELLER GUILTY
7. Escrow released to buyer
8. Seller's bond forfeited to buyer as penalty
9. Seller banned

Protection:
- Buyer keeps screenshot of payment
- Transaction reference is recorded
- Seller's lie is exposed by evidence
```

### Scenario 4: Long-Con Attempt

```
Sophisticated scammer:
1. Deposits 100 USDT bond
2. Completes 50 small trades (builds reputation)
3. Rep now: 150, can trade up to 1000 USDT
4. Initiates large trade (1000 USDT)
5. Receives payment, never releases crypto

Protection layers:
- Bond: 100 USDT (covers 10% of loss)
- Reputation: destroyed (150 → 0)
- Account: banned
- Cross-network blacklist: added

Victim recovery:
- Receives 100 USDT bond
- Loses 900 USDT (this is the vulnerability)

Mitigation:
- Higher bond requirements for higher limits
- Require 500 USDT bond for 1000 USDT trades
- Or cap single trade at 2x bond
```

---

## Bond Economics

### Making Scams Unprofitable

For scamming to be irrational:

```
Expected value of scam < Expected value of honest trading

Scam EV = trade_amount - bond - future_earnings
Honest EV = spread_profit * future_trades

Example (long-term trader):
- 1000 trades per year
- 0.5% average spread
- 500 USDT average trade
- Honest EV = 1000 * 500 * 0.005 = 2,500 USDT/year

One-time scam:
- Max trade: 1000 USDT
- Bond lost: 100 USDT
- Net gain: 900 USDT
- But loses: 2,500+ USDT/year future earnings

For serious traders, honesty pays more than scamming.
```

### Bond as Barrier to Entry

```
Minimum bond (10 USDT) creates:
- Sybil attack cost: 10 USDT per fake account
- 100 fake accounts = 1000 USDT (meaningful cost)
- Each fake can only do 100 USDT damage max
- ROI of Sybil attack: negative
```

### Recommended Bond Ratios

```
Conservative (low risk tolerance):
- Bond = 50% of max trade
- 100 USDT bond → 200 USDT max trade

Moderate (balanced):
- Bond = 20% of max trade
- 100 USDT bond → 500 USDT max trade

Aggressive (higher risk, higher growth):
- Bond = 10% of max trade
- 100 USDT bond → 1000 USDT max trade

Network founders choose ratio based on community trust level.
```

---

## Implementation Checklist

### MVP Security Features

- [ ] Bond deposit/withdrawal
- [ ] Bond-based trade limits
- [ ] Payment source declaration
- [ ] Third-party payment warnings
- [ ] Evidence submission for disputes
- [ ] Automatic timeout penalties
- [ ] Basic dispute voting

### Post-MVP Security Features

- [ ] 3-of-5 MPC bond escrow
- [ ] Reputation-weighted voter selection
- [ ] Cross-network blacklist
- [ ] Advanced fraud pattern detection
- [ ] Appeal process
- [ ] Founder override capabilities

---

## Summary

| Layer | Mechanism | What It Prevents |
|-------|-----------|------------------|
| **Bond** | Money at risk | Scam-and-run, Sybil attacks |
| **Limits** | Bond + rep based caps | Large-scale fraud |
| **Payment rules** | Declared sources, no third-party | Stolen funds, chargebacks |
| **Timeouts** | Strict deadlines | Stalling, hostage-taking |
| **Evidence** | Required proof | False claims, he-said-she-said |
| **Voting** | Peer review | Biased decisions |
| **Forfeiture** | Bond to victim | Unpunished fraud |

The goal: **Make the cost of cheating higher than the reward.**
