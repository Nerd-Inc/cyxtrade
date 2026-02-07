# CyxTrade Research & Design Document

> **Version:** 0.2
> **Direction:** Binance P2P model for trusted networks
> **Built on:** CyxWiz Protocol

---

## Problem Statement

### The Global Remittance Crisis

**$717 billion** was sent across borders by migrant workers in 2023.
**$48 billion** was lost to fees.

That's not a market inefficiency. That's a tax on the world's poorest people.

### The Numbers

| Statistic | Value | Source |
|-----------|-------|--------|
| Global remittance volume (2023) | $717 billion | World Bank |
| Average global fee | 6.2% | World Bank Q4 2023 |
| Sub-Saharan Africa average fee | 7.9% | World Bank |
| Highest corridor fees | 12-15% | Some Africa/Asia routes |
| People who send remittances | 200+ million | UN Migration |
| Unbanked adults globally | 1.4 billion | World Bank Findex |

### Real Impact

A construction worker in Dubai sends $500/month to Cameroon:
- **Western Union:** $50-75 fee (10-15%)
- **Bank wire:** $45 fee + 4% FX markup = ~$65
- **TapTap Send:** Not available for Cameroon
- **Wave:** Doesn't support UAE → Cameroon

That's **$600-900/year** lost to fees. For someone earning $800/month.

### Who Suffers

1. **Migrant workers** - 200M+ people sending money home
2. **Receiving families** - Depend on remittances for survival
3. **Unbanked populations** - 1.4B people excluded from formal finance
4. **Underserved corridors** - Africa, Central Asia, Pacific Islands
5. **People under currency controls** - Nigeria, Cameroon, Venezuela, etc.

### The Hypocrisy

- Corporations move billions across borders instantly, near-zero fees
- Governments transfer unlimited amounts with no restrictions
- Regular people? 7% fee, 3-day wait, 50 forms, maybe rejected

---

## Existing Solutions & Their Failures

### Traditional Remittance Services (Overview)

| Service | Fees | Speed | Corridors | KYC | Freeze Risk | Verdict |
|---------|------|-------|-----------|-----|-------------|---------|
| **Western Union** | 5-15% | Minutes-days | Global | Yes | Yes | Expensive, predatory |
| **MoneyGram** | 4-10% | Minutes-days | Global | Yes | Yes | Same problems |
| **Bank Wire** | $25-50 + FX | 2-5 days | Limited | Yes | Yes | Slow, expensive, exclusionary |
| **Wise** | 0.5-2% | 1-2 days | Limited | Yes | Yes | Good rates, limited corridors |
| **TapTap Send** | Low | Fast | Limited | Yes | Yes | Only select African countries |
| **WorldRemit** | 2-5% | Fast | Medium | Yes | Yes | Hidden FX markup |
| **Wave** | Low | Instant | Africa only | Yes | Yes | Not cross-border from US/EU/ME |
| **Remitly** | 1-4% | Fast | Medium | Yes | Yes | Limited African mobile money |

**Every single one:**
- Requires KYC (excludes unbanked)
- Can freeze your money
- Has geographic restrictions
- Reports to governments
- Takes a cut

---

### Detailed App Breakdown

#### Wise (formerly TransferWise)

| Attribute | Details |
|-----------|---------|
| **Fees** | 0.5-2% (transparent, no hidden markup) |
| **Speed** | 1-2 business days (sometimes instant) |
| **Send From** | US, UK, EU, Canada, Australia, etc. |
| **Send To** | 80+ countries |
| **KYC** | Full (ID, address, sometimes source of funds) |
| **Payment Methods** | Bank transfer, debit card |
| **Receive Methods** | Bank account only |

**Strengths:**
- Transparent mid-market exchange rate
- Low fees for supported corridors
- Good UI/UX
- Multi-currency account

**Limitations:**
- ❌ **No UAE support** (can't send FROM UAE)
- ❌ **No mobile money** (Africa = bank only)
- ❌ **Limited Africa** (no Cameroon XAF, limited Nigeria)
- ❌ Can freeze accounts for "suspicious" activity
- ❌ Requires bank account on both ends

**Verdict:** Great for US/UK → Europe. Useless for Gulf → Africa.

---

#### TapTap Send

| Attribute | Details |
|-----------|---------|
| **Fees** | 0% (makes money on FX spread ~1-2%) |
| **Speed** | Minutes to mobile money |
| **Send From** | US, UK, France, Belgium, Italy, Spain, Germany |
| **Send To** | Ghana, Nigeria, Kenya, Uganda, Senegal, Morocco, etc. |
| **KYC** | Medium (ID + selfie) |
| **Payment Methods** | Debit card, bank transfer |
| **Receive Methods** | Mobile money, bank, cash pickup |

**Strengths:**
- Zero fee marketing (spread is low)
- Fast mobile money delivery
- Good African coverage from Europe/US

**Limitations:**
- ❌ **No UAE/Gulf support** (can't send from Middle East)
- ❌ **No Cameroon** (XAF not supported)
- ❌ No crypto option
- ❌ Account freezes happen
- ❌ Limits on amounts ($2,500/day typical)

**Verdict:** Good for UK/US → West Africa. Doesn't exist for Gulf → Africa.

---

#### Wave

| Attribute | Details |
|-----------|---------|
| **Fees** | ~1% or less |
| **Speed** | Instant (within Wave network) |
| **Send From** | Senegal, Côte d'Ivoire, Mali, Uganda, etc. |
| **Send To** | Same countries (intra-Africa) |
| **KYC** | Phone number + light ID |
| **Payment Methods** | Wave wallet, cash agents |
| **Receive Methods** | Wave wallet, cash out at agents |

**Strengths:**
- Dominant in Francophone West Africa
- Very low fees
- Huge agent network
- Works for unbanked (cash in/out)

**Limitations:**
- ❌ **Africa-to-Africa only** (can't receive from UAE, US, UK)
- ❌ Not for international remittance inflows
- ❌ No Cameroon (limited XAF presence)
- ❌ Can't send TO Wave from outside

**Verdict:** Excellent within Africa. Zero use for diaspora sending money IN.

---

#### Remitly

| Attribute | Details |
|-----------|---------|
| **Fees** | $0-5 + FX markup (~2-4% total) |
| **Speed** | Minutes to days |
| **Send From** | US, UK, Canada, Australia, EU |
| **Send To** | 100+ countries |
| **KYC** | Full (ID, SSN in US) |
| **Payment Methods** | Bank, debit, credit card |
| **Receive Methods** | Bank, mobile money, cash pickup |

**Strengths:**
- Wide country coverage
- Mobile money options in some countries
- Cash pickup available

**Limitations:**
- ❌ **No UAE/Gulf** sending
- ❌ Hidden FX markup (advertised "fee" is misleading)
- ❌ Rates worse than Wise
- ❌ Account freezes common
- ❌ Cameroon rates are bad

**Verdict:** Mediocre option. Better than Western Union, worse than Wise.

---

#### WorldRemit

| Attribute | Details |
|-----------|---------|
| **Fees** | $0-5 + FX markup (~3-5% total) |
| **Speed** | Minutes to 3 days |
| **Send From** | 50+ countries including **UAE** |
| **Send To** | 130+ countries |
| **KYC** | Full |
| **Payment Methods** | Bank, card |
| **Receive Methods** | Mobile money, bank, cash pickup, airtime |

**Strengths:**
- ✅ **Works from UAE**
- Wide African coverage including Cameroon
- Mobile money delivery
- Airtime top-up option

**Limitations:**
- ❌ **High total cost** (fee + FX markup = 5-8%)
- ❌ Rates significantly worse than mid-market
- ❌ Account freezes
- ❌ Slow customer support

**Verdict:** One of few options for UAE → Cameroon. But expensive (5-8% total cost).

---

#### Western Union

| Attribute | Details |
|-----------|---------|
| **Fees** | $5-50 + terrible FX (total 8-15%) |
| **Speed** | Minutes (cash) to days (bank) |
| **Send From** | Almost everywhere |
| **Send To** | Almost everywhere |
| **KYC** | Full |
| **Payment Methods** | Cash, bank, card |
| **Receive Methods** | Cash pickup, bank, mobile money |

**Strengths:**
- Global presence (500,000+ agent locations)
- Works almost everywhere
- Cash pickup widely available
- Brand trust (people know it)

**Limitations:**
- ❌ **Extremely expensive** (8-15% total)
- ❌ Terrible exchange rates
- ❌ Slow for bank transfers
- ❌ Predatory pricing on poorest corridors

**Verdict:** Last resort. Exists everywhere but costs the most.

---

#### Orange Money (Mobile Money)

| Attribute | Details |
|-----------|---------|
| **Fees** | 1-3% |
| **Speed** | Instant |
| **Coverage** | Francophone Africa (Cameroon, Senegal, Mali, Côte d'Ivoire) |
| **KYC** | SIM registration |
| **Methods** | Mobile wallet, cash agents |

**Strengths:**
- ✅ **Works in Cameroon** (XAF)
- Huge agent network
- Low fees for local transfers
- Works for unbanked

**Limitations:**
- ❌ **Domestic only** - can't receive international transfers directly
- ❌ Need someone local to cash in for you
- ❌ No direct link to UAE/US/UK banks

**Verdict:** The destination wallet. But you need a way to GET money into it.

---

### The Gap We Fill

| Corridor | Wise | TapTap | Wave | Remitly | WorldRemit | WU | **CyxTrade** |
|----------|------|--------|------|---------|------------|----|----|
| UAE → Cameroon | ❌ | ❌ | ❌ | ❌ | ✅ (expensive) | ✅ (very expensive) | ✅ |
| UAE → Nigeria | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Saudi → Pakistan | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| UK → Cameroon | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| No KYC | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| No freeze risk | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Mobile money delivery | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**The problem is clear:**
- Gulf → Africa corridors are underserved
- Existing options charge 5-15%
- All require KYC (excludes many)
- All can freeze your money

**CyxTrade fills this gap:**
- ✅ UAE → Cameroon (our MVP corridor)
- ✅ No KYC required
- ✅ Can't freeze funds (P2P + trader bonds)
- ✅ Competitive rates (trader spread only, ~2-3%)
- ✅ Mobile money delivery (Orange Money via traders)

### Crypto P2P Exchanges

| Service | Model | KYC | Decentralized | Status |
|---------|-------|-----|---------------|--------|
| **Binance P2P** | Centralized escrow | Required | No | Active, market leader |
| **Paxful** | Centralized escrow | Required | No | Active, reputation issues |
| **LocalBitcoins** | Centralized escrow | Required | No | **Shut down Feb 2023** |
| **Bisq** | Decentralized | No | Yes | Active, low volume, complex |
| **HodlHodl** | Non-custodial | Minimal | Partial | Active, low volume |
| **AgoraDesk** | Centralized | Minimal | No | Active, small |

### Why Binance P2P Works

Binance P2P processes **millions of trades** monthly. Why?

1. **Simple model:** Buyer and seller agree on price, escrow holds crypto
2. **Multi-currency:** Any fiat ↔ any crypto via local traders
3. **Escrow protection:** Neither party can run with the money
4. **Reputation visible:** See trader's history before trading
5. **Liquidity:** Massive user base = always someone to trade with

### Why Binance P2P Fails

1. **KYC required** - Need passport, selfie, proof of address
2. **Centralized** - Binance can freeze your account anytime
3. **Surveillance** - All trades tracked, reported to authorities
4. **Banned in many countries** - Nigeria, UK (was), others
5. **Account freezes** - "Suspicious activity" = locked funds
6. **Not truly P2P** - Binance is always the middleman

---

## CyxTrade: Our Solution

### Vision

**Binance P2P for trusted networks. Digital hawala infrastructure.**

We don't compete with Binance for the global marketplace.
We give **trusted communities** the tools to trade among themselves.

### Who We Serve

| User Type | Use Case |
|-----------|----------|
| **Diaspora families** | Send money home without 10% fee |
| **Friend networks** | Split bills, repay loans across borders |
| **Small hawala operators** | Digitize existing trust networks |
| **Expat communities** | Cameroonians in UAE, Nigerians in UK, etc. |
| **Merchant networks** | Cross-border B2B payments |

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                  TRUSTED NETWORK                        │
│                                                         │
│   ┌─────────┐      ┌─────────────┐      ┌─────────┐    │
│   │  Ali    │◄────►│   Mamadou   │◄────►│  Marie  │    │
│   │  (UAE)  │      │  (Trader)   │      │(Cameroon)│   │
│   └─────────┘      └─────────────┘      └─────────┘    │
│        │                  │                   │         │
│        │    Vouched by    │    Vouched by    │         │
│        └──────────────────┴──────────────────┘         │
│                                                         │
│   Network Rules:                                        │
│   - Invite only (vouching required)                     │
│   - Cheat = expelled from network                       │
│   - Reputation visible to all members                   │
│   - Escrow for crypto side                              │
│   - Trust for fiat side                                 │
└─────────────────────────────────────────────────────────┘
```

### Trade Flow (UAE → Cameroon)

**Ali wants to send 1000 AED to Marie in Cameroon**

```
Step 1: Ali → Mamadou (AED/USDT)
┌─────────────────────────────────────────────┐
│ Ali posts: "Buy 270 USDT for 1000 AED"      │
│ Mamadou accepts                              │
│ Mamadou's 270 USDT → Escrow                 │
│ Ali sends 1000 AED to Mamadou's bank        │
│ Mamadou confirms receipt                     │
│ Escrow releases 270 USDT to Ali             │
└─────────────────────────────────────────────┘

Step 2: Ali → Trader B (USDT/XAF)
┌─────────────────────────────────────────────┐
│ Ali posts: "Sell 270 USDT for 175,000 XAF"  │
│ Condition: "Pay to Marie's Orange Money"    │
│ Trader B accepts                             │
│ Ali's 270 USDT → Escrow                     │
│ Trader B sends 175,000 XAF to Marie         │
│ Ali confirms Marie received                  │
│ Escrow releases 270 USDT to Trader B        │
└─────────────────────────────────────────────┘

Result: Marie has 175,000 XAF
Fee: Whatever spread Ali accepted (market rate)
Time: Minutes
KYC: None
```

---

## Competitive Comparison

### CyxTrade vs The World

| Feature | Western Union | Binance P2P | Bisq | **CyxTrade** |
|---------|---------------|-------------|------|--------------|
| **Fees** | 5-15% | 0% + spread | 0.1% + spread | **0% + spread** |
| **KYC Required** | Yes | Yes | No | **No** |
| **Can Freeze Funds** | Yes | Yes | No | **No** |
| **Geographic Limits** | Some | Some (bans) | No | **No** |
| **Works Offline** | No | No | No | **Yes (mesh)** |
| **Surveillance** | Full | Full | Minimal | **None** |
| **Dispute Resolution** | Company | Company | Arbiters | **Network** |
| **Mobile Money Support** | Limited | Via traders | No | **Via traders** |
| **Censorship Resistant** | No | No | Partial | **Yes** |
| **Trusted Entry** | N/A | N/A | N/A | **Yes (vouching)** |

### Where We Excel

1. **No KYC** - Pseudonymous trading via vouched networks
2. **No central authority** - Can't be shut down, frozen, or banned
3. **No geographic limits** - Works wherever users exist
4. **No surveillance** - Onion routing, encrypted everything
5. **Trusted networks** - Social accountability replaces corporate arbitration
6. **Works on mesh** - Can operate on LoRa/Bluetooth when internet is down
7. **Community owned** - No company extracting fees

### What We Trade Off

| We Don't Have | Why It's Okay |
|---------------|---------------|
| Global liquidity | Trusted networks provide their own |
| Instant dispute resolution | Network social pressure handles it |
| Chargebacks/refunds | Know your trading partners |
| 24/7 support | Community self-support |
| Fancy mobile app (yet) | Function over form |

---

## Trust Model: Digital Hawala

### How Traditional Hawala Works

Hawala has moved money across borders for **1000+ years** without:
- Banks
- Governments
- KYC
- Technology

**The secret:** Social collateral.

```
Traditional Hawala:

Customer (Dubai) ──► Hawaladar A (Dubai)
                         │
                         │ Trust relationship
                         │ (family, village, business)
                         ▼
                    Hawaladar B (Karachi) ──► Recipient

- No money crosses borders
- Hawaladars settle later (gold, goods, reverse transfers)
- Cheat once = network exile = business destroyed
```

### CyxTrade's Digital Hawala Model

We keep the trust model, add crypto escrow:

```
CyxTrade Network:

┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Vouching Chain:                                        │
│  ┌─────────┐    vouches    ┌─────────┐    vouches      │
│  │ Founder │──────────────►│ Mamadou │───────────────►  │
│  │  (OG)   │               │(Trader) │                  │
│  └─────────┘               └─────────┘                  │
│       │                         │                       │
│       │ vouches                 │ vouches               │
│       ▼                         ▼                       │
│  ┌─────────┐               ┌─────────┐                  │
│  │  Ali    │               │  Marie  │                  │
│  └─────────┘               └─────────┘                  │
│                                                         │
│  Trust Rules:                                           │
│  1. Must be vouched to join                             │
│  2. Voucher's reputation at stake                       │
│  3. Bad actor = voucher also penalized                  │
│  4. Expelled users publicly marked                      │
│  5. Network can vote to expel                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Reputation System

| Action | Reputation Impact |
|--------|-------------------|
| Complete trade successfully | +1 to both parties |
| Get vouched by high-rep user | +bonus |
| Vouch for someone who scams | -penalty (shared responsibility) |
| Dispute resolved against you | -large penalty |
| Expelled from network | Reputation = 0, marked as scammer |

### Why This Works

1. **Skin in the game** - Vouchers risk their reputation
2. **Social accountability** - Everyone knows everyone (in their network)
3. **Economic incentive** - Good reputation = more trades = more profit
4. **Network effects** - Scammer reputation follows them everywhere
5. **No central point of failure** - Trust is distributed

---

## Technical Architecture

### Built on CyxWiz Protocol

CyxTrade leverages existing CyxWiz infrastructure:

| CyxWiz Component | CyxTrade Usage |
|------------------|----------------|
| **DHT** (`dht.c`) | Order book storage, user discovery |
| **Onion Routing** (`onion.c`) | Anonymous trade communication |
| **MPC Crypto** (`crypto.c`) | Threshold escrow (3-of-5 network nodes) |
| **Storage** (`storage.c`) | Trade history, reputation data |
| **Transport** (`udp.c`, `lora.c`) | Network connectivity |
| **Peer Discovery** (`peer.c`) | Find trading partners |

### New Components to Build

```
cyxtrade/
├── src/
│   ├── network/           # Network management
│   │   ├── network.c      # Create/join/manage trusted networks
│   │   └── vouch.c        # Vouching system
│   │
│   ├── orderbook/         # Trading
│   │   ├── order.c        # Create/cancel/match orders
│   │   └── matching.c     # Order matching engine
│   │
│   ├── escrow/            # Escrow system
│   │   ├── escrow.c       # Lock/release funds
│   │   └── multisig.c     # Threshold signatures
│   │
│   ├── reputation/        # Trust system
│   │   ├── reputation.c   # Score calculation
│   │   └── history.c      # Trade history
│   │
│   ├── trade/             # Trade flow
│   │   ├── trade.c        # Trade state machine
│   │   └── chat.c         # Trade negotiation chat
│   │
│   └── currency/          # Multi-currency support
│       ├── stablecoin.c   # USDT/USDC handling
│       └── fiat.c         # Fiat currency metadata
│
├── include/cyxtrade/
│   └── [headers]
│
└── daemon/
    └── cyxtraded.c        # Trading daemon
```

### Escrow Model

```
Multi-Party Escrow (3-of-5):

┌─────────────────────────────────────────────┐
│                                             │
│   Seller's USDT ──► Escrow Pool             │
│                         │                   │
│   Escrow Pool = 5 network nodes holding     │
│   shares of the locked funds                │
│                                             │
│   To release (any of):                      │
│   - Seller confirms fiat received (normal)  │
│   - 3-of-5 nodes sign release (dispute)     │
│   - Timeout + buyer proof (edge case)       │
│                                             │
│   Node 1: [share] ─┐                        │
│   Node 2: [share] ─┤                        │
│   Node 3: [share] ─┼─► 3 required to release│
│   Node 4: [share] ─┤                        │
│   Node 5: [share] ─┘                        │
│                                             │
└─────────────────────────────────────────────┘
```

---

## MVP Scope

### Phase 1: Core Trading (MVP)

**Goal:** Two people in a trusted network can complete a trade.

Features:
- [ ] Create private network (invite code)
- [ ] Join network (with vouch)
- [ ] Post buy/sell order
- [ ] Accept order
- [ ] Simple escrow (2-of-2 multisig: buyer + seller)
- [ ] Mark trade complete
- [ ] Basic trade history

**Not in MVP:**
- Multi-party escrow
- Reputation scores
- Dispute resolution
- Mobile app
- Multiple networks

### Phase 2: Trust Layer

- [ ] Vouching system
- [ ] Reputation scoring
- [ ] Trade history visible to network
- [ ] Vouch chain tracking

### Phase 3: Resilience

- [ ] 3-of-5 network escrow
- [ ] Dispute voting
- [ ] Network expulsion
- [ ] Multiple network membership

### Phase 4: Scale

- [ ] Mobile apps (iOS/Android)
- [ ] Cross-network trading
- [ ] Liquidity incentives
- [ ] Fiat payment integrations

---

## Open Questions

### Solved (For Now)

| Question | Answer |
|----------|--------|
| How to verify fiat? | Trust within network; social accountability |
| How to resolve disputes? | Network voting; voucher accountability |
| How to bootstrap? | Invite-only; target existing communities |
| Global or local? | Start with trusted networks; grow organically |

### Still Open

1. **Which stablecoin?** USDT (liquidity) vs USDC (trust) vs both?
2. **Network size limits?** How big before trust breaks down?
3. **Cross-network trading?** How do separate networks interact?
4. **Fiat payment methods?** Bank, mobile money, cash - how to track?
5. **Legal structure?** Open source project? DAO? Foundation?

---

## Success Metrics

### MVP Success

- [ ] 2 people complete a trade end-to-end
- [ ] Escrow works correctly
- [ ] No loss of funds

### Phase 1 Success

- [ ] 1 active network with 10+ members
- [ ] 50+ completed trades
- [ ] Zero scams (or scams handled by network)

### Long-term Success

- [ ] 1000+ active traders
- [ ] Multiple independent networks
- [ ] Lower effective fees than Western Union
- [ ] Operating in "unsupported" corridors

---

## References

- [World Bank Remittance Prices](https://remittanceprices.worldbank.org/)
- [Binance P2P](https://p2p.binance.com)
- [Bisq Network](https://bisq.network)
- [Hawala System](https://en.wikipedia.org/wiki/Hawala)
- [CyxWiz Protocol](../../../README.md)

---

## Appendix: Why This Could Work

Every successful P2P money system shares one trait: **accountable participants.**

| System | Accountability Mechanism |
|--------|-------------------------|
| Hawala | Family/village reputation; livelihood at stake |
| Binance P2P | KYC + centralized bans |
| Traditional banking | Legal identity + government enforcement |
| **CyxTrade** | Vouching chains + network expulsion + reputation |

We're not removing accountability. We're **decentralizing it.**

The question isn't "can people be trusted?"
It's "can we create systems where betraying trust is too costly?"

Hawala says yes. We're building the digital version.
