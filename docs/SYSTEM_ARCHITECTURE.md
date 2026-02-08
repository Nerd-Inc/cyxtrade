# CyxTrade System Architecture

> Complete engineering reference: every component, every flow, every data path.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [Smart Contracts](#smart-contracts)
6. [Mobile App Architecture](#mobile-app-architecture)
7. [Data Flows](#data-flows)
8. [Real-time Communication](#real-time-communication)
9. [Security Architecture](#security-architecture)
10. [Deployment](#deployment)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CYXTRADE SYSTEM                                 │
│              "Users don't need crypto. Traders stake bonds."                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────────────────┐    │
│   │ Mobile   │    │ Web      │    │ Admin    │    │ Tron Blockchain   │    │
│   │ (Flutter)│    │ (React)  │    │ (React)  │    │ (Smart Contracts) │    │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘    └─────────┬─────────┘    │
│        │               │               │                     │              │
│        └───────────────┼───────────────┘                     │              │
│                        ▼                                     │              │
│              ┌─────────────────────┐                        │              │
│              │   Backend (Node.js) │◄───────────────────────┘              │
│              │  Express + Socket.io│                                        │
│              │     Port 3000       │                                        │
│              └──────────┬──────────┘                                        │
│                         │                                                   │
│              ┌──────────┴──────────┐                                        │
│              ▼                     ▼                                        │
│     ┌────────────────┐   ┌────────────────┐                                │
│     │  PostgreSQL    │   │     Redis      │                                │
│     │   Port 5432    │   │   Port 6379    │                                │
│     │ (Users, Trades)│   │ (OTP, Sessions)│                                │
│     └────────────────┘   └────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Principle

| Actor | Role | Crypto Needed? |
|-------|------|----------------|
| **User** | Uses app to send remittance | No |
| **Trader** | Stakes bond, executes fiat transfers | Yes (wallet) |
| **Backend** | Creates trades on-chain on behalf of users | Yes (signer key) |
| **Smart Contract** | Holds bonds, enforces rules | N/A |
| **Arbitrator** | Resolves disputes via voting | Yes (staked) |

**Key insight:** Backend can lock bonds but CANNOT withdraw them. Only the trader's wallet can withdraw.

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Backend** | Node.js + Express | 18+ | REST API + WebSocket |
| **Language** | TypeScript | 5.x | Type safety |
| **Database** | PostgreSQL | 15+ | Persistent storage |
| **Cache** | Redis | 7+ | OTP, sessions, rate limiting |
| **Real-time** | Socket.io | 4.x | Live updates, chat |
| **Blockchain** | TronWeb | 5.x | Smart contract interaction |
| **Mobile** | Flutter | 3.x | iOS + Android |
| **Web** | React | 18+ | Web interface |
| **Admin** | React | 18+ | Admin panel |
| **Contracts** | Solidity | 0.8.x | Tron-compatible |

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────────────┐
│   users     │       │  traders    │       │ trader_payment_methods  │
├─────────────┤       ├─────────────┤       ├─────────────────────────┤
│ id (PK)     │◄──────│ user_id(FK) │◄──────│ trader_id (FK)          │
│ phone       │       │ bond_amount │       │ method_type             │
│ display_name│       │ bond_locked │       │ provider                │
│ is_trader   │       │ corridors   │       │ account_details...      │
│ is_admin    │       │ rating      │       └─────────────────────────┘
└──────┬──────┘       │ status      │
       │              └──────┬──────┘
       │                     │
       ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────────────────┐
│   trades    │       │   ratings   │       │    chat_messages        │
├─────────────┤       ├─────────────┤       ├─────────────────────────┤
│ id (PK)     │◄──────│ trade_id(FK)│       │ id (PK)                 │
│ user_id(FK) │       │ from_user_id│       │ trade_id (FK)           │
│ trader_id   │       │ to_trader_id│       │ sender_id (FK)          │
│ status      │       │ rating (1-5)│       │ content (encrypted)     │
│ amounts...  │       │ comment     │       │ message_type            │
└──────┬──────┘       └─────────────┘       └─────────────────────────┘
       │
       ▼
┌─────────────┐       ┌─────────────────────┐
│  disputes   │       │  dispute_evidence   │
├─────────────┤       ├─────────────────────┤
│ id (PK)     │◄──────│ dispute_id (FK)     │
│ trade_id(FK)│       │ submitted_by        │
│ opened_by   │       │ evidence_type       │
│ reason      │       │ file_url (IPFS)     │
│ status      │       └─────────────────────┘
│ resolution  │
└─────────────┘

┌─────────────────────┐
│ bond_transactions   │
├─────────────────────┤
│ id (PK)             │
│ trader_id (FK)      │
│ type (enum)         │  ← deposit, withdrawal, lock, unlock, forfeit
│ amount              │
│ balance_after       │
│ trade_id (nullable) │
│ reference           │
└─────────────────────┘
```

### Table Definitions

#### users
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           VARCHAR(20) UNIQUE NOT NULL,
    phone_verified  BOOLEAN DEFAULT false,
    display_name    VARCHAR(100),
    avatar_url      TEXT,
    is_trader       BOOLEAN DEFAULT false,
    is_admin        BOOLEAN DEFAULT false,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### traders
```sql
CREATE TABLE traders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) UNIQUE,
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, active, suspended, rejected
    bond_amount     DECIMAL(20,6) DEFAULT 0,
    bond_locked     DECIMAL(20,6) DEFAULT 0,
    corridors       JSONB DEFAULT '[]',             -- [{from, to, buyRate, sellRate}]
    rating          DECIMAL(3,2) DEFAULT 0,
    total_trades    INTEGER DEFAULT 0,
    is_online       BOOLEAN DEFAULT false,
    wallet_address  VARCHAR(50),
    approved_at     TIMESTAMP,
    approved_by     UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### trader_payment_methods
```sql
CREATE TABLE trader_payment_methods (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id           UUID REFERENCES traders(id),
    method_type         VARCHAR(20) NOT NULL,       -- bank, mobile_money
    provider            VARCHAR(50) NOT NULL,       -- orange_money, mtn_momo, emirates_nbd, etc.
    account_holder_name VARCHAR(100),
    phone_number        VARCHAR(20),
    phone_country_code  VARCHAR(5),
    bank_name           VARCHAR(100),
    account_number      VARCHAR(50),
    iban                VARCHAR(50),
    swift_code          VARCHAR(20),
    currency            VARCHAR(10) NOT NULL,
    is_primary          BOOLEAN DEFAULT false,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);
```

#### trades
```sql
CREATE TABLE trades (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id),
    trader_id           UUID REFERENCES traders(id),

    -- Amounts
    send_currency       VARCHAR(10) NOT NULL,       -- AED
    send_amount         DECIMAL(20,6) NOT NULL,     -- 1000.00
    receive_currency    VARCHAR(10) NOT NULL,       -- XAF
    receive_amount      DECIMAL(20,6) NOT NULL,     -- 163000.00
    rate                DECIMAL(20,6) NOT NULL,     -- 163.00

    -- Recipient
    recipient_name      VARCHAR(100) NOT NULL,
    recipient_phone     VARCHAR(20) NOT NULL,
    recipient_method    VARCHAR(50) NOT NULL,       -- orange_money

    -- Status
    status              VARCHAR(20) DEFAULT 'pending',
    bond_locked         DECIMAL(20,6),

    -- Payment
    payment_reference   VARCHAR(100),
    payment_proof_url   TEXT,

    -- Timestamps
    created_at          TIMESTAMP DEFAULT NOW(),
    accepted_at         TIMESTAMP,
    paid_at             TIMESTAMP,
    delivered_at        TIMESTAMP,
    completed_at        TIMESTAMP,
    cancelled_at        TIMESTAMP
);
```

#### Trade Status Values
| Status | Description |
|--------|-------------|
| `pending` | Created, waiting for trader to accept |
| `accepted` | Trader accepted, bond locked |
| `paid` | User confirmed fiat sent |
| `delivering` | Trader confirmed received, sending to recipient |
| `completed` | User confirmed recipient received |
| `disputed` | Dispute opened |
| `cancelled` | Cancelled before payment |

---

## API Reference

### Base URL
```
http://localhost:3000/api
```

### Authentication

All protected routes require:
```
Authorization: Bearer <jwt_token>
```

JWT payload:
```json
{
  "id": "user-uuid",
  "phone": "+971501234567",
  "isTrader": false,
  "iat": 1707400000,
  "exp": 1708004800
}
```

### Endpoints

#### Auth (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/otp` | No | Request OTP for phone |
| POST | `/verify` | No | Verify OTP, get JWT |
| POST | `/logout` | Yes | Invalidate session |

**POST /otp**
```json
// Request
{ "phone": "+971501234567" }

// Response
{ "success": true, "data": { "message": "OTP sent" } }
```

**POST /verify**
```json
// Request
{ "phone": "+971501234567", "otp": "123456" }

// Response
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "phone": "+971501234567",
      "displayName": "Ali",
      "isTrader": false
    }
  }
}
```

#### Users (`/api/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/me` | Yes | Get current user profile |
| PUT | `/me` | Yes | Update profile |
| GET | `/me/complete-profile` | Yes | Check if profile complete |

#### Traders (`/api/traders`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | List traders (filter by corridor) |
| GET | `/:id` | No | Get trader details |
| GET | `/me` | Yes | Get own trader profile |
| POST | `/apply` | Yes | Apply to become trader |
| POST | `/:id/bond` | Yes | Deposit bond |
| PUT | `/:id/corridors` | Yes | Update corridors |
| GET | `/:id/payment-methods` | Yes | List payment methods |
| POST | `/:id/payment-methods` | Yes | Add payment method |

**GET /traders?from=AED&to=XAF**
```json
{
  "success": true,
  "data": {
    "traders": [
      {
        "id": "uuid",
        "displayName": "Mamadou",
        "rating": 4.8,
        "totalTrades": 156,
        "isOnline": true,
        "corridors": [
          { "from": "AED", "to": "XAF", "buyRate": 162, "sellRate": 164 }
        ],
        "paymentMethods": [
          { "type": "mobile_money", "provider": "orange_money", "currency": "XAF" }
        ]
      }
    ],
    "total": 1
  }
}
```

#### Trades (`/api/trades`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Yes | Create trade |
| GET | `/` | Yes | List my trades |
| GET | `/:id` | Yes | Get trade details |
| PUT | `/:id/accept` | Yes | Accept trade (trader) |
| PUT | `/:id/decline` | Yes | Decline trade (trader) |
| PUT | `/:id/paid` | Yes | Mark paid (user) |
| PUT | `/:id/delivered` | Yes | Mark delivered (trader) |
| PUT | `/:id/complete` | Yes | Complete trade (user) |
| POST | `/:id/dispute` | Yes | Open dispute |
| POST | `/:id/rate` | Yes | Rate trader |

**POST /trades**
```json
// Request
{
  "traderId": "trader-uuid",
  "sendCurrency": "AED",
  "sendAmount": 1000,
  "receiveCurrency": "XAF",
  "receiveAmount": 163000,
  "rate": 163,
  "recipientName": "Marie Nguemo",
  "recipientPhone": "+237699123456",
  "recipientMethod": "orange_money"
}

// Response
{
  "success": true,
  "data": {
    "id": "trade-uuid",
    "status": "pending",
    "bondLocked": 165,
    "createdAt": "2024-02-08T10:00:00Z"
  }
}
```

#### Chat (`/api/chat`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/trades/:tradeId/messages` | Yes | Get messages |
| POST | `/trades/:tradeId/messages` | Yes | Send message |
| PUT | `/messages/:messageId/read` | Yes | Mark as read |

**POST /chat/trades/:tradeId/messages**
```json
// Request (E2E encrypted payload)
{
  "content": {
    "nonce": "base64-encoded-24-bytes",
    "ciphertext": "base64-encoded-encrypted-message"
  },
  "messageType": "text"
}
```

#### Admin (`/api/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/traders` | Admin | List pending traders |
| PUT | `/traders/:id/approve` | Admin | Approve trader |
| PUT | `/traders/:id/reject` | Admin | Reject trader |
| PUT | `/traders/:id/suspend` | Admin | Suspend trader |
| GET | `/disputes` | Admin | List disputes |

#### Uploads (`/api/uploads`)

| Method | Endpoint | Auth | Max Size | Types |
|--------|----------|------|----------|-------|
| POST | `/avatar` | Yes | 1MB | image/* |
| POST | `/payment-proof` | Yes | 2MB | image/* |
| POST | `/dispute-evidence` | Yes | 5MB | image/*, application/pdf |
| DELETE | `/:fileId` | Yes | - | - |

---

## Smart Contracts

### Contract Addresses (Shasta Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| CyxTradeEscrow | `TGVHmzTU5xvM3KJ9SUMpJM3WST3FMNQPzm` | Bond escrow |
| ArbitratorRegistry | `TG5FQEiDTSJKYKCf44GnkpckvazBNabbxo` | Arbitrator staking |
| DisputeResolution | `TKvov2ThwCmxQ2RrFbZi5nMYJNKrLYoPAM` | Dispute voting |
| MockUSDT | `TEUNzEw4vVEioPWGxD3kMgzN349FxC6xMn` | Test token |

### CyxTradeEscrow

```solidity
// State
mapping(address => Bond) public bonds;      // Trader bonds
mapping(bytes32 => Trade) public trades;    // Trade records

struct Bond {
    uint256 amount;     // Total deposited
    uint256 locked;     // Locked in active trades
    bool active;
}

struct Trade {
    bytes32 tradeId;
    address trader;
    bytes32 userId;         // Hashed for privacy
    uint256 sendAmount;
    uint256 receiveAmount;
    uint256 bondLocked;
    TradeState state;
    uint256 timeout;
}

enum TradeState {
    CREATED,        // 0
    ACCEPTED,       // 1
    USER_PAID,      // 2
    DELIVERING,     // 3
    COMPLETED,      // 4
    DISPUTED,       // 5
    RESOLVED,       // 6
    CANCELLED       // 7
}

// Trader functions
function depositBond(uint256 amount) external;
function withdrawBond(uint256 amount) external;

// Backend functions (can't withdraw, only manage trades)
function createTrade(
    bytes32 tradeId,
    address trader,
    bytes32 userId,
    uint256 sendAmount,
    uint256 receiveAmount,
    uint256 bondToLock,
    uint256 timeout
) external;

function updateTradeState(bytes32 tradeId, TradeState newState) external;
function completeTrade(bytes32 tradeId) external;
function cancelTrade(bytes32 tradeId) external;
function openDispute(bytes32 tradeId) external;

// Events
event BondDeposited(address trader, uint256 amount, uint256 total);
event BondWithdrawn(address trader, uint256 amount, uint256 remaining);
event TradeCreated(bytes32 tradeId, address trader, uint256 bondLocked);
event TradeCompleted(bytes32 tradeId, address trader, uint256 bondUnlocked);
event TradeStateChanged(bytes32 tradeId, TradeState oldState, TradeState newState);
event DisputeOpened(bytes32 tradeId, address trader);
event DisputeResolved(bytes32 tradeId, bool favorUser, uint256 bondSlashed);
```

### DisputeResolution

```solidity
// Timeline
// Evidence: 48 hours
// Commit:   24 hours
// Reveal:   24 hours

struct Dispute {
    bytes32 tradeId;
    address trader;
    address user;
    address[] arbitrators;      // 5 random
    Phase phase;
    uint256 evidenceDeadline;
    uint256 commitDeadline;
    uint256 revealDeadline;
    mapping(address => bytes32) commitments;
    mapping(address => Vote) votes;
    uint8 userVotes;
    uint8 traderVotes;
}

enum Vote { NONE, FAVOR_USER, FAVOR_TRADER }

function openDispute(bytes32 tradeId, address user, address[] arbitrators) external;
function submitEvidence(bytes32 tradeId, bool isUser, string ipfsHash) external;
function commitVote(bytes32 tradeId, bytes32 commitment) external;       // keccak256(vote, nonce)
function revealVote(bytes32 tradeId, Vote vote, string nonce) external;
function resolveDispute(bytes32 tradeId) external;
```

---

## Mobile App Architecture

### Directory Structure

```
mobile/lib/
├── main.dart                   # Entry point
├── config/
│   └── router.dart            # go_router navigation
├── providers/
│   ├── auth_provider.dart     # Auth state
│   ├── trade_provider.dart    # Trades state
│   └── trader_provider.dart   # Trader state
├── services/
│   ├── api_service.dart       # HTTP client (Dio)
│   ├── socket_service.dart    # WebSocket (Socket.io)
│   ├── crypto_service.dart    # E2E encryption
│   ├── storage_service.dart   # Secure storage
│   └── connectivity_service.dart
├── screens/
│   ├── auth/
│   │   ├── login_screen.dart
│   │   ├── otp_screen.dart
│   │   └── complete_profile_screen.dart
│   ├── home/
│   │   └── home_screen.dart
│   ├── send/
│   │   ├── trader_selection_screen.dart
│   │   ├── send_details_screen.dart
│   │   └── confirm_screen.dart
│   ├── trade/
│   │   ├── trade_detail_screen.dart
│   │   ├── payment_instructions_screen.dart
│   │   └── rate_screen.dart
│   ├── trader/
│   │   ├── trader_dashboard_screen.dart
│   │   └── payment_methods_screen.dart
│   └── chat/
│       └── chat_screen.dart
├── widgets/
│   ├── error_display.dart
│   └── offline_banner.dart
└── utils/
    └── error_utils.dart
```

### State Management (Provider Pattern)

```dart
// AuthProvider
class AuthProvider extends ChangeNotifier {
  User? user;
  String? token;
  bool isLoading = false;

  Future<void> requestOtp(String phone);
  Future<void> verifyOtp(String phone, String otp);
  Future<void> logout();
  Future<void> completeProfile(String name, String? avatarUrl);
}

// TradeProvider
class TradeProvider extends ChangeNotifier {
  List<Trader> traders = [];
  List<Trade> trades = [];
  Trade? currentTrade;

  Future<void> getTraders({String? from, String? to});
  Future<void> getMyTrades();
  Future<Trade> createTrade(TradeRequest request);
  Future<void> markPaid(String tradeId, {String? reference, String? proofUrl});
  Future<void> completeTrade(String tradeId);
}

// TraderProvider
class TraderProvider extends ChangeNotifier {
  Trader? myTrader;
  List<PaymentMethod> paymentMethods = [];

  Future<void> applyAsTrader(List<Corridor> corridors);
  Future<void> addPaymentMethod(PaymentMethod method);
  Future<void> acceptTrade(String tradeId);
}
```

### Navigation Flow

```
Splash
  │
  ├─► (no token) ─► Login ─► OTP ─► CompleteProfile ─► Home
  │
  └─► (has token) ─► Home
                       │
                       ├─► Send Flow
                       │     ├─► TraderSelection
                       │     ├─► SendDetails
                       │     ├─► Confirm
                       │     └─► PaymentInstructions
                       │
                       ├─► Trade Detail
                       │     ├─► Chat
                       │     ├─► Dispute
                       │     └─► Rate
                       │
                       ├─► Trader Dashboard (if trader)
                       │     ├─► PaymentMethods
                       │     └─► Corridors
                       │
                       └─► Profile
```

---

## Data Flows

### 1. User Registration

```
┌─────────┐     ┌─────────────┐     ┌───────┐     ┌────────────┐
│ Mobile  │     │   Backend   │     │ Redis │     │ PostgreSQL │
└────┬────┘     └──────┬──────┘     └───┬───┘     └──────┬─────┘
     │                 │                │                 │
     │ POST /auth/otp  │                │                 │
     │ {phone}         │                │                 │
     │────────────────►│                │                 │
     │                 │                │                 │
     │                 │ SET otp:{phone}│                 │
     │                 │ = 123456       │                 │
     │                 │ EX 300         │                 │
     │                 │───────────────►│                 │
     │                 │                │                 │
     │ {message: sent} │                │                 │
     │◄────────────────│                │                 │
     │                 │                │                 │
     │ POST /auth/verify               │                 │
     │ {phone, otp}    │                │                 │
     │────────────────►│                │                 │
     │                 │                │                 │
     │                 │ GET otp:{phone}│                 │
     │                 │───────────────►│                 │
     │                 │◄───────────────│                 │
     │                 │                │                 │
     │                 │ compare (constant-time)          │
     │                 │                │                 │
     │                 │ INSERT/SELECT user               │
     │                 │────────────────────────────────►│
     │                 │◄────────────────────────────────│
     │                 │                │                 │
     │                 │ DEL otp:{phone}│                 │
     │                 │───────────────►│                 │
     │                 │                │                 │
     │ {token, user}   │                │                 │
     │◄────────────────│                │                 │
```

### 2. Trade Creation

```
┌─────────┐     ┌─────────────┐     ┌────────────┐     ┌────────────┐
│ Mobile  │     │   Backend   │     │ PostgreSQL │     │ Blockchain │
└────┬────┘     └──────┬──────┘     └──────┬─────┘     └──────┬─────┘
     │                 │                   │                   │
     │ POST /trades    │                   │                   │
     │ {traderId,      │                   │                   │
     │  amounts...}    │                   │                   │
     │────────────────►│                   │                   │
     │                 │                   │                   │
     │                 │ SELECT trader     │                   │
     │                 │──────────────────►│                   │
     │                 │◄──────────────────│                   │
     │                 │                   │                   │
     │                 │ Check bond available                  │
     │                 │                   │                   │
     │                 │ INSERT trade      │                   │
     │                 │ (status: pending) │                   │
     │                 │──────────────────►│                   │
     │                 │◄──────────────────│                   │
     │                 │                   │                   │
     │                 │ createTradeOnChain()                  │
     │                 │──────────────────────────────────────►│
     │                 │                   │                   │
     │                 │                   │   Lock bond       │
     │                 │                   │   in contract     │
     │                 │                   │                   │
     │                 │◄──────────────────────────────────────│
     │                 │                   │   (tx confirmed)  │
     │                 │                   │                   │
     │                 │ Emit Socket.io    │                   │
     │                 │ trade:new         │                   │
     │                 │─ ─ ─ ─ ─ ─ ─ ─ ─►│                   │
     │                 │                   │                   │
     │ {trade}         │                   │                   │
     │◄────────────────│                   │                   │
```

### 3. Trade Completion

```
┌─────────┐     ┌─────────────┐     ┌────────────┐     ┌────────────┐
│ Mobile  │     │   Backend   │     │ PostgreSQL │     │ Blockchain │
└────┬────┘     └──────┬──────┘     └──────┬─────┘     └──────┬─────┘
     │                 │                   │                   │
     │ PUT /trades/:id/complete            │                   │
     │────────────────►│                   │                   │
     │                 │                   │                   │
     │                 │ BEGIN TRANSACTION │                   │
     │                 │                   │                   │
     │                 │ UPDATE trade      │                   │
     │                 │ status=completed  │                   │
     │                 │──────────────────►│                   │
     │                 │                   │                   │
     │                 │ UPDATE trader     │                   │
     │                 │ bond_locked -= X  │                   │
     │                 │ total_trades += 1 │                   │
     │                 │──────────────────►│                   │
     │                 │                   │                   │
     │                 │ COMMIT            │                   │
     │                 │                   │                   │
     │                 │ completeTradeOnChain()                │
     │                 │──────────────────────────────────────►│
     │                 │                   │                   │
     │                 │                   │   Unlock bond     │
     │                 │                   │   in contract     │
     │                 │                   │                   │
     │                 │◄──────────────────────────────────────│
     │                 │                   │                   │
     │                 │ Emit Socket.io    │                   │
     │                 │ trade:completed   │                   │
     │                 │                   │                   │
     │ {trade}         │                   │                   │
     │◄────────────────│                   │                   │
```

### 4. Dispute Flow

```
┌──────────┐  ┌──────────┐  ┌─────────────┐  ┌────────────┐  ┌──────────────┐
│   User   │  │  Trader  │  │   Backend   │  │ Blockchain │  │ Arbitrators  │
└────┬─────┘  └────┬─────┘  └──────┬──────┘  └──────┬─────┘  └──────┬───────┘
     │             │               │                │                │
     │ POST /trades/:id/dispute    │                │                │
     │────────────────────────────►│                │                │
     │             │               │                │                │
     │             │               │ openDisputeOnChain()            │
     │             │               │ + select 5 arbitrators          │
     │             │               │───────────────►│                │
     │             │               │◄───────────────│                │
     │             │               │                │                │
     │             │               │    EVIDENCE PHASE (48h)         │
     │             │               │                │                │
     │ Upload evidence (IPFS)      │                │                │
     │────────────────────────────►│                │                │
     │             │               │                │                │
     │             │ Upload evidence               │                │
     │             │──────────────►│                │                │
     │             │               │                │                │
     │             │               │    COMMIT PHASE (24h)           │
     │             │               │                │                │
     │             │               │                │  commitVote()  │
     │             │               │                │◄───────────────│
     │             │               │                │  (5 votes)     │
     │             │               │                │                │
     │             │               │    REVEAL PHASE (24h)           │
     │             │               │                │                │
     │             │               │                │  revealVote()  │
     │             │               │                │◄───────────────│
     │             │               │                │                │
     │             │               │ resolveDispute()               │
     │             │               │───────────────►│                │
     │             │               │                │                │
     │             │               │  If FAVOR_USER:│                │
     │             │               │  - Slash bond  │                │
     │             │               │  - Transfer to │                │
     │             │               │    user wallet │                │
     │             │               │                │                │
     │ Dispute resolved            │◄───────────────│                │
     │◄────────────────────────────│                │                │
```

---

## Real-time Communication

### Socket.io Events

```javascript
// Connection (with JWT auth)
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Verify JWT
  socket.user = decoded;
  next();
});

// Events
socket.on('trade:join', (tradeId) => {
  socket.join(`trade:${tradeId}`);
});

socket.on('trade:leave', (tradeId) => {
  socket.leave(`trade:${tradeId}`);
});

socket.on('chat:message', (data) => {
  // data = { tradeId, content: { nonce, ciphertext } }
  io.to(`trade:${data.tradeId}`).emit('chat:message', {
    ...data,
    senderId: socket.user.id,
    timestamp: Date.now()
  });
});

socket.on('chat:typing', (data) => {
  socket.to(`trade:${data.tradeId}`).emit('chat:typing', {
    userId: socket.user.id
  });
});

socket.on('chat:read', (data) => {
  io.to(`trade:${data.tradeId}`).emit('chat:read', {
    userId: socket.user.id,
    messageId: data.messageId
  });
});

// Server-emitted events
io.to(`user:${userId}`).emit('trade:new', trade);
io.to(`trade:${tradeId}`).emit('trade:update', trade);
io.to(`trade:${tradeId}`).emit('trade:completed', trade);
```

### Event Reference

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `trade:join` | Client → Server | `tradeId` | Join trade room |
| `trade:leave` | Client → Server | `tradeId` | Leave trade room |
| `trade:new` | Server → Client | `Trade` | New trade request (to trader) |
| `trade:update` | Server → Client | `Trade` | Trade status changed |
| `trade:completed` | Server → Client | `Trade` | Trade completed |
| `chat:message` | Bidirectional | `{tradeId, content}` | E2E encrypted message |
| `chat:typing` | Bidirectional | `{tradeId, userId}` | Typing indicator |
| `chat:read` | Bidirectional | `{tradeId, messageId}` | Read receipt |

---

## Security Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    OTP + JWT Authentication                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Phone → OTP                                             │
│     ├─ Generate: crypto.randomInt(100000, 999999)           │
│     ├─ Store: Redis SET otp:{phone} {code} EX 300           │
│     └─ Rate limit: 3/min per IP                             │
│                                                              │
│  2. OTP → JWT                                               │
│     ├─ Compare: crypto.timingSafeEqual() (prevent timing)   │
│     ├─ Max attempts: 5 (then locked)                        │
│     ├─ JWT: { id, phone, isTrader } exp=7d                  │
│     └─ Cleanup: DEL otp:{phone}, DEL otp_attempts:{phone}   │
│                                                              │
│  3. Request → Auth Middleware                               │
│     ├─ Extract: Authorization: Bearer <token>               │
│     ├─ Verify: jwt.verify(token, JWT_SECRET)                │
│     └─ Inject: req.user = { id, phone, isTrader }           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### E2E Chat Encryption

```
┌─────────────────────────────────────────────────────────────┐
│             X25519 + ChaCha20-Poly1305 Encryption           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Key Exchange (per user):                                   │
│  1. Generate X25519 keypair                                 │
│  2. POST /api/keys/my-public-key → store in DB              │
│  3. GET /api/keys/{userId} → get recipient's public key     │
│                                                              │
│  Encryption (sender):                                       │
│  1. ECDH: sharedSecret = X25519(myPrivate, theirPublic)     │
│  2. KDF: encryptionKey = HKDF(sharedSecret, "chat")         │
│  3. Encrypt: ChaCha20-Poly1305(plaintext, key, nonce)       │
│  4. Send: { nonce: base64, ciphertext: base64 }             │
│                                                              │
│  Decryption (recipient):                                    │
│  1. ECDH: sharedSecret = X25519(myPrivate, theirPublic)     │
│  2. KDF: encryptionKey = HKDF(sharedSecret, "chat")         │
│  3. Decrypt: ChaCha20-Poly1305(ciphertext, key, nonce)      │
│                                                              │
│  Properties:                                                │
│  - Server never sees plaintext                              │
│  - Forward secrecy (rotate keypairs)                        │
│  - Authenticated encryption (AEAD)                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Bond Security (Smart Contract)

```
┌─────────────────────────────────────────────────────────────┐
│                 Non-Custodial Bond Escrow                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Invariants:                                                │
│  1. Backend can LOCK bonds → cannot WITHDRAW                │
│  2. Only trader's wallet can withdraw unlocked bond         │
│  3. No admin keys, no upgradability                         │
│  4. Immutable once deployed                                 │
│                                                              │
│  Access Control:                                            │
│  ┌─────────────────────────────────────────────────┐       │
│  │ Function           │ Who Can Call              │       │
│  ├─────────────────────────────────────────────────┤       │
│  │ depositBond()      │ Trader (own wallet)       │       │
│  │ withdrawBond()     │ Trader (own wallet)       │       │
│  │ createTrade()      │ Backend (authorized)      │       │
│  │ updateTradeState() │ Backend (authorized)      │       │
│  │ completeTrade()    │ Backend (authorized)      │       │
│  │ openDispute()      │ Backend (authorized)      │       │
│  └─────────────────────────────────────────────────┘       │
│                                                              │
│  Guards:                                                    │
│  - ReentrancyGuard on withdrawBond()                        │
│  - SafeERC20 for token transfers                            │
│  - State validation modifiers                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Error Codes

| Range | Category | Examples |
|-------|----------|----------|
| 1xxx | Validation | 1001 VALIDATION_ERROR, 1004 MISSING_FIELD |
| 2xxx | Auth | 2001 INVALID_TOKEN, 2003 NOT_AUTHENTICATED |
| 3xxx | Trade | 3001 TRADE_NOT_FOUND, 3002 INVALID_STATE |
| 4xxx | Trader | 4001 TRADER_NOT_FOUND, 4003 NO_PAYMENT_METHOD |
| 5xxx | Upload | 5001 FILE_TOO_LARGE, 5002 INVALID_TYPE |
| 9xxx | Server | 9001 DATABASE_ERROR, 9999 INTERNAL_ERROR |

---

## Deployment

### Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cyxtrade

# Cache
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Blockchain
TRON_NETWORK=shasta
TRON_PRIVATE_KEY=0x...
ESCROW_CONTRACT=TGVHmzTU5xvM3KJ9SUMpJM3WST3FMNQPzm
REGISTRY_CONTRACT=TG5FQEiDTSJKYKCf44GnkpckvazBNabbxo
DISPUTE_CONTRACT=TKvov2ThwCmxQ2RrFbZi5nMYJNKrLYoPAM
USDT_CONTRACT=TEUNzEw4vVEioPWGxD3kMgzN349FxC6xMn

# Admin
ADMIN_PHONE_NUMBERS=+971501234567,+237699123456

# Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

### Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: cyxtrade-postgres
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: cyxtrade
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: cyxtrade-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Service Health Checks

| Service | Check | Expected |
|---------|-------|----------|
| Backend | `GET /health` | `{ status: "ok" }` |
| PostgreSQL | `pg_isready` | Exit 0 |
| Redis | `redis-cli ping` | `PONG` |
| Blockchain | `tronWeb.isConnected()` | `true` |

---

## Quick Reference

### Trade State Transitions

```
pending ─────────────► accepted ────────────► paid
    │                      │                    │
    │ (decline/timeout)    │ (user sends fiat)  │ (trader delivers)
    ▼                      │                    ▼
cancelled                  │               delivering
                          │                    │
                          │                    │ (user confirms)
                          │                    ▼
                          └─────────────► completed
                                              │
                          (dispute at any)    │ (rate)
                          point before        ▼
                          complete ────► disputed ────► resolved
```

### Bond Math

```
Trade: 1000 AED → 163,000 XAF @ rate 163

Bond to lock = receive_amount / 1000 (simplified)
             = 163000 / 1000
             = 163 USDT

If trader has:
  bond_amount: 1000 USDT
  bond_locked: 500 USDT
  bond_available: 500 USDT ✓ (enough for 163 USDT)

After trade created:
  bond_locked: 663 USDT
  bond_available: 337 USDT

After trade completed:
  bond_locked: 500 USDT (back to original)
  bond_available: 500 USDT
```

### API Quick Reference

```bash
# Auth
curl -X POST /api/auth/otp -d '{"phone":"+971501234567"}'
curl -X POST /api/auth/verify -d '{"phone":"+971501234567","otp":"123456"}'

# Traders
curl /api/traders?from=AED&to=XAF
curl /api/traders/uuid

# Trades
curl -H "Authorization: Bearer $TOKEN" -X POST /api/trades -d '{...}'
curl -H "Authorization: Bearer $TOKEN" /api/trades
curl -H "Authorization: Bearer $TOKEN" -X PUT /api/trades/uuid/paid
curl -H "Authorization: Bearer $TOKEN" -X PUT /api/trades/uuid/complete
```

---

*Last updated: 2026-02*
