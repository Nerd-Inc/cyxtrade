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

CyxTrade offers **two trading modes** to serve different user needs:

### CyxTrade (Basic Mode)
**Users don't need crypto. Traders stake bonds. Backend handles on-chain.**

Key components:
1. **Users** - Just use the app, no wallet needed
2. **Traders** - Deposit USDT bonds to smart contract
3. **Backend** - Creates trades on-chain on behalf of users
4. **Smart Contract** - Holds trader bonds, locks per trade
5. **Arbitrators** - Staked humans resolve disputes

### CyxTrade Pro (Advanced Mode)
**Binance-style P2P trading with user wallets and escrow.**

Key components:
1. **Users** - Have their own crypto wallets on the platform
2. **Escrow** - User's crypto is locked as collateral (no bonds needed)
3. **P2P Ads** - Users create buy/sell ads with custom prices
4. **Direct Trading** - Peer-to-peer without intermediary traders

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
├── contracts/             # Solidity smart contracts (Tron)
│   ├── contracts/         # Contract source files
│   │   ├── CyxTradeEscrow.sol      # Main escrow contract
│   │   ├── ArbitratorRegistry.sol  # Arbitrator staking
│   │   └── DisputeResolution.sol   # Dispute voting
│   ├── migrations/        # Deployment scripts
│   └── tronbox.js         # TronBox configuration
│
├── backend/               # Node.js coordination API
│   └── src/
│       ├── routes/        # API routes
│       │   ├── auth.ts, trades.ts, traders.ts, uploads.ts
│       │   └── pro/       # CyxTrade Pro routes
│       │       ├── index.ts, ads.ts, orders.ts, wallet.ts
│       ├── services/      # Business logic
│       │   ├── db.ts, blockchainService.ts
│       │   ├── walletService.ts      # Pro wallet operations
│       │   └── p2pOrderService.ts    # Pro order/escrow logic
│       ├── middleware/    # Auth, error handling
│       └── utils/         # errors.ts, response.ts
│
├── mobile/                # Flutter app (iOS + Android)
│   └── lib/
│       ├── screens/       # UI screens
│       ├── providers/     # State management
│       ├── services/      # API, socket, connectivity, storage
│       ├── utils/         # Error utilities
│       └── widgets/       # Reusable widgets (error_display, offline_banner)
│
├── web/                   # React web app (Vite + React 19)
│   └── src/
│       ├── pages/         # Page components
│       │   ├── AppHome.tsx, Login.tsx, SendMoney.tsx, etc.
│       │   ├── ProMarketplace.tsx    # Pro P2P marketplace
│       │   ├── ProWallet.tsx         # Pro wallet management
│       │   ├── ProOrders.tsx         # Pro order list
│       │   ├── ProOrderDetails.tsx   # Pro order details
│       │   ├── ProTrade.tsx          # Start trade from ad
│       │   └── PostAd.tsx            # Post ad wizard
│       ├── store/         # Zustand stores
│       │   ├── auth.ts, trade.ts, trader.ts
│       │   └── pro.ts     # Pro stores (wallet, ads, orders)
│       └── router.tsx     # React Router config
│
└── admin/                 # React admin panel
```

---

## Key Design Documents

| Document | Purpose |
|----------|---------|
| `README.md` | Protocol overview, state machine, CLI commands |
| `docs/ARCHITECTURE.md` | Pure protocol design, system components, data flow |
| `docs/AUTHENTICATION.md` | Keypair auth, challenge-response, key backup/recovery |
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

### Completed (Implementation)
- [x] Backend API with structured error handling
- [x] Mobile app screens (auth, send, trade, trader dashboard)
- [x] Real-time chat with Socket.IO
- [x] Trader payment methods and image uploads
- [x] Comprehensive error handling and recovery system
- [x] Smart contracts deployed (Shasta testnet)
- [x] Backend blockchain service integration
- [x] **CyxTrade Pro** - Advanced P2P trading mode
  - [x] Wallet system (balances, deposits, withdrawals)
  - [x] P2P ads (create, update, delete, browse)
  - [x] P2P orders with escrow (lock, release, refund)
  - [x] Pro frontend (React + Zustand)

### Smart Contracts (Shasta Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| CyxTradeEscrow | `TGVHmzTU5xvM3KJ9SUMpJM3WST3FMNQPzm` | Holds trader bonds |
| ArbitratorRegistry | `TG5FQEiDTSJKYKCf44GnkpckvazBNabbxo` | Arbitrator staking |
| DisputeResolution | `TKvov2ThwCmxQ2RrFbZi5nMYJNKrLYoPAM` | Dispute voting |
| MockUSDT | `TEUNzEw4vVEioPWGxD3kMgzN349FxC6xMn` | Test token (Shasta only) |

### Ready for Implementation
- [ ] IPFS evidence storage
- [ ] Push notifications
- [ ] Mainnet deployment

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

## CyxTrade Pro

CyxTrade Pro is the advanced P2P trading mode for users familiar with Binance P2P style trading.

### Key Differences from Basic Mode

| Feature | CyxTrade (Basic) | CyxTrade Pro |
|---------|------------------|--------------|
| **Collateral** | Trader bonds | User's crypto (escrow) |
| **Wallet** | Not needed | Required |
| **Who trades** | Users ↔ Traders | Users ↔ Users |
| **Ads** | Trader corridors | User-created ads |
| **Target** | Remittance users | Crypto-savvy users |

### Pro Database Tables

| Table | Purpose |
|-------|---------|
| `supported_assets` | Crypto/fiat assets (USDT, BTC, etc.) |
| `user_wallets` | User balances (available + locked) |
| `wallet_transactions` | Deposits, withdrawals, escrow ops |
| `deposit_addresses` | User deposit addresses per asset |
| `p2p_ads` | Buy/sell advertisements |
| `p2p_orders` | Orders with escrow tracking |

### Pro API Routes (`/api/pro/`)

**Wallet Routes** (`/api/pro/wallet/`)
- `GET /assets` - List supported assets
- `GET /balances` - All wallet balances
- `GET /balance/:asset` - Single asset balance
- `POST /init/:asset` - Initialize wallet
- `GET /deposit/:asset` - Get deposit address
- `POST /withdraw` - Request withdrawal
- `DELETE /withdraw/:id` - Cancel withdrawal
- `GET /transactions` - Transaction history

**Ads Routes** (`/api/pro/ads/`)
- `GET /` - List ads with filters
- `GET /my` - User's own ads
- `POST /` - Create ad
- `PUT /:id` - Update ad
- `DELETE /:id` - Delete ad

**Orders Routes** (`/api/pro/orders/`)
- `GET /` - List orders
- `POST /` - Create order (locks escrow)
- `PUT /:id/paid` - Mark as paid
- `PUT /:id/release` - Release crypto
- `PUT /:id/cancel` - Cancel order
- `POST /:id/dispute` - Open dispute

### Pro Frontend Routes (`/pro/`)

| Route | Page | Description |
|-------|------|-------------|
| `/pro` | ProMarketplace | Browse/filter P2P ads |
| `/pro/wallet` | ProWallet | Manage balances, deposit, withdraw |
| `/pro/orders` | ProOrders | View active/past orders |
| `/pro/order/:id` | ProOrderDetails | Order actions (pay/release/cancel) |
| `/pro/trade/:id` | ProTrade | Start trade from ad |
| `/pro/post-ad` | PostAd | Multi-step ad wizard |

### Escrow Flow

```
1. Seller creates "Sell USDT" ad
2. Buyer creates order → Seller's USDT locked in escrow
3. Buyer sends fiat → Marks "Paid"
4. Seller verifies → Releases escrow to buyer
5. If dispute → Arbitrators decide

Cancel/Expire → Escrow refunded to seller
```

### Pro Store (Zustand)

```typescript
// web/src/store/pro.ts
useWalletStore    // Balances, deposits, withdrawals
useAdsStore       // P2P advertisements
useOrdersStore    // P2P orders
```

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
npm run dev          # Runs on http://localhost:3000

# Web (React)
cd web
npm install
npm run dev          # Runs on http://localhost:5173

# Mobile
cd mobile
flutter pub get
flutter run

# Protocol (CyxWiz)
cmake -B build
cmake --build build
```

### Web Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Authentication |
| `/app` | Main app home |
| `/app/send` | Send money |
| `/app/history` | Trade history |
| `/pro` | **CyxTrade Pro** marketplace |
| `/pro/wallet` | Pro wallet |
| `/pro/orders` | Pro orders |
| `/pro/post-ad` | Create P2P ad |

---

## Error Handling Architecture

### Backend Error Codes

Structured error codes for programmatic handling:

| Range | Category | Examples |
|-------|----------|----------|
| 1xxx | Validation | `1001` VALIDATION_ERROR, `1002` INVALID_PHONE, `1004` MISSING_FIELD |
| 2xxx | Auth | `2001` INVALID_TOKEN, `2002` EXPIRED_TOKEN, `2003` UNAUTHORIZED |
| 3xxx | Trade | `3001` TRADE_NOT_FOUND, `3002` INVALID_TRADE_STATE, `3003` INSUFFICIENT_BOND |
| 4xxx | Trader | `4001` TRADER_NOT_FOUND, `4002` TRADER_OFFLINE, `4003` NO_PAYMENT_METHOD |
| 5xxx | Upload | `5001` FILE_TOO_LARGE, `5002` INVALID_FILE_TYPE, `5003` UPLOAD_FAILED |
| 9xxx | Server | `9001` DATABASE_ERROR, `9002` EXTERNAL_SERVICE_ERROR, `9999` INTERNAL_ERROR |

### Key Files

**Backend:**
- `backend/src/utils/errors.ts` - ErrorCode enum and AppError class
- `backend/src/utils/response.ts` - sendSuccess/sendAppError helpers
- `backend/src/middleware/errorHandler.ts` - Global error handler + asyncHandler

**Mobile:**
- `mobile/lib/services/api_error.dart` - ApiError class with user-friendly messages
- `mobile/lib/services/connectivity_service.dart` - Offline detection
- `mobile/lib/utils/error_utils.dart` - showErrorSnackBar/showSuccessSnackBar
- `mobile/lib/widgets/error_display.dart` - ErrorDisplay widget
- `mobile/lib/widgets/offline_banner.dart` - OfflineBanner widget

### Usage Pattern

**Backend routes:**
```typescript
import { AppError, ErrorCode } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

router.post('/example', asyncHandler(async (req, res) => {
  if (!req.body.field) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Field is required', { field: 'field' });
  }
  sendSuccess(res, { result: 'ok' });
}));
```

**Mobile screens:**
```dart
import '../../utils/error_utils.dart';

try {
  await someApiCall();
  showSuccessSnackBar(context, 'Action completed');
} catch (e) {
  showErrorSnackBar(context, e, onRetry: _retryMethod);
}
```

---

## Related Projects

- **CyxWiz Protocol** - Base mesh networking protocol (`../`)
- **CyxChat** - P2P messaging on CyxWiz (future integration for E2E chat)

---

*Last updated: 2026-03*
