# MVP Security: Simplest Safe Version

> What's the minimum security that still protects users?

---

## The Question

Full security model has:
- MPC 3-of-5 escrow
- Complex reputation math
- Vouching chains
- Automated dispute voting
- Cross-network blacklists

**That's too much for MVP.**

What's the **simplest** version that:
- Actually protects users
- Is buildable quickly
- Can scale to full model later

---

## MVP Security Principles

1. **Simple over perfect** - Working basic security beats complex vaporware
2. **Human fallback** - When automation fails, founders decide
3. **Limit damage** - Low limits = low risk
4. **Trust gradually** - Start tight, loosen over time

---

## MVP Security Stack

### Layer 1: Founder-Held Bonds (Simplified Escrow)

**Instead of 3-of-5 MPC, founders hold bonds directly.**

```
MVP Escrow Model:

User deposits bond:
└─► Funds go to FOUNDER-CONTROLLED wallet
└─► Founder = trusted party for MVP
└─► Simple 2-of-3 multisig (founders)

Why this works for MVP:
- Small network (10-50 users)
- Users know founders personally
- Founders have most to lose (their network)
- Simple to implement
```

**Upgrade path:** As network grows, migrate to MPC 3-of-5

### Layer 2: Low Limits (Damage Control)

```
MVP Limits (conservative):

Bond Required     Trade Limit     Max Single Trade
──────────────────────────────────────────────────
10 USDT           50 USDT         25 USDT
25 USDT           100 USDT        50 USDT
50 USDT           250 USDT        100 USDT
100 USDT          500 USDT        250 USDT

Maximum anyone can trade: 500 USDT
Maximum anyone can lose: 250 USDT
Maximum bond at risk: 100 USDT

At these limits:
- Scam profit is small
- Losses are recoverable
- Founders can manually cover edge cases
```

### Layer 3: Manual Disputes (Founder Decision)

```
MVP Dispute Flow:

1. User raises dispute
2. Both parties submit evidence (screenshots, refs)
3. FOUNDERS review evidence (not voter panel)
4. Founders make decision within 24-48h
5. Founders manually release escrow

No voting system needed for MVP.
Founders are trusted arbiters.
```

### Layer 4: Simple Reputation (Trade Count Only)

```
MVP Reputation:

reputation = completed_trades

That's it. No complex math.

Limits based on trades:
- 0-5 trades: 25 USDT max
- 6-15 trades: 50 USDT max
- 16-30 trades: 100 USDT max
- 31-50 trades: 250 USDT max
- 51+ trades: 500 USDT max (cap)

Combined with bond:
actual_limit = min(bond_limit, trade_count_limit)
```

### Layer 5: Basic Rules (Binance-Style)

```
MVP Rules (keep all of these):

1. Declare payment accounts before first trade
2. Payment must come from declared account
3. No third-party payments
4. 2-hour timeout for fiat payment
5. 2-hour timeout for confirmation
6. Evidence required for disputes

These are cheap to implement and critical for safety.
```

---

## MVP vs Full Security Comparison

| Feature | MVP | Full |
|---------|-----|------|
| Bond custody | Founder multisig (2-of-3) | MPC (3-of-5 nodes) |
| Max trade | 250 USDT | 25,000 USDT |
| Max bond | 100 USDT | 5,000 USDT |
| Disputes | Founder decision | Voter panel |
| Reputation | Trade count only | Complex scoring |
| Vouching | None (invite code) | Full vouch chains |
| Timeouts | Fixed 2 hours | Configurable |
| Evidence | Screenshots | Structured + encrypted |

---

## MVP Security Flow

### User Onboarding

```
1. User gets invite code from founder
2. User joins network
3. User deposits bond (min 10 USDT)
   └─► Goes to founder's multisig wallet
4. User can trade up to bond_limit or 25 USDT (new user cap)
5. After 5 trades, limits increase
```

### Trade Flow (With Security)

```
1. Buyer initiates trade (max 25 USDT for new user)

2. System checks:
   ✓ Buyer has bond deposited
   ✓ Trade within buyer's limit
   ✓ Buyer has declared payment method
   ✓ No other active trades (1 at a time for new users)

3. Seller accepts

4. Escrow:
   └─► Seller's USDT held in founder wallet
   └─► Simple tracking (spreadsheet-level for MVP)

5. Buyer marks fiat sent

6. Seller confirms OR disputes

7. If confirmed:
   └─► Founder releases USDT to buyer
   └─► Both get +1 trade count

8. If disputed:
   └─► Founders review evidence
   └─► Founders decide and release accordingly
   └─► Loser's bond partially forfeited
```

### Dispute Flow (MVP)

```
1. Either party: /trade dispute trd_xyz

2. System:
   "Dispute raised for trade trd_xyz.
    Both parties have 24h to submit evidence.

    Submit evidence:
    /dispute evidence trd_xyz <description>
    /dispute screenshot trd_xyz <image_url>"

3. Founders notified:
   "[DISPUTE] Trade trd_xyz needs review
    Buyer: Ali (5 trades)
    Seller: Mamadou (50 trades)
    Amount: 50 USDT

    Evidence deadline: 24h"

4. After evidence collected:
   Founders review in group chat (Telegram/Signal)
   Founders agree on outcome
   One founder executes decision

5. Founder: /admin resolve trd_xyz favor_buyer
   OR
   Founder: /admin resolve trd_xyz favor_seller

6. System executes:
   - Releases escrow to winner
   - Deducts from loser's bond (if applicable)
   - Updates trade counts
```

---

## MVP Data Structures (Simplified)

```c
// Simplified bond record
typedef struct {
    cyxtrade_pubkey_t  user;
    uint64_t           amount;        // Bond amount in smallest unit
    uint8_t            status;        // ACTIVE, WITHDRAWING, FORFEITED
    uint32_t           deposited_at;
    uint32_t           trade_count;   // Simple reputation
} cyxtrade_bond_simple_t;

// Simplified trade limits
uint64_t get_trade_limit(cyxtrade_bond_simple_t *bond) {
    // Bond limit
    uint64_t bond_limit = bond->amount * 5;  // 5x bond

    // Trade count limit
    uint64_t trade_limit;
    if (bond->trade_count <= 5) trade_limit = 25 * 100;  // 25 USDT
    else if (bond->trade_count <= 15) trade_limit = 50 * 100;
    else if (bond->trade_count <= 30) trade_limit = 100 * 100;
    else if (bond->trade_count <= 50) trade_limit = 250 * 100;
    else trade_limit = 500 * 100;  // Max 500 USDT

    return min(bond_limit, trade_limit);
}

// Simplified escrow (founder-held)
typedef struct {
    cyxtrade_trade_id_t trade_id;
    cyxtrade_pubkey_t   depositor;    // Seller
    cyxtrade_pubkey_t   recipient;    // Buyer
    uint64_t            amount;
    uint8_t             status;       // LOCKED, RELEASED, REFUNDED
    uint32_t            locked_at;
    // No complex MPC, founders hold and release manually
} cyxtrade_escrow_simple_t;
```

---

## MVP Threat Analysis

### Threat 1: New User Scams

```
Attack: New user deposits 10 USDT, tries to scam.

MVP Protection:
- Max trade: 25 USDT (trade count limit for new user)
- Bond: 10 USDT
- Net possible gain: 15 USDT
- But: Founders know everyone (small network)
- But: Easy to track and ban

Risk level: LOW (small amounts, high accountability)
```

### Threat 2: Founder Theft

```
Attack: Founder runs away with all bonds.

MVP Reality:
- Max bonds held: ~5,000 USDT (50 users × 100 USDT)
- Founder's reputation: destroyed forever
- Founder's network: dead
- Likely: Founder is building business, not scam

Mitigation:
- 2-of-3 multisig (need 2 founders to collude)
- Small amounts per user
- Founders known to community

Risk level: MEDIUM (trust-based, but small amounts)
```

### Threat 3: Dispute Gaming

```
Attack: User lies in dispute to steal.

MVP Protection:
- Founders know both parties
- Evidence required (screenshots)
- Pattern visible (same person always disputing)
- Ban after suspicious pattern

Risk level: LOW (founders can judge character)
```

### Threat 4: Third-Party Payment Fraud

```
Attack: User pays with stolen account.

MVP Protection:
- Declared payment sources required
- Seller must verify source matches
- Reject if mismatch
- Same rules as full version

Risk level: LOW (rules prevent this)
```

---

## MVP Implementation Checklist

### Must Have (Security)

- [x] Bond deposit requirement
- [x] Bond-based trade limits
- [x] Trade count limits (simple reputation)
- [x] Payment source declaration
- [x] No third-party payment rule
- [x] 2-hour timeouts
- [x] Evidence submission for disputes
- [ ] Founder dispute resolution
- [ ] Founder-held escrow (2-of-3 multisig)
- [ ] User ban capability

### Nice to Have (Later)

- [ ] MPC escrow
- [ ] Voter-based disputes
- [ ] Complex reputation
- [ ] Vouch chains
- [ ] Automated penalties

---

## Upgrade Path

### Phase 1: MVP (This Document)
- Founder-held bonds
- Manual disputes
- Low limits
- Simple reputation

### Phase 2: Semi-Automated
- Add voter panel for disputes
- Increase limits
- Add reputation factors (not just count)
- Keep founder override

### Phase 3: Full Decentralization
- MPC bond escrow
- Automated dispute resolution
- Vouch chains
- Cross-network features
- High limits

---

## Summary

| Aspect | MVP Approach |
|--------|--------------|
| Bond custody | Founders (2-of-3 multisig) |
| Max exposure | 250 USDT per trade |
| Disputes | Founder decision |
| Reputation | Trade count only |
| Trust model | Small network, everyone knows everyone |

**The MVP is secure because:**
1. Low limits = low damage
2. Founders are trusted arbiters
3. Small network = high accountability
4. Core rules (payment verification) are enforced
5. Can always upgrade security as we grow
