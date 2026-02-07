# CLAUDE.md - CyxTrade Project Context

> This file helps Claude Code understand the CyxTrade project.

---

## Project Overview

**CyxTrade** is a globally permissionless P2P fiat exchange protocol for trusted trading networks.

**Vision:** Low-fee remittances and currency exchange for underserved corridors, built on the CyxWiz Protocol.

**Target Users:** Migrant workers, diaspora communities, people in underserved remittance corridors (Africa, Middle East, Asia).

---

## The Problem We Solve

- $717B annual remittances, $48B lost to fees (6.7% average)
- Highest fees on Africa corridors (10-15%)
- KYC excludes 1.4B unbanked people
- Centralized platforms can freeze funds, ban users
- Geographic restrictions leave many corridors unsupported

---

## Our Solution

**Non-custodial smart contract escrow with community arbitration.**

Key components:
1. **Smart Contract Escrow** - Code holds funds, no human custody
2. **Security Bonds** - Traders stake deposit, forfeited if they scam
3. **Community Arbitrators** - Staked humans resolve disputes (not trustless)
4. **Trusted Networks** - Invite-only trading circles with vouching
5. **Tiered Verification** - Reputation gates trading limits

Trade flow:
```
Ali (UAE)                                Marie (Cameroon)
    | Pays AED locally                      ^ Receives XAF locally
    v                                       |
+---------+       USDT escrow      +---------+
| Trader  | <-------------------> | Trader  |
| (UAE)   |   via Smart Contract   | (CAM)   |
+---------+                        +---------+
```

---

## Critical Design Distinction

**What's Non-Custodial (Code-Enforced):**
- Bond custody (smart contract holds funds)
- Trade escrow (locked until both confirm)
- Withdrawal (no approval needed when clean)
- Vote execution (contract enforces arbitrator decision)

**What's Socially Enforced (Humans Judge):**
- Fiat verification (someone must attest)
- Dispute resolution (arbitrators vote)
- Evidence evaluation (humans decide truth)

We do NOT claim fully trustless disputes. Fiat is off-chain. Someone must judge.
We make cheating economically irrational, not impossible.

---

## Tech Stack

| Layer | Technology | Has Custody? |
|-------|------------|--------------|
| **Smart Contracts** | Solidity (Tron/Ethereum/Polygon) | YES - non-custodial |
| **Protocol** | C (CyxWiz - mesh networking, crypto) | NO |
| **Coordination API** | Node.js / TypeScript | NO - never touches funds |
| **Mobile** | Flutter (iOS + Android) | NO |
| **Database** | PostgreSQL + Redis | NO - profiles only |
| **Evidence** | IPFS | NO - dispute evidence |
| **Crypto** | libsodium | - |

**Key insight:** Only smart contracts hold funds. Everything else is coordination.

---

## Project Structure

```
cyxtrade/
├── CLAUDE.md              # This file - project context
├── README.md              # Public readme with protocol spec
│
├── docs/                  # Design documentation
│   ├── RESEARCH.md        # Problem analysis, competitive research
│   ├── VALIDATION.md      # Value prop, target users, trade flows
│   ├── PLATFORM_MODEL.md  # User types, no-crypto MVP design
│   ├── ARCHITECTURE.md    # System design, database, API, UI
│   ├── TRUST_MODEL.md     # Reputation, vouching, arbitrators
│   ├── DISPUTE_RESOLUTION.md # Complete dispute flow, arbitrator selection
│   ├── TRADER_ONBOARDING.md  # Becoming a trader, tiers, verification
│   ├── TECHNICAL_DESIGN.md   # Data structures, protocols
│   ├── MVP_USER_STORIES.md   # User flows, acceptance criteria
│   ├── SECURITY_MODEL.md     # Bonds, rules, fraud prevention
│   ├── BOND_ESCROW.md        # Smart contract escrow design
│   ├── MVP_SECURITY.md       # Simplified security for MVP
│   ├── UX_DESIGN.md          # Interface patterns, onboarding
│   └── EXPANSION_ROADMAP.md  # Future corridors and growth plan
│
├── backend/               # Node.js coordination API
├── mobile/                # Flutter app (iOS + Android)
├── web/                   # React web app
└── admin/                 # React admin panel
```

---

## Key Design Documents

| Document | Purpose |
|----------|---------|
| `README.md` | Protocol overview, state machine, CLI commands |
| `docs/ARCHITECTURE.md` | Pure protocol design, system components, data flow |
| `docs/TRUST_MODEL.md` | Non-custodial hawala model, reputation math |
| `docs/DISPUTE_RESOLUTION.md` | Complete dispute flow, commit-reveal voting |
| `docs/TRADER_ONBOARDING.md` | Tier system, bond mechanics, anti-abuse |
| `docs/BOND_ESCROW.md` | Smart contract design, Solidity examples |
| `docs/SECURITY_MODEL.md` | Bond ratios, fraud prevention patterns |

---

## Current Status

### Completed (Design Phase)
- [x] Problem research and validation
- [x] Pure protocol model (no team custody)
- [x] Smart contract escrow design
- [x] Community arbitrator system
- [x] Trader tier system (Observer → Anchor)
- [x] Dispute resolution flow (commit-reveal voting)
- [x] MVP scope defined (UAE ↔ Cameroon corridor)

### Ready for Implementation
- [ ] Smart contracts (Solidity)
- [ ] Backend coordination API (Node.js)
- [ ] Mobile app (Flutter)
- [ ] Arbitrator registry contract
- [ ] IPFS evidence storage

### Future Phases
- [ ] CyxWiz protocol integration (E2E encrypted chat)
- [ ] DHT for decentralized trader discovery
- [ ] Mesh networking for censored regions

---

## Trader Tiers

| Tier | Bond | Max Trade | Monthly Limit | Special |
|------|------|-----------|---------------|---------|
| Observer | $0 | $0 | $0 | Browse only |
| Starter | $100-500 | $500 | $2,000 | 24h cooldown |
| Verified | $500-2k | $2,000 | $10,000 | Can vouch |
| Trusted | $2k-10k | $10,000 | $50,000 | Arbitrator eligible |
| Anchor | $10k+ | Bond amount | 5x bond | Founding member |

---

## Dispute Resolution Summary

1. **Dispute opened** → Trade locked, 5 arbitrators randomly selected
2. **Evidence period (48h)** → Both parties submit to IPFS
3. **Commit phase (24h)** → Arbitrators submit vote hashes
4. **Reveal phase (24h)** → Votes revealed, majority wins
5. **Resolution** → Smart contract executes automatically

Arbitrators stake 500+ USDT. Corrupt voting = stake slashed.

---

## Design Decisions

### Why Smart Contracts (Not MPC)?
- MPC nodes are humans, humans can collude
- Smart contracts have no admin keys
- Team can't steal because we have no access
- Immutable, auditable, verifiable

### Why Community Arbitrators?
- Fiat can't be verified on-chain
- Someone must attest to off-chain payments
- Staked arbitrators have skin in the game
- Random selection prevents pre-bribery

### Why Trader Tiers?
- Prevents rapid volume abuse (money laundering)
- Builds trust gradually through trade history
- Higher stakes for higher limits
- Time gates prevent fast-tracking

---

## Terminology

| Term | Definition |
|------|------------|
| **Non-custodial** | Smart contract holds funds, no human access |
| **Socially enforced** | Humans judge, but with economic stakes |
| **Bond** | Security deposit, forfeited on scam |
| **Escrow** | USDT locked in contract during trade |
| **Arbitrator** | Staked community member who votes on disputes |
| **Vouch** | Endorsing a new trader (reputation stake) |
| **Slash** | Automatic bond deduction for rule violation |

---

## Git Commit Info

- **Code by:** code3hr (https://github.com/code3hr)
- **Author:** cyxwiz-team
- **Repo:** https://github.com/Nerd-Inc/cyxtrade

---

## MVP Scope

**Corridor:** UAE (AED) ↔ Cameroon (XAF)

**Included:**
- 5-10 vetted traders
- Fixed trade sizes
- Smart contract escrow on Tron (USDT-TRC20)
- Mobile app + CLI
- Community arbitration

**Excluded:**
- Multi-chain support (MVP = Tron only)
- Algorithmic pricing
- Anonymous order books
- Mesh networking

---

## Commands

```bash
# Backend
cd backend
npm install
npm run dev

# Mobile
cd mobile
flutter pub get
flutter run

# Protocol (CyxWiz)
cmake -B build
cmake --build build
```

---

## Related Projects

- **CyxWiz Protocol** - Base mesh networking protocol (`../`)
- **CyxChat** - P2P messaging on CyxWiz (future integration for E2E chat)

---

*Last updated: 2025-02*
