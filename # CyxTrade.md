# CyxTrade

**Globally permissionless P2P fiat exchange for trusted trading networks.**
Low‑fee remittances and currency exchange for underserved corridors.

Built on the **CyxWiz Protocol**.

---

## What CyxTrade Is

CyxTrade is a **global peer‑to‑peer fiat exchange protocol**.

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

* A global anonymous mass‑market exchange
* A replacement for banks
* A compliance‑heavy fintech app

CyxTrade **is**:

* A coordination + escrow layer for people who already exchange money
* Designed for community‑scale trust
* Optimized for underserved corridors

---

## The Problem

Every year, migrant workers send **$717 billion** home to their families, losing **$48 billion** to fees.

* Western Union: 10–15%
* Banks: $45+ fees + poor FX rates
* Many corridors are poorly supported (Gulf → Africa, South–South routes)
* Full KYC excludes ~1.4B unbanked people

A worker sending $300/month can lose **$600–900 per year**.

---

## The Solution

CyxTrade enables **direct fiat‑to‑fiat exchange**, using stablecoins **only as escrow**, not as money.

```
Ali (UAE)                                Marie (Cameroon)
    │ Pays AED locally                      ▲ Receives XAF locally
    ▼                                      │
┌─────────┐       USDT escrow      ┌─────────┐
│ Trader  │ ◄───────────────────► │ Trader  │
│ (UAE)   │     via CyxTrade       │ (CAM)   │
└─────────┘                        └─────────┘
```

* End users never touch crypto
* Fiat movement stays local on both ends
* Crypto exists only as neutral escrow between traders

Result: **2–3% total cost**, no fund freezing, no intermediaries.

---

## Core Design Principles

1. Traders first, users second
2. Local trust over global identity
3. Economic penalties over paperwork
4. Simple flows over complex cryptography
5. MVP must work with 5–10 traders

---

## Trusted Networks

* Invite‑only trading circles
* Entry via vouching
* Reputation scoped per network
* Communities self‑police behavior

Social accountability replaces corporate arbitration.

---

## Security Bonds

* Traders post a bond to unlock trading volume
* Bond size scales with trust tier
* Fraud or non‑performance results in bond slashing
* Honest exit returns bond

Example tiers:

* Tier 1: $1k bond → $5k/month volume
* Tier 3: $10k bond → $100k/month volume

---

## Escrow Model

### MVP Escrow

* **2‑of‑3 multisig**
* Keys held by:

  * Trader A
  * Trader B
  * Neutral protocol node

### Rationale

* Lower coordination risk
* Clear recovery path
* Easier audits
* Reduced implementation complexity

Advanced MPC schemes are deferred to later phases.

---

## Identity & Compliance

* Pseudonymous public‑key identities
* Invite‑only participation
* Volume limits enforced by trust tiers
* Designed for known community members

CyxTrade does not attempt to be compliance‑friendly everywhere.
It minimizes custodial and censorship risk by design.

---

## Geographic Scope

CyxTrade is **globally permissionless at the protocol level**.

* Any trader pair can exchange any fiat currencies
* No country lists, region flags, or corridor configuration

### MVP Validation Corridors

Initial live testing focuses on:

* **UAE ↔ Cameroon**

Chosen due to:

* High remittance volume
* Poor existing coverage
* Active informal trader networks

As new traders join, **new corridors appear automatically**, without protocol changes or permissions.

---

## Features

| Feature                              | Status |
| ------------------------------------ | ------ |
| Multi‑currency via stablecoin escrow | ✅      |
| Global P2P trading                   | ✅      |
| Corridor‑driven liquidity            | ✅      |
| Community‑based trust                | ✅      |
| Mobile money support                 | ✅      |
| No platform fees                     | ✅      |
| Open source                          | ✅      |

---

## MVP Scope

### Included

* One live validation corridor (UAE ↔ Cameroon)
* 5–10 vetted traders
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

* **Language:** C
* **Protocol:** CyxWiz
* **Crypto:** libsodium
* **Escrow:** 2‑of‑3 multisig
* **Storage:** SQLite (local) + DHT

---

## Status

**Phase: Design Validated, MVP Ready**

* [x] Problem research
* [x] Trust model
* [x] Escrow simplification
* [x] Global protocol framing
* [ ] Core implementation
* [ ] Pilot traders onboarded
* [ ] Live corridor test

---

## Contributing

Open source. Contributions welcome.

1. Read the design docs
2. Open an issue to discuss changes
3. Submit PRs with tests

---

## License

TBD

---

*Built by the cyxwiz team*
