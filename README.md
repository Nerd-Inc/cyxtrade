# CyxTrade

**Globally permissionless P2P fiat exchange for trusted trading networks.**
Low-fee remittances and currency exchange for underserved corridors.

Built on the **CyxWiz Protocol**.

---

## What CyxTrade Is

CyxTrade is a **global peer-to-peer fiat exchange protocol**.

* Any fiat currency pair can be traded
* No geographic restrictions at the protocol level
* No central operator or corridor whitelisting

Adoption happens **corridor by corridor**, driven by:

* Local traders
* Local trust networks
* Existing fiat rails

The protocol is worldwide by design.
Liquidity and usage emerge organically.

CyxTrade is **not**:

* A global anonymous mass-market exchange
* A replacement for banks
* A compliance-heavy fintech app

CyxTrade **is**:

* A coordination + escrow layer for people who already exchange money
* Designed for community-scale trust
* Optimized for underserved corridors

---

## The Problem

Every year, migrant workers send **$717 billion** home to their families, losing **$48 billion** to fees.

* Western Union: 10-15%
* Banks: $45+ fees + poor FX rates
* Many corridors are poorly supported (Gulf -> Africa, South-South routes)
* Full KYC excludes ~1.4B unbanked people

A worker sending $300/month can lose **$600-900 per year**.

---

## The Solution

CyxTrade enables **direct fiat-to-fiat exchange**, using stablecoins **only as trader bonds**, not as money users touch.

```
Ali (UAE)                      Trader                      Marie (Cameroon)
    │                             │                              │
    │ 1. Send 1000 AED            │                              │
    │    to Trader's bank         │                              │
    └────────────────────────────►│                              │
                                  │ 2. Trader sends              │
                                  │    163,000 XAF               │
                                  │    to Marie                  │
                                  │─────────────────────────────►│
                                  │                              │
    │ 3. Marie confirms           │                              │
    │    to Ali                   │                              │
    │◄─────────────────────────────────────────────────────────────
    │                             │                              │
    │ 4. Ali closes trade         │                              │
    └────────────────────────────►│                              │
                                  │                              │
                            TRADE COMPLETE
```

**How it works:**
* **Users** (Ali, Marie) only use the app - no crypto wallet needed
* **Traders** deposit USDT bonds to smart contract as collateral
* **If trader scams**: Bond slashed, user compensated automatically
* Fiat moves off-chain, crypto exists only as trader protection

Result: **2-3% total cost**, no fund freezing, no intermediaries.

---

## Core Design Principles

1. Traders first, users second
2. Local trust over global identity
3. Economic penalties over paperwork
4. Simple flows over complex cryptography
5. MVP must work with 5-10 traders

---

## Trusted Networks

* Invite-only trading circles
* Entry via vouching
* Reputation scoped per network
* Communities self-police behavior

Social accountability replaces corporate arbitration.

---

## Security Bonds

* Traders post a bond to unlock trading volume
* Bond size scales with trust tier
* Fraud or non-performance results in bond slashing
* Honest exit returns bond

Example tiers:

* Tier 1: $1k bond -> $5k/month volume
* Tier 3: $10k bond -> $100k/month volume

---

## Escrow Model

### Trader Bonds (Non-Custodial)

* **Traders deposit USDT bonds** to smart contract
* **Users don't need crypto** - just use the app
* Bond = trader's "skin in the game"
* Contract is immutable (no admin keys)

### How It Works

```
1. Trader deposits bond      → Smart contract holds 5000 USDT
2. Ali creates trade (1000 AED) → 165 USDT locked from trader's bond
3. Ali sends fiat to trader  → Off-chain bank transfer
4. Trader sends to Marie     → Off-chain mobile money
5. Ali confirms receipt      → Bond unlocked
6. If trader scams           → Bond slashed, Ali compensated
```

### Why This Works

* **Users protected** - Trader's bond covers their trade
* **No crypto for users** - App handles everything
* **Traders accountable** - Scam = lose bond
* **Transparent** - All bonds visible on-chain

See [BOND_ESCROW.md](docs/BOND_ESCROW.md) for full technical design.

---

## Identity & Compliance

* Pseudonymous public-key identities
* Invite-only participation
* Volume limits enforced by trust tiers
* Designed for known community members

CyxTrade does not attempt to be compliance-friendly everywhere.
It minimizes custodial and censorship risk by design.

---

## Why Trust CyxTrade?

**Traders have skin in the game.** Their bond protects you.

| Question | Answer |
|----------|--------|
| What if trader takes my money and disappears? | Their bond is slashed, you get compensated |
| Do I need crypto/wallet? | NO - Just use the app |
| Can the team steal trader bonds? | NO - Smart contract has no admin keys |
| What if trader and I disagree? | Arbitrators review evidence and decide |
| How are arbitrators accountable? | They stake 500+ USDT, lose it if corrupt |

**How you're protected:**
- Trader's bond is locked when you create trade
- If trader doesn't deliver, you dispute
- Arbitrators vote, winner gets the locked bond
- All on-chain, transparent, auditable

---

## Geographic Scope

CyxTrade is **globally permissionless at the protocol level**.

* Any trader pair can exchange any fiat currencies
* No country lists, region flags, or corridor configuration

### MVP Validation Corridors

Initial live testing focuses on:

* **UAE <-> Cameroon**

Chosen due to:

* High remittance volume
* Poor existing coverage
* Active informal trader networks

As new traders join, **new corridors appear automatically**, without protocol changes or permissions.

---

## Features

| Feature                              | Status |
| ------------------------------------ | ------ |
| Multi-currency via stablecoin escrow | Done   |
| Global P2P trading                   | Done   |
| Corridor-driven liquidity            | Done   |
| Community-based trust                | Done   |
| Mobile money support                 | Done   |
| No platform fees                     | Done   |
| Open source                          | Done   |

---

## MVP Scope

### Included

* One live validation corridor (UAE <-> Cameroon)
* 5-10 vetted traders
* Fixed trade sizes
* Manual dispute resolution
* CLI daemon + minimal mobile UI

### Explicitly Excluded

* Global scaling guarantees
* Anonymous public order books
* Algorithmic pricing
* Offline / mesh networking

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Smart Contracts** | Solidity (Tron) | Holds trader bonds (USDT) |
| **Backend API** | Node.js / TypeScript | Trade coordination, on-chain interactions |
| **Mobile App** | Flutter (iOS + Android) | User interface (no wallet needed) |
| **Database** | PostgreSQL + Redis | Profiles, trades, chat |
| **Evidence** | IPFS | Dispute evidence storage |
| **Protocol** | C (CyxWiz) | Future: mesh networking, E2E chat |

**Key insight:**
- **Users** = App only, no crypto knowledge needed
- **Traders** = Have wallets, deposit bonds to smart contract
- **Backend** = Creates trades on-chain on behalf of users

---

## Trade State Machine

All trades follow this flow:

```
CREATED          User initiates trade, trader's bond locked
    ↓
ACCEPTED         Trader accepts, sends payment details
    ↓
USER_PAID        User confirms sent fiat to trader
    ↓
DELIVERING       Trader confirms received, sending to recipient
    ↓
COMPLETED        User confirms recipient received funds
                 Trader's bond unlocked

Exceptional paths:
CANCELLED        Trade cancelled before USER_PAID
DISPUTED         Either party opens dispute
RESOLVED         Arbitrators decided, bond distributed
```

### State Rules

* Bond locked at `CREATED`, unlocked at `COMPLETED` or `RESOLVED`
* User can dispute after `USER_PAID` if trader doesn't deliver
* Trader can dispute if user falsely claims non-delivery
* Timeout auto-escalates to dispute after 24h of inactivity

---

## Protocol Messages

All protocol messages are signed with Ed25519 and broadcast over the CyxWiz network.

### JOIN_NETWORK

```
JOIN_NETWORK {
  pubkey,
  network_id,
  invite_token,
  timestamp,
  signature
}
```

### POST_BOND

```
POST_BOND {
  pubkey,
  network_id,
  amount,
  escrow_address,
  timestamp,
  signature
}
```

### CREATE_OFFER

```
CREATE_OFFER {
  offer_id,
  have_currency,
  want_currency,
  amount,
  rate,
  timeout,
  timestamp,
  signature
}
```

### ACCEPT_OFFER

```
ACCEPT_OFFER {
  offer_id,
  counterparty_pubkey,
  timestamp,
  signature
}
```

### CONFIRM_FIAT

```
CONFIRM_FIAT {
  trade_id,
  leg,            // A or B
  proof_ref,
  timestamp,
  signature
}
```

### OPEN_DISPUTE

```
OPEN_DISPUTE {
  trade_id,
  reason_code,
  evidence_refs,
  timestamp,
  signature
}
```

---

## Trader CLI Design

The CLI is the primary MVP interface. Commands are explicit and low-level.

### Identity & Network

```
cyxtrade keygen
cyxtrade network join <network_id> --invite <token>
cyxtrade network status
```

### Bonding

```
cyxtrade bond post <amount>
cyxtrade bond status
cyxtrade bond withdraw
```

### Trading

```
cyxtrade offer create --have AED --want XAF --amount 1100 --rate 163
cyxtrade offer list
cyxtrade offer accept <offer_id>
```

### Settlement

```
cyxtrade fiat confirm <trade_id> --leg A
cyxtrade trade status <trade_id>
```

### Disputes & Exit

```
cyxtrade dispute open <trade_id> --reason timeout
cyxtrade exit
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [RESEARCH.md](docs/RESEARCH.md) | Problem analysis, market research |
| [VALIDATION.md](docs/VALIDATION.md) | Value proposition, target users, trade flows |
| [PLATFORM_MODEL.md](docs/PLATFORM_MODEL.md) | User types, no-crypto MVP design |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, database, API, UI |
| [TRUST_MODEL.md](docs/TRUST_MODEL.md) | Reputation system, vouching, arbitrators |
| [DISPUTE_RESOLUTION.md](docs/DISPUTE_RESOLUTION.md) | How disputes are resolved (detailed) |
| [TRADER_ONBOARDING.md](docs/TRADER_ONBOARDING.md) | Becoming a trader, tiers, verification |
| [TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md) | Data structures, protocols |
| [MVP_USER_STORIES.md](docs/MVP_USER_STORIES.md) | User flows, acceptance criteria |
| [SECURITY_MODEL.md](docs/SECURITY_MODEL.md) | Bonds, rules, fraud prevention |
| [BOND_ESCROW.md](docs/BOND_ESCROW.md) | Smart contract escrow design |
| [UX_DESIGN.md](docs/UX_DESIGN.md) | Interface patterns, onboarding |
| [EXPANSION_ROADMAP.md](docs/EXPANSION_ROADMAP.md) | Future corridors and growth plan |

---

## Status

**Phase: Design Validated, MVP In Progress**

- [x] Problem research
- [x] Trust model
- [x] Escrow simplification
- [x] Global protocol framing
- [x] Backend API setup
- [x] Mobile app scaffold
- [ ] Core implementation
- [ ] Pilot traders onboarded
- [ ] Live corridor test

---

## Building

### Backend

```bash
cd backend
npm install
npm run dev
```

### Mobile

```bash
cd mobile
flutter pub get
flutter run
```

### Protocol (CyxWiz)

```bash
# See CyxWiz Protocol repo
cmake -B build
cmake --build build
```

---

## Contributing

Open source. Contributions welcome.

1. Read the design docs
2. Open an issue to discuss changes
3. Submit PRs with tests

---

## License

MIT

---

*Built by the cyxwiz-team*
