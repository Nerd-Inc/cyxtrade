# CyxTrade Platform Model

> Two user types, no crypto required, trader bonds as escrow.

---

## Overview

CyxTrade is a **two-sided marketplace** connecting:

1. **Users** - People who want to send/receive money
2. **Traders** - Professionals who facilitate currency exchange

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         USERS                           TRADERS             │
│   (Senders/Receivers)              (Market Makers)          │
│                                                             │
│   ┌─────┐ ┌─────┐ ┌─────┐       ┌─────┐ ┌─────┐           │
│   │ Ali │ │Marie│ │Yusuf│       │Mamad│ │Bouba│           │
│   └──┬──┘ └──┬──┘ └──┬──┘       └──┬──┘ └──┬──┘           │
│      │       │       │             │       │               │
│      └───────┴───────┴─────────────┴───────┘               │
│                      │                                      │
│                      ▼                                      │
│              ┌─────────────┐                                │
│              │  CYXTRADE   │                                │
│              │  PLATFORM   │                                │
│              └─────────────┘                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## User Type 1: Users (Senders/Receivers)

### Who They Are

Regular people who need to move money across borders.

| Attribute | Description |
|-----------|-------------|
| **Examples** | Ali (Dubai worker), Marie (receiving family) |
| **Goal** | Send money to family, pay someone abroad |
| **Frequency** | Occasional (weekly, monthly) |
| **Technical skill** | Basic smartphone user |
| **Money** | Has fiat, doesn't want/need crypto |

### Requirements

| Requirement | Details |
|-------------|---------|
| Bond | **None** |
| Verification | Phone number + SMS |
| Approval | Automatic (instant) |
| Limits | Based on trader's available bond |

### What Users Can Do

```
ACTIONS:
├── Browse available traders
├── See trader ratings, rates, bond status
├── Initiate a transfer
├── Send fiat to trader's account
├── Confirm delivery at destination
├── Rate traders
├── Open disputes if problems
└── View their transfer history
```

### User Registration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  USER REGISTRATION                          │
│                                                             │
│   Step 1: Download app                                      │
│           └── Available on iOS, Android, Web               │
│                                                             │
│   Step 2: Enter phone number                                │
│           └── +971 50 XXX XXXX                             │
│                                                             │
│   Step 3: Verify via SMS                                    │
│           └── Enter 6-digit code                           │
│                                                             │
│   Step 4: Create profile                                    │
│           └── Name (display name, not legal)               │
│           └── Photo (optional)                             │
│                                                             │
│   Step 5: Done!                                             │
│           └── Can immediately browse and send              │
│                                                             │
│   Time: ~2 minutes                                          │
│   Cost: Free                                                │
│   Approval: Automatic                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### User Interface (Send Money)

```
┌─────────────────────────────────────────────────────────────┐
│  ← SEND MONEY                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  From                           To                          │
│  ┌─────────────┐               ┌─────────────┐             │
│  │ 🇦🇪 UAE     │      →       │ 🇨🇲 Cameroon │             │
│  │    AED      │               │    XAF      │             │
│  └─────────────┘               └─────────────┘             │
│                                                             │
│  You send                                                   │
│  ┌─────────────────────────────────────────────┐           │
│  │                                         AED │           │
│  │                                   300       │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  Recipient gets: ~48,900 XAF                               │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  AVAILABLE TRADERS                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⭐ 4.9  Mamadou                                      │   │
│  │ 1,234 trades · Bonded $1,000                        │   │
│  │                                                     │   │
│  │ Rate: 1 AED = 163 XAF                              │   │
│  │ Recipient gets: 48,900 XAF                         │   │
│  │ Delivery: ~30 minutes                              │   │
│  │                                                     │   │
│  │                              [Select Trader]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⭐ 4.7  Fatou                                        │   │
│  │ 567 trades · Bonded $500                            │   │
│  │                                                     │   │
│  │ Rate: 1 AED = 161 XAF                              │   │
│  │ Recipient gets: 48,300 XAF                         │   │
│  │ Delivery: ~1 hour                                  │   │
│  │                                                     │   │
│  │                              [Select Trader]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## User Type 2: Traders (Market Makers)

### Who They Are

Professional or semi-professional forex dealers who facilitate currency exchange.

| Attribute | Description |
|-----------|-------------|
| **Examples** | Mamadou (Dubai-based), Boubacar (Cameroon-based) |
| **Goal** | Earn money from spread, grow forex business |
| **Frequency** | Daily, high volume |
| **Technical skill** | Comfortable with apps, banking |
| **Money** | Has liquidity in multiple currencies |

### Requirements

| Requirement | Details |
|-------------|---------|
| Bond | **Required** ($500 - $10,000+) |
| Verification | Application + founder approval + bond deposit |
| Approval | Manual (1-3 days) |
| Limits | Based on their own bond amount |

### What Traders Can Do

```
ACTIONS:
├── Apply to become a trader
├── Deposit bond with founders
├── Set their exchange rates
├── Define corridors they serve (AED↔XAF, USD↔NGN, etc.)
├── Accept/decline incoming requests
├── Receive fiat from users
├── Coordinate delivery with partners
├── Manage their liquidity
├── View earnings and analytics
├── Withdraw bond (if leaving, no active trades)
└── Respond to disputes
```

### Trader Registration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 TRADER REGISTRATION                         │
│                                                             │
│   Step 1: Download app, create user account first           │
│           └── Same as regular user registration            │
│                                                             │
│   Step 2: Apply to become a trader                          │
│           └── "Become a Trader" in settings                │
│                                                             │
│   Step 3: Fill application                                  │
│           ├── Real name                                    │
│           ├── Location/country                             │
│           ├── Corridors you want to serve                  │
│           ├── Expected monthly volume                      │
│           ├── How you'll handle deliveries                 │
│           └── Optional: references, experience             │
│                                                             │
│   Step 4: Founders review                                   │
│           └── May ask questions via chat                   │
│           └── Check for red flags                          │
│           └── 1-3 days typically                           │
│                                                             │
│   Step 5: If approved, deposit bond                         │
│           └── Receive founders' bank details               │
│           └── Send minimum $500 (or more for higher limits)│
│           └── Founders confirm receipt                     │
│                                                             │
│   Step 6: Account activated                                 │
│           └── Set your rates                               │
│           └── Go online, start accepting trades            │
│                                                             │
│   Time: 1-3 days                                            │
│   Cost: Bond deposit (refundable)                          │
│   Approval: Manual by founders                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Trader Interface (Dashboard)

```
┌─────────────────────────────────────────────────────────────┐
│  TRADER DASHBOARD                              [Online ●]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   BOND STATUS    │  │   TODAY          │                │
│  │                  │  │                  │                │
│  │  Deposited       │  │  Trades: 8       │                │
│  │  $1,000          │  │  Volume: $2,400  │                │
│  │                  │  │  Earned: ~$36    │                │
│  │  Backing trades  │  │                  │                │
│  │  $400            │  │  Rating: 4.9 ⭐  │                │
│  │                  │  │                  │                │
│  │  Available       │  │  [View History]  │                │
│  │  $600            │  │                  │                │
│  │                  │  │                  │                │
│  │  [Add to Bond]   │  │                  │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  INCOMING REQUESTS (2)                                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🆕 NEW REQUEST                                       │   │
│  │                                                     │   │
│  │ From: Ali (12 transfers, 100% rating)              │   │
│  │ Route: AED → XAF (Cameroon)                        │   │
│  │ Amount: 300 AED                                    │   │
│  │ Recipient: Marie, +237 6XX XXX XXX                 │   │
│  │                                                     │   │
│  │ Your rate: 163 XAF/AED                            │   │
│  │ You receive: 300 AED                              │   │
│  │ You deliver: 48,900 XAF                           │   │
│  │                                                     │   │
│  │ Bond required: $82 (available: $600 ✓)            │   │
│  │                                                     │   │
│  │               [Accept]    [Decline]                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  MY RATES                                        [Edit]     │
│                                                             │
│  │ Corridor      │ Buy Rate  │ Sell Rate │ Spread │        │
│  │───────────────│───────────│───────────│────────│        │
│  │ AED → XAF     │ 163       │ 160       │ 1.8%   │        │
│  │ USD → XAF     │ 605       │ 598       │ 1.2%   │        │
│  │ EUR → XAF     │ 655       │ 648       │ 1.1%   │        │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  ACTIVE TRADES (3)                                          │
│                                                             │
│  │ Ali      │ 300 AED → XAF │ Awaiting payment    │        │
│  │ Yusuf    │ 500 AED → XAF │ Delivering          │        │
│  │ Fatima   │ 200 USD → XAF │ Confirming          │        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Trader Bond System

### How Bonds Work

```
┌─────────────────────────────────────────────────────────────┐
│                     BOND MECHANICS                          │
│                                                             │
│   DEPOSIT:                                                  │
│   ├── Trader sends fiat to founders' bank account          │
│   ├── Minimum: $500                                        │
│   ├── No maximum (more bond = higher trade capacity)       │
│   └── Founders confirm and activate account                │
│                                                             │
│   USAGE:                                                    │
│   ├── Each active trade "locks" portion of bond            │
│   ├── $300 trade = $300 of bond backing it                │
│   ├── Multiple trades can run simultaneously               │
│   └── Total active ≤ total bond                           │
│                                                             │
│   RELEASE:                                                  │
│   ├── Trade completes successfully → bond unlocked         │
│   ├── Available for new trades                             │
│   └── Cycles continuously                                  │
│                                                             │
│   FORFEITURE:                                               │
│   ├── Dispute resolved against trader                      │
│   ├── Forfeited amount sent to victim                      │
│   ├── Trader must top up to continue                       │
│   └── Repeated issues → account terminated                 │
│                                                             │
│   WITHDRAWAL:                                               │
│   ├── Trader wants to quit or reduce bond                  │
│   ├── Requirements: no active trades, no pending disputes  │
│   ├── Request reviewed by founders                         │
│   └── Bond returned within 7 days                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Bond Tiers

| Bond Amount | Trade Capacity | Max Single Trade | Typical Trader |
|-------------|----------------|------------------|----------------|
| $500 | $500 | $250 | New/small trader |
| $1,000 | $1,000 | $500 | Regular trader |
| $2,500 | $2,500 | $1,000 | Active trader |
| $5,000 | $5,000 | $2,500 | Professional |
| $10,000+ | $10,000+ | $5,000 | High volume |

### Bond Protection Math

```
Example: Mamadou has $1,000 bond

Active trades:
├── Ali: $300 (backing: $300)
├── Yusuf: $500 (backing: $500)
└── Total backing: $800

Available for new trades: $200

If new request for $300:
└── Declined (only $200 available)

If Mamadou scams Ali ($300):
├── Ali opens dispute
├── Founders rule against Mamadou
├── $300 sent to Ali from Mamadou's bond
├── Mamadou's bond now: $700
├── Mamadou must deposit $300 more to restore capacity
└── (Or operate with reduced capacity)
```

---

## Complete Trade Flow

### Step-by-Step

```
═══════════════════════════════════════════════════════════════
          COMPLETE TRADE: ALI SENDS 300 AED TO MARIE
═══════════════════════════════════════════════════════════════

PARTICIPANTS:
├── Ali (User, Dubai) - Sender
├── Marie (User, Cameroon) - Recipient
├── Mamadou (Trader) - Facilitates the exchange
└── Boubacar (Mamadou's partner in Cameroon)

───────────────────────────────────────────────────────────────
PHASE 1: INITIATION
───────────────────────────────────────────────────────────────

1. Ali opens app
   └── Selects: Send to Cameroon

2. Ali enters details
   ├── Amount: 300 AED
   ├── Recipient: Marie
   └── Recipient phone: +237 6XX XXX XXX (Orange Money)

3. Ali browses traders
   └── Sees Mamadou: 4.9 rating, 1000+ trades, $1000 bonded

4. Ali selects Mamadou
   └── Sees: "300 AED → 48,900 XAF at rate 163"

5. Ali confirms
   └── Request sent to Mamadou

───────────────────────────────────────────────────────────────
PHASE 2: TRADER ACCEPTS
───────────────────────────────────────────────────────────────

6. Mamadou receives notification
   └── "New request: 300 AED → Cameroon"

7. Mamadou reviews
   ├── Ali's profile: 12 transfers, 100% completion
   ├── Amount: 300 AED (within his capacity)
   └── Destination: Orange Money (his partner supports this)

8. Mamadou accepts
   └── $300 of his bond now "locked" for this trade

9. Ali sees: "Trader accepted! Send payment"
   └── Mamadou's bank details revealed:
       Emirates NBD, Account: XXXX, Name: Mamadou Diallo

───────────────────────────────────────────────────────────────
PHASE 3: PAYMENT
───────────────────────────────────────────────────────────────

10. Ali opens his bank app
    └── Transfers 300 AED to Mamadou's account

11. Ali returns to CyxTrade
    ├── Marks "I've sent the payment"
    └── Enters reference: ENBD-2024-XXXX

12. Mamadou receives notification
    └── "Ali marked payment sent. Verify and deliver."

13. Mamadou checks his bank
    └── Sees: +300 AED from Ali Mohammed

14. Mamadou confirms receipt in app
    └── Now obligated to deliver

───────────────────────────────────────────────────────────────
PHASE 4: DELIVERY
───────────────────────────────────────────────────────────────

15. Mamadou contacts Boubacar (his Cameroon partner)
    └── Via WhatsApp/call: "Send 48,900 XAF to +237 6XX XXX XXX"

16. Boubacar sends via Orange Money
    └── Marie's phone receives: "You received 48,900 XAF"

17. Marie sees the money
    └── Calls Ali: "I got it!"

───────────────────────────────────────────────────────────────
PHASE 5: CONFIRMATION
───────────────────────────────────────────────────────────────

18. Ali confirms in app
    └── "Recipient confirmed - money received"

19. Trade marked complete
    ├── Mamadou's $300 bond unlocked
    ├── Both parties prompted to rate
    └── Trade added to history

20. Ali rates Mamadou: 5 stars
    └── "Fast and reliable!"

═══════════════════════════════════════════════════════════════
RESULT:
├── Ali sent: 300 AED
├── Marie received: 48,900 XAF
├── Mamadou earned: ~1.8% spread (paid by Ali in the rate)
├── Time: ~30 minutes
└── Fees: Just the spread (no platform fee)
═══════════════════════════════════════════════════════════════
```

---

## Trader Partnerships

### How Traders Actually Operate

Most traders work in partnerships across countries:

```
┌─────────────────────────────────────────────────────────────┐
│                 TRADER PARTNERSHIP MODEL                    │
│                                                             │
│   DUBAI                              CAMEROON               │
│   ┌──────────────┐                  ┌──────────────┐       │
│   │   MAMADOU    │                  │   BOUBACAR   │       │
│   │              │                  │              │       │
│   │ Has: AED     │◄─── Partners ───►│ Has: XAF     │       │
│   │ Wants: XAF   │                  │ Wants: AED   │       │
│   │              │                  │              │       │
│   │ Registered   │                  │ May or may   │       │
│   │ on CyxTrade  │                  │ not be on    │       │
│   │              │                  │ CyxTrade     │       │
│   └──────────────┘                  └──────────────┘       │
│         │                                  │                │
│         │                                  │                │
│   Receives AED                       Pays out XAF           │
│   from users                         to recipients          │
│         │                                  │                │
│         └────────────── Settle ───────────┘                │
│                                                             │
│   Settlement options:                                       │
│   ├── Reverse flows (Boubacar has users sending TO Dubai)  │
│   ├── Periodic bank transfers                              │
│   ├── Crypto settlement (optional, between them)           │
│   └── Other arrangements (gold, goods, travel)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### CyxTrade's Role

We don't manage trader partnerships. We just:
- Verify the main trader (Mamadou) has bond
- Track that Mamadou's trades get completed
- Hold Mamadou accountable if delivery fails
- Don't care how Mamadou actually delivers (his problem)

---

## Dispute Resolution

### When Things Go Wrong

```
┌─────────────────────────────────────────────────────────────┐
│                    DISPUTE PROCESS                          │
│                                                             │
│   TRIGGERS:                                                 │
│   ├── User paid, but recipient didn't receive              │
│   ├── Wrong amount delivered                                │
│   ├── Excessive delay (beyond promised time)               │
│   └── Trader unresponsive                                  │
│                                                             │
│   PROCESS:                                                  │
│   1. User opens dispute in app                             │
│      └── Describes issue, uploads evidence                 │
│                                                             │
│   2. Trader notified                                        │
│      └── Has 24 hours to respond with their side           │
│                                                             │
│   3. Founders review                                        │
│      ├── Check evidence from both sides                    │
│      ├── Bank statements, screenshots, messages            │
│      └── Make decision                                      │
│                                                             │
│   4. Resolution                                             │
│      ├── If trader at fault → compensate user from bond    │
│      ├── If user at fault → no action, possible ban        │
│      └── If unclear → founders make judgment call          │
│                                                             │
│   TIMELINE: 24-72 hours typically                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Business Model

### Revenue Streams

```
┌─────────────────────────────────────────────────────────────┐
│                    WHO MAKES MONEY                          │
│                                                             │
│   TRADERS:                                                  │
│   ├── Earn spread between buy/sell rates                   │
│   ├── Example: Buy AED at 163 XAF, sell at 160 XAF        │
│   ├── Spread: ~1.8%                                        │
│   ├── On $10,000/day volume → ~$180/day profit            │
│   └── This is their business, their income                 │
│                                                             │
│   CYXTRADE PLATFORM:                                        │
│   │                                                         │
│   │ MVP (Now):                                             │
│   │ └── FREE - No platform fees                            │
│   │     Goal is growth, not revenue                        │
│   │                                                         │
│   │ Future options:                                        │
│   │ ├── Trader subscription ($50/month for premium)        │
│   │ ├── Transaction fee (0.1% per trade)                   │
│   │ ├── Promoted listings (pay for visibility)             │
│   │ ├── API access for high-volume traders                │
│   │ └── White-label for other networks                    │
│   │                                                         │
│   USERS:                                                    │
│   └── Pay the spread (but still cheaper than WU)           │
│       300 AED with 1.8% spread = ~$1.50 "fee"              │
│       vs Western Union = $30-50 fee                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Comparison: Users vs Traders

| Aspect | Users | Traders |
|--------|-------|---------|
| **Purpose** | Send/receive money | Facilitate transfers, earn income |
| **Frequency** | Occasional | Daily |
| **Bond required** | No | Yes ($500+) |
| **Registration** | Instant (2 min) | Manual approval (1-3 days) |
| **Verification** | Phone SMS | Application + bond |
| **Makes money** | No | Yes (spread) |
| **Risk** | Protected by trader bond | Bond at risk |
| **Interface** | Simple send flow | Dashboard + trade management |
| **Support priority** | Standard | Higher (they're the business) |

---

## Platform Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    CYXTRADE MODEL                           │
│                                                             │
│   WHAT WE ARE:                                              │
│   ├── Marketplace connecting users with traders            │
│   ├── Reputation system for trust                          │
│   ├── Bond custody for protection                          │
│   └── Dispute resolution service                           │
│                                                             │
│   WHAT WE'RE NOT:                                           │
│   ├── A bank (we don't hold user funds)                    │
│   ├── A money transmitter (traders move the money)         │
│   ├── A crypto exchange (no crypto required)               │
│   └── A hawala network (we're the platform, not operators) │
│                                                             │
│   OUR VALUE:                                                │
│   ├── For users: Find trusted traders, protection via bond │
│   ├── For traders: Find customers, build reputation        │
│   └── For everyone: Lower friction than traditional        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

After this model is confirmed:
1. Define tech stack for the platform
2. Design database schema
3. Design API endpoints
4. Build MVP
