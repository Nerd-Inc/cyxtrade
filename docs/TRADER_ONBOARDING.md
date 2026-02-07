# Trader Onboarding Design

> How users become traders, verification requirements, and abuse prevention.
>
> **Core Principle:** Bonds are held by smart contracts, not the CyxTrade team.

---

## Overview

CyxTrade separates **users** (senders/receivers) from **traders** (liquidity providers).

Traders are the backbone of the system. They:
- Deposit bonds to smart contracts (not to CyxTrade)
- Provide liquidity for trades
- Take on counterparty risk
- Earn spreads on exchanges

**Key difference from centralized P2P:** No one can steal your bond. Not the team, not admins. Only the smart contract controls release.

---

## Core Mechanics

### Bond = Trading Capacity

```
Trader deposits bond -> Can trade up to bond amount
Bond locked during trade -> Available capacity reduced
Trade completes -> Capacity restored
```

**Example:**
```
Mamadou deposits: 1,000,000 XAF

State 1: No active trades
├── Available: 1,000,000 XAF
└── Can accept any trade up to 1,000,000 XAF

State 2: Alice trade for 500,000 XAF (in progress)
├── Locked: 500,000 XAF
├── Available: 500,000 XAF
└── Can accept new trade up to 500,000 XAF

State 3: Alice trade completes successfully
├── Locked: 0 XAF
├── Available: 1,000,000 XAF
└── Reputation increased
```

### Trade Gating

Traders can only accept new trades when:
1. Available capacity >= trade amount
2. No unresolved disputes
3. Reputation above minimum threshold
4. Not in cool-down period (Tier 1 only)

---

## Trader Tiers

### Tier 0: Observer

**Purpose:** Let users explore before committing.

| Attribute | Value |
|-----------|-------|
| Requirements | Phone verification |
| Bond | $0 |
| Can trade | NO |
| Can do | Browse offers, view rates, learn UI |

**Rationale:** Reduces friction to entry. Users can see the system works before depositing money.

---

### Tier 1: Starter

**Purpose:** New traders with training wheels.

| Attribute | Value |
|-----------|-------|
| Requirements | Phone + 1 vouch from Tier 2+ trader |
| Bond range | $100 - $500 |
| Max per trade | $500 |
| Monthly limit | $2,000 |
| Cool-down | 24 hours between trades |

**Verification:**
- Phone number (SMS OTP)
- Vouch from existing trusted trader

**Rationale:**
- Low barrier to entry for genuine traders
- Cool-down prevents rapid cycling (structuring)
- Monthly limit caps total exposure
- Vouch requirement means bad actors need to compromise existing network

---

### Tier 2: Verified

**Purpose:** Established traders with track record.

| Attribute | Value |
|-----------|-------|
| Requirements | Tier 1 + 10 successful trades + video selfie |
| Bond range | $500 - $2,000 |
| Max per trade | $2,000 |
| Monthly limit | $10,000 |
| Cool-down | None |

**Verification:**
- All Tier 1 requirements
- 10 completed trades with no disputes
- Video selfie (stored locally by network admin, not centralized)

**Video selfie purpose:**
- Proof of humanity (not identity)
- Creates accountability (network admin can identify if needed)
- NOT uploaded to any central server
- NOT shared outside the network

---

### Tier 3: Trusted

**Purpose:** High-volume, reliable traders.

| Attribute | Value |
|-----------|-------|
| Requirements | Tier 2 + 50 trades + 3 vouches + 6 months active |
| Bond range | $2,000 - $10,000 |
| Max per trade | $10,000 |
| Monthly limit | $50,000 |
| Cool-down | None |

**Verification:**
- All Tier 2 requirements
- 50 completed trades, <2% dispute rate
- 3 vouches from other Tier 2+ traders
- 6 months of active trading history

---

### Tier 4: Anchor

**Purpose:** Network pillars, dispute voters, high liquidity.

| Attribute | Value |
|-----------|-------|
| Requirements | Tier 3 + founding member OR exceptional track record |
| Bond range | $10,000+ |
| Max per trade | Bond amount |
| Monthly limit | 5x bond |
| Special powers | Vouch for Tier 1, vote on disputes |

**Verification:**
- All Tier 3 requirements
- Founding member of the network, OR
- 200+ trades, 0% dispute rate, 12+ months active

---

## Tier Progression

```
Observer -> Starter -> Verified -> Trusted -> Anchor
   │           │           │           │          │
   │           │           │           │          └── 200 trades or founder
   │           │           │           └── 50 trades + 6 months
   │           │           └── 10 trades + video
   │           └── 1 vouch
   └── Phone only
```

### Time Gates

| Transition | Minimum Time |
|------------|--------------|
| Observer -> Starter | Immediate (once vouched) |
| Starter -> Verified | ~2 weeks (with 10 trades) |
| Verified -> Trusted | 6 months |
| Trusted -> Anchor | 12 months |

**Rationale:** Bad actors can't fast-track to high limits. Genuine traders build reputation naturally.

---

## Bond Management (Smart Contract)

### Depositing

```
1. Connect wallet (MetaMask, TronLink, etc.)
2. Approve USDT spending for escrow contract
3. Call depositBond(amount)
4. Contract records your bond
5. You can now trade up to bond amount
```

Bond is held by **smart contract only**:
- No human keys
- No admin access
- No "network admin" or "protocol team" custody
- Immutable contract logic

### Withdrawing

Traders can withdraw bond when:
1. No active trades (locked amount = 0)
2. No pending disputes
3. Call withdrawBond(amount) - **instant**, no approval needed

```
// On-chain transaction
escrowContract.withdrawBond(1000 USDT)

// Contract checks:
// - Your locked amount is 0
// - No pending disputes
// - Transfers USDT back to your wallet

// No human approval required. Contract executes immediately.
```

### Slashing

Bond is slashed automatically by smart contract for:
- Lost dispute (arbitrators voted against you)
- Abandonment (no response for 72h during active trade)

Slashed amount goes to:
- Victim's wallet (automatically)
- Arbitrators (small fee share)

---

## Verification Without KYC

### What We Collect

| Data | Purpose | Storage |
|------|---------|---------|
| Phone number | Prevent multi-accounting, contact | Hashed on device |
| Vouch signatures | Reputation chain | On-chain |
| Video selfie | Proof of humanity | Local (network admin only) |
| Trade history | Reputation | On-chain (pseudonymous) |

### What We DON'T Collect

- Legal name
- Government ID
- Address
- Bank account details (users handle fiat directly)
- Biometrics (video is visual only, not processed)

### Why This Works

| KYC Problem | Our Solution |
|-------------|--------------|
| Privacy invasion | Pseudonymous identities |
| Excludes unbanked | Phone-only entry |
| Central database risk | Decentralized storage |
| Regulatory burden | No custodial relationship |

---

## Risk Detection

### Automated Pattern Flags

The system monitors for suspicious patterns without knowing identity:

| Pattern | Description | Response |
|---------|-------------|----------|
| **Velocity** | >5 trades/day to same recipient | Flag for review |
| **Structuring** | Multiple trades just under tier limits | Flag for review |
| **New surge** | Tier 1 maxing limits on day 1 | Extend cool-down |
| **One-way flow** | Only sending OR only receiving | Warn after 10 trades |
| **Network hop** | Funds through 3+ traders in 24h | Flag for review |
| **Burst activity** | Dormant account suddenly active | Flag for review |

### Review Process

1. **Automated flag** - System detects pattern
2. **Temporary hold** - 24-48h pause on new trades
3. **Network admin review** - Human looks at pattern
4. **Trader explanation** - Opportunity to explain (legitimate burst for holiday remittances, etc.)
5. **Resolution** - Clear / warn / escalate

### NOT Automatic Bans

Flags trigger review, not punishment. False positives happen:
- Holiday seasons have burst activity
- New business relationships cause velocity spikes
- Family emergencies need rapid transfers

Human judgment is required.

---

## Anti-Abuse Design

### Why CyxTrade is Unattractive to Bad Actors

| Threat | Why It's Hard on CyxTrade |
|--------|---------------------------|
| **Money laundering** | Volume limits make it impractical. Moving $1M needs 200 trades at Tier 3 over months. |
| **Terrorism financing** | Time gates (6+ months to high limits), vouch chains, bond loss risk. |
| **Sybil attacks** | Each identity needs phone + vouch + bond. Expensive at scale. |
| **Fraud rings** | Voucher reputation damaged if vouched trader scams. Self-policing. |
| **Structuring** | Pattern detection catches split transactions. |

### Volume Limits as Defense

Target user: Migrant worker sending $300-500/month.

```
Legitimate use case:
├── $500/month = $6,000/year
├── Tier 1 sufficient for most users
└── Tier 2 for frequent senders

Money laundering attempt:
├── Need to move $100,000
├── At Tier 3 max ($50k/month): 2 months minimum
├── Requires 50+ clean trades first
├── 6 months to reach Tier 3
├── Bond at risk ($10k)
└── Conclusion: Use a bank instead (easier, faster)
```

### Community Policing

Networks self-govern:
- Unusual activity discussed in network chat
- Members vote to remove suspicious traders
- Vouchers lose reputation if vouched traders misbehave
- "See something, say something" culture

### Corridor Awareness

Some corridors are higher risk. Networks can:
- Set additional verification for specific routes
- Lower limits for new corridors
- Require anchor vouches for sensitive routes

This is network-level policy, not protocol-level.

---

## Trader Onboarding Flow

### Step 1: Create Account

```
1. Download app
2. Generate keypair (local)
3. Enter phone number
4. Receive SMS OTP
5. Verify OTP
6. Account created (Tier 0 - Observer)
```

### Step 2: Request Vouch

```
1. Find existing Tier 2+ trader (friend, community, forum)
2. Share public key with them
3. They submit VOUCH transaction
4. System notifies you
5. You're now eligible for Tier 1
```

### Step 3: Deposit Bond (Smart Contract)

```
1. Choose bond amount ($100-500 for Tier 1)
2. Connect wallet (MetaMask, TronLink, etc.)
3. Approve USDT spending for escrow contract
4. Call depositBond(amount) on contract
5. Transaction confirmed on-chain
6. Bond active, Tier 1 unlocked

Your bond is now in the smart contract.
No human can access it. Only you can withdraw (when not trading).
```

### Step 4: Start Trading

```
1. Create offer (have AED, want XAF, rate, amount)
2. Wait for taker
3. Execute trade
4. Build reputation
5. Progress through tiers
```

---

## Edge Cases

### What if voucher goes bad?

If a voucher is later found to be malicious:
- Vouched traders are NOT automatically penalized
- But they're flagged for enhanced review
- May need additional vouch from different chain

### What if phone number changes?

- Request phone number update
- Requires existing phone verification + 48h waiting period
- Network admin can expedite if needed

### What if trader wants to leave?

```
EXIT_NETWORK {
  pubkey,
  reason,           // Optional
  timestamp,
  signature
}
```

- 24h notice period
- All pending trades must complete or cancel
- Bond returned after notice period
- Reputation preserved (can rejoin later)

### What if CyxTrade team disappears?

This is fine. Your funds are safe because:
- Smart contract has no admin keys
- You can withdraw directly from contract
- You can trade by interacting with contract
- Only convenience features (notifications, matching) are affected
- Another team could build a new frontend to the same contracts

---

## Summary

| Principle | Implementation |
|-----------|----------------|
| **No custody** | Bonds held by smart contract, not team |
| **Privacy first** | No legal identity required |
| **Gradual trust** | Tiers gate access to higher limits |
| **Economic security** | Bonds create skin in the game |
| **Social accountability** | Vouch chains link reputations |
| **Pattern detection** | Automated flags, community review |
| **Volume limits** | Makes abuse impractical, not impossible |

### Why Trust This System?

| Question | Answer |
|----------|--------|
| Can CyxTrade steal my bond? | NO - Team has no access |
| Can arbitrators steal? | NO - They can only vote |
| What if I'm wrongly slashed? | Appeal to larger panel |
| What if team disappears? | Contracts keep working |

CyxTrade is designed for small, regular remittances. The economics make it unsuitable for large-scale abuse while remaining accessible to the unbanked.

---

*Last updated: 2025-02*
