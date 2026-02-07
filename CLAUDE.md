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

**Users don't need crypto. Traders stake bonds. Backend handles on-chain.**

Key components:
1. **Users** - Just use the app, no wallet needed
2. **Traders** - Deposit USDT bonds to smart contract
3. **Backend** - Creates trades on-chain on behalf of users
4. **Smart Contract** - Holds trader bonds, locks per trade
5. **Arbitrators** - Staked humans resolve disputes

Trade flow:
```
Ali (UAE)                      Trader                      Marie (Cameroon)
    │                             │                              │
    │ 1. Send AED to trader       │                              │
    └────────────────────────────►│                              │
                                  │ 2. Send XAF to Marie         │
                                  │─────────────────────────────►│
    │ 3. Marie confirms           │                              │
    │◄─────────────────────────────────────────────────────────────
    │ 4. Ali closes trade         │                              │
    └────────────────────────────►│                              │
```

---

## Critical Design Distinction

**Users don't need crypto:**
- Users just use the app - no wallet, no gas fees
- Backend creates trades on-chain on their behalf
- Backend has signing key but CAN'T withdraw trader bonds

**Traders stake bonds:**
- Traders deposit USDT to smart contract
- Bond locked when accepting a trade
- If trader scams → bond slashed, user compensated

**Disputes are human:**
- Fiat can't be verified on-chain
- Arbitrators review evidence and vote
- Smart contract executes the result automatically

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Smart Contracts** | Solidity (Tron) | Holds trader bonds |
| **Backend API** | Node.js / TypeScript | Trade coordination, on-chain interactions |
| **Mobile App** | Flutter | User interface (no wallet needed) |
| **Database** | PostgreSQL + Redis | Profiles, trades, chat |
| **Evidence** | IPFS | Dispute evidence storage |

**Key insight:**
- Users = App only, no crypto
- Traders = Have wallets, deposit bonds
- Backend = Creates trades, can't steal bonds

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
