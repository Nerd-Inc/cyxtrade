# CyxTrade System Architecture

> Users don't need crypto. Traders deposit bonds. Backend handles on-chain.

**Core Principle:** Users just use the app. Traders stake bonds to smart contract. Backend creates trades on-chain on behalf of users.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CYXTRADE ARCHITECTURE                               │
│                                                                             │
│   USERS (No crypto needed)              TRADERS (Have wallets)              │
│   ┌──────────────────────┐              ┌──────────────────────┐            │
│   │  Mobile App          │              │  Mobile App + Wallet │            │
│   │  • Send money        │              │  • Accept trades     │            │
│   │  • Track trades      │              │  • Manage bond       │            │
│   │  • Chat with trader  │              │  • Receive payments  │            │
│   │  • Confirm receipt   │              │  • Send to recipients│            │
│   │                      │              │                      │            │
│   │  NO WALLET NEEDED    │              │  WALLET REQUIRED     │            │
│   └──────────┬───────────┘              └──────────┬───────────┘            │
│              │                                     │                        │
│              └─────────────┬───────────────────────┘                        │
│                            │                                                │
│                            ▼                                                │
│              ┌─────────────────────────────────────┐                       │
│              │          BACKEND API                │                       │
│              │                                     │                       │
│              │  • User/Trader profiles             │                       │
│              │  • Trade coordination               │                       │
│              │  • Chat relay                       │                       │
│              │  • ON-CHAIN INTERACTIONS            │◄─── Backend has       │
│              │    (creates trades, locks bonds)    │     signing key       │
│              │                                     │                       │
│              └─────────────────┬───────────────────┘                       │
│                                │                                            │
│                                ▼                                            │
│              ┌─────────────────────────────────────┐                       │
│              │       SMART CONTRACT (Tron)         │                       │
│              │                                     │                       │
│              │  • Trader bonds (USDT)              │                       │
│              │  • Trade records                    │                       │
│              │  • Bond locking/unlocking           │                       │
│              │  • Dispute state                    │                       │
│              │  • Arbitrator votes                 │                       │
│              │                                     │                       │
│              │  NO ADMIN KEYS - immutable          │                       │
│              └─────────────────────────────────────┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Who Does What

| Actor | Has Wallet? | What They Do |
|-------|-------------|--------------|
| **User** | NO | Uses app, sends fiat, confirms receipt |
| **Trader** | YES | Deposits bond, accepts trades, delivers fiat |
| **Backend** | YES (system key) | Creates trades on-chain, locks/unlocks bonds |
| **Smart Contract** | N/A | Holds trader bonds, enforces rules |

### Trade Flow

```
1. USER creates trade in app
   └── Backend calls contract.createTrade() → locks trader's bond

2. TRADER accepts in app
   └── Backend updates trade state

3. USER sends fiat to trader (off-chain bank transfer)
   └── USER clicks "I paid" in app

4. TRADER receives fiat, sends to recipient (off-chain)
   └── TRADER clicks "Delivered" in app

5. USER confirms recipient got money
   └── Backend calls contract.completeTrade() → unlocks bond

6. IF DISPUTE:
   └── Backend calls contract.openDispute()
   └── Arbitrators vote on-chain
   └── Contract executes result automatically
```

### Why Backend Holds Signing Key

Users don't have wallets, so backend must interact with blockchain:

```
OPTION A: Users have wallets (rejected)
├── Users must understand crypto
├── Gas fees for every action
├── Complex onboarding
└── Defeats "no crypto needed" goal

OPTION B: Backend signs on behalf of users (chosen)
├── Users just use app
├── Backend pays gas
├── Simple onboarding
├── Backend can't steal (contract has no admin functions)
└── Traders' funds are in contract, not backend
```

**Security:** Backend can create trades but CAN'T withdraw trader bonds. Only the trader's wallet can withdraw their own bond (when no active trades).

---

## Architecture Principles

| Principle | Implementation |
|-----------|----------------|
| **No custody** | Team never has access to funds |
| **Non-custodial escrow** | Smart contracts hold all value |
| **Mobile-first** | Design for mobile, adapt to web |
| **Graceful degradation** | If backend dies, users still have funds |
| **Transparent** | All contracts open source, verified |
| **Auditable** | On-chain activity is public |

---

## Component Architecture

### CyxChat Integration

CyxTrade uses a fork of CyxChat for in-trade messaging. Instead of building chat from scratch, we clone and modify CyxChat to work with identified users.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CYXCHAT INTEGRATION                                  │
│                                                                             │
│   CyxChat (Original)                    CyxChat-Trade (Fork)                │
│   ┌─────────────────────┐              ┌─────────────────────┐              │
│   │ • True anonymity    │    clone     │ • Identified users  │              │
│   │ • CyxWiz protocol   │ ──────────►  │ • Trade-linked      │              │
│   │ • No identity       │   modify     │ • Dispute evidence  │              │
│   │ • Ephemeral         │              │ • Stored history    │              │
│   └─────────────────────┘              └─────────────────────┘              │
│                                                 │                           │
│                                                 ▼                           │
│                                        ┌─────────────────────┐              │
│                                        │    CyxTrade App     │              │
│                                        │  (trading + chat)   │              │
│                                        └─────────────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What We Keep from CyxChat:**
- Chat UI components
- Message handling logic
- Real-time updates
- Media sharing (payment screenshots)
- Typing indicators
- Read receipts

**What We Modify:**
- Remove/bypass anonymous identity layer
- Link messages to user profiles
- Link conversations to trades
- Store chat history for dispute evidence
- Add trade-specific UI (payment confirmed button, etc.)

**CyxChat Modes:**

| Feature | Anonymous Mode (Standalone) | Identified Mode (CyxTrade) |
|---------|----------------------------|---------------------------|
| Identity | None | User/Trader profile |
| Storage | Ephemeral | Stored for disputes |
| CyxWiz | Full protocol | Optional (Phase 2+) |
| Encryption | E2E via CyxWiz | TLS (MVP) → E2E (later) |
| Accountability | None | Full (ratings, disputes) |

**MVP Chat (Simple):**
- WebSocket-based, built into Node.js backend
- Messages stored in PostgreSQL
- No CyxWiz dependency

**Future Chat (CyxWiz Integration):**
- Full E2E encryption via CyxWiz
- Decentralized message routing
- Optional anonymity for non-trade conversations

---

### 1. Client Applications

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATIONS                                │
│                                                                             │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│   │   MOBILE APP    │   │    WEB APP      │   │  ADMIN PANEL    │          │
│   │  (Flutter)      │   │   (React)       │   │   (React)       │          │
│   │                 │   │                 │   │                 │          │
│   │ • iOS           │   │ • Desktop       │   │ • Founders only │          │
│   │ • Android       │   │ • Mobile web    │   │ • Disputes      │          │
│   │ • Primary app   │   │ • Secondary     │   │ • Traders       │          │
│   │                 │   │                 │   │ • Bonds         │          │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘          │
│                                                                             │
│   SHARED:                                                                   │
│   • Same API                                                                │
│   • Same data models                                                        │
│   • Same business logic                                                     │
│   • Real-time updates via WebSocket                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Backend Services

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND SERVICES                                  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        API GATEWAY                                   │  │
│   │                                                                      │  │
│   │  • Route requests to services                                       │  │
│   │  • JWT authentication                                               │  │
│   │  • Rate limiting                                                    │  │
│   │  • Request logging                                                  │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│          ┌─────────────────────────┼─────────────────────────┐             │
│          │                         │                         │             │
│          ▼                         ▼                         ▼             │
│   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐       │
│   │    AUTH     │          │    TRADE    │          │   ADMIN     │       │
│   │   SERVICE   │          │   SERVICE   │          │   SERVICE   │       │
│   │             │          │             │          │             │       │
│   │ • Register  │          │ • Orders    │          │ • Disputes  │       │
│   │ • Login     │          │ • Matching  │          │ • Bonds     │       │
│   │ • OTP       │          │ • Trades    │          │ • Traders   │       │
│   │ • Sessions  │          │ • History   │          │ • Reports   │       │
│   │ • Profiles  │          │ • Ratings   │          │ • Config    │       │
│   └─────────────┘          └─────────────┘          └─────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      NOTIFICATION SERVICE                            │  │
│   │                                                                      │  │
│   │  • Push notifications (FCM/APNs)                                    │  │
│   │  • SMS (Twilio)                                                     │  │
│   │  • Email (SendGrid)                                                 │  │
│   │  • WebSocket real-time                                              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. Data Layer

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                       │
│                                                                             │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│   │    POSTGRES     │   │     REDIS       │   │      S3         │          │
│   │                 │   │                 │   │                 │          │
│   │ • Users         │   │ • Sessions      │   │ • Profile pics  │          │
│   │ • Traders       │   │ • OTP codes     │   │ • Evidence      │          │
│   │ • Trades        │   │ • Rate cache    │   │ • Screenshots   │          │
│   │ • Bonds         │   │ • Online status │   │ • Documents     │          │
│   │ • Disputes      │   │ • Job queues    │   │                 │          │
│   │ • Ratings       │   │                 │   │                 │          │
│   │ • History       │   │                 │   │                 │          │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. User Registration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER REGISTRATION FLOW                               │
│                                                                             │
│   USER                    APP                     SERVER                    │
│    │                       │                         │                      │
│    │  1. Enter phone       │                         │                      │
│    │ ─────────────────────►│                         │                      │
│    │                       │  2. POST /auth/otp      │                      │
│    │                       │ ───────────────────────►│                      │
│    │                       │                         │                      │
│    │                       │                         │ 3. Generate OTP      │
│    │                       │                         │    Store in Redis    │
│    │                       │                         │    Send SMS          │
│    │                       │                         │                      │
│    │  4. Receive SMS       │                         │                      │
│    │◄────────────────────────────────────────────────│ (via Twilio)        │
│    │                       │                         │                      │
│    │  5. Enter OTP         │                         │                      │
│    │ ─────────────────────►│                         │                      │
│    │                       │  6. POST /auth/verify   │                      │
│    │                       │ ───────────────────────►│                      │
│    │                       │                         │                      │
│    │                       │                         │ 7. Verify OTP        │
│    │                       │                         │    Create user       │
│    │                       │                         │    Generate JWT      │
│    │                       │                         │                      │
│    │                       │  8. JWT + user data     │                      │
│    │                       │◄───────────────────────│                      │
│    │                       │                         │                      │
│    │  9. Profile setup     │                         │                      │
│    │ ─────────────────────►│                         │                      │
│    │                       │  10. PUT /users/me      │                      │
│    │                       │ ───────────────────────►│                      │
│    │                       │                         │                      │
│    │  11. Done!            │                         │                      │
│    │◄─────────────────────│                         │                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Send Money Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SEND MONEY FLOW                                    │
│                                                                             │
│   USER (Ali)              APP                SERVER              TRADER     │
│       │                    │                    │                    │      │
│       │ 1. Select send     │                    │                    │      │
│       │───────────────────►│                    │                    │      │
│       │                    │                    │                    │      │
│       │ 2. Enter details   │                    │                    │      │
│       │   300 AED → CAM    │                    │                    │      │
│       │───────────────────►│                    │                    │      │
│       │                    │                    │                    │      │
│       │                    │ 3. GET /traders    │                    │      │
│       │                    │   ?from=AED&to=XAF │                    │      │
│       │                    │───────────────────►│                    │      │
│       │                    │                    │                    │      │
│       │                    │ 4. Trader list     │                    │      │
│       │                    │◄───────────────────│                    │      │
│       │                    │                    │                    │      │
│       │ 5. Select Mamadou  │                    │                    │      │
│       │───────────────────►│                    │                    │      │
│       │                    │                    │                    │      │
│       │                    │ 6. POST /trades    │                    │      │
│       │                    │───────────────────►│                    │      │
│       │                    │                    │                    │      │
│       │                    │                    │ 7. Create trade    │      │
│       │                    │                    │    Lock bond       │      │
│       │                    │                    │    Notify trader   │      │
│       │                    │                    │───────────────────►│      │
│       │                    │                    │                    │      │
│       │                    │                    │ 8. Accept/Decline  │      │
│       │                    │                    │◄───────────────────│      │
│       │                    │                    │                    │      │
│       │                    │ 9. Trade accepted  │                    │      │
│       │                    │    + bank details  │                    │      │
│       │                    │◄───────────────────│                    │      │
│       │                    │                    │                    │      │
│       │ 10. Send payment   │                    │                    │      │
│       │    (outside app)   │                    │                    │      │
│       │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─►│      │
│       │                    │                    │                    │      │
│       │ 11. Mark sent      │                    │                    │      │
│       │───────────────────►│                    │                    │      │
│       │                    │ 12. PUT /trades/x  │                    │      │
│       │                    │    status=sent     │                    │      │
│       │                    │───────────────────►│                    │      │
│       │                    │                    │                    │      │
│       │                    │                    │ 13. Notify         │      │
│       │                    │                    │───────────────────►│      │
│       │                    │                    │                    │      │
│       │                    │                    │ 14. Confirm + send │      │
│       │                    │                    │◄───────────────────│      │
│       │                    │                    │                    │      │
│       │                    │ 15. Delivery done  │                    │      │
│       │                    │◄───────────────────│                    │      │
│       │                    │                    │                    │      │
│       │ 16. Confirm receipt│                    │                    │      │
│       │───────────────────►│                    │                    │      │
│       │                    │ 17. PUT /trades/x  │                    │      │
│       │                    │    status=complete │                    │      │
│       │                    │───────────────────►│                    │      │
│       │                    │                    │                    │      │
│       │                    │                    │ 18. Unlock bond    │      │
│       │                    │                    │    Update ratings  │      │
│       │                    │                    │                    │      │
│       │ 19. Done! Rate     │                    │                    │      │
│       │◄───────────────────│                    │                    │      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. Dispute Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DISPUTE FLOW                                      │
│                                                                             │
│   USER               TRADER              SERVER              ADMIN          │
│     │                   │                   │                   │           │
│     │ 1. Open dispute   │                   │                   │           │
│     │──────────────────────────────────────►│                   │           │
│     │                   │                   │                   │           │
│     │                   │                   │ 2. Create dispute │           │
│     │                   │                   │    Freeze trade   │           │
│     │                   │                   │    Notify all     │           │
│     │                   │                   │──────────────────►│           │
│     │                   │                   │                   │           │
│     │                   │ 3. Dispute notice │                   │           │
│     │                   │◄──────────────────│                   │           │
│     │                   │                   │                   │           │
│     │ 4. Submit evidence│                   │                   │           │
│     │──────────────────────────────────────►│                   │           │
│     │                   │                   │                   │           │
│     │                   │ 5. Submit evidence│                   │           │
│     │                   │──────────────────►│                   │           │
│     │                   │                   │                   │           │
│     │                   │                   │                   │           │
│     │                   │                   │ 6. Review case    │           │
│     │                   │                   │◄──────────────────│           │
│     │                   │                   │                   │           │
│     │                   │                   │ 7. Render decision│           │
│     │                   │                   │◄──────────────────│           │
│     │                   │                   │                   │           │
│     │                   │                   │ 8. Execute:       │           │
│     │                   │                   │    Transfer bond  │           │
│     │                   │                   │    Update records │           │
│     │                   │                   │                   │           │
│     │ 9. Resolution     │ 9. Resolution     │                   │           │
│     │◄──────────────────│◄──────────────────│                   │           │
│     │                   │                   │                   │           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

```sql
-- Users (both regular users and traders)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           VARCHAR(20) UNIQUE NOT NULL,
    phone_verified  BOOLEAN DEFAULT FALSE,
    display_name    VARCHAR(100),
    avatar_url      VARCHAR(500),
    is_trader       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Trader profiles (extends users)
CREATE TABLE traders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    status          VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended
    bond_amount     DECIMAL(12,2) DEFAULT 0,
    bond_locked     DECIMAL(12,2) DEFAULT 0,
    corridors       JSONB, -- [{from: 'AED', to: 'XAF', buy_rate: 163, sell_rate: 160}]
    rating          DECIMAL(3,2) DEFAULT 0,
    total_trades    INTEGER DEFAULT 0,
    approved_at     TIMESTAMP,
    approved_by     UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Trades
CREATE TABLE trades (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),      -- sender
    trader_id       UUID REFERENCES traders(id),    -- facilitator

    -- Amounts
    send_currency   VARCHAR(3) NOT NULL,            -- AED
    send_amount     DECIMAL(12,2) NOT NULL,         -- 300
    receive_currency VARCHAR(3) NOT NULL,           -- XAF
    receive_amount  DECIMAL(12,2) NOT NULL,         -- 48900
    rate            DECIMAL(12,6) NOT NULL,         -- 163

    -- Recipient
    recipient_name  VARCHAR(100),
    recipient_phone VARCHAR(20),
    recipient_method VARCHAR(50),                   -- orange_money, bank, etc.

    -- Status
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, accepted, paid, delivering, completed, disputed, cancelled
    bond_locked     DECIMAL(12,2),                  -- amount of bond backing this trade

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW(),
    accepted_at     TIMESTAMP,
    paid_at         TIMESTAMP,
    delivered_at    TIMESTAMP,
    completed_at    TIMESTAMP,

    -- Payment details
    payment_reference VARCHAR(100),
    payment_proof_url VARCHAR(500)
);

-- Disputes
CREATE TABLE disputes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id        UUID REFERENCES trades(id),
    opened_by       UUID REFERENCES users(id),
    reason          TEXT,
    status          VARCHAR(20) DEFAULT 'open',     -- open, reviewing, resolved
    resolution      VARCHAR(20),                    -- favor_user, favor_trader, split
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMP,

    -- Evidence
    user_evidence   JSONB,                          -- [{type: 'screenshot', url: '...'}]
    trader_evidence JSONB,

    created_at      TIMESTAMP DEFAULT NOW()
);

-- Ratings
CREATE TABLE ratings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id        UUID REFERENCES trades(id),
    from_user_id    UUID REFERENCES users(id),
    to_trader_id    UUID REFERENCES traders(id),
    rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment         TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Bond transactions
CREATE TABLE bond_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id       UUID REFERENCES traders(id),
    type            VARCHAR(20),                    -- deposit, withdrawal, lock, unlock, forfeit
    amount          DECIMAL(12,2),
    trade_id        UUID REFERENCES trades(id),     -- if related to a trade
    dispute_id      UUID REFERENCES disputes(id),   -- if related to a dispute
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    created_by      UUID REFERENCES users(id)       -- admin who processed
);

-- Chat messages (CyxChat-Trade integration)
CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id        UUID REFERENCES trades(id) NOT NULL,
    sender_id       UUID REFERENCES users(id) NOT NULL,
    message_type    VARCHAR(20) DEFAULT 'text',     -- text, image, system
    content         TEXT,                           -- encrypted in future
    image_url       VARCHAR(500),                   -- for payment screenshots
    read_at         TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Index for fast message retrieval
CREATE INDEX idx_chat_messages_trade_id ON chat_messages(trade_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Chat typing status (stored in Redis, this is backup)
-- Redis key: typing:{trade_id}:{user_id} with 3s TTL
```

---

## API Endpoints

### Authentication

```
POST   /auth/otp              Send OTP to phone
POST   /auth/verify           Verify OTP, get JWT
POST   /auth/refresh          Refresh JWT
DELETE /auth/logout           Logout, invalidate session
```

### Users

```
GET    /users/me              Get current user profile
PUT    /users/me              Update profile
GET    /users/:id             Get user public profile
```

### Traders

```
GET    /traders               List traders (with filters)
GET    /traders/:id           Get trader details
POST   /traders/apply         Apply to become trader
GET    /traders/me            Get own trader profile
PUT    /traders/me            Update rates, corridors
PUT    /traders/me/status     Go online/offline
```

### Trades

```
POST   /trades                Create new trade request
GET    /trades                List my trades
GET    /trades/:id            Get trade details
PUT    /trades/:id/accept     Trader accepts trade
PUT    /trades/:id/decline    Trader declines trade
PUT    /trades/:id/paid       User marks payment sent
PUT    /trades/:id/delivered  Trader marks delivery done
PUT    /trades/:id/complete   User confirms receipt
PUT    /trades/:id/cancel     Cancel trade (if allowed)
```

### Disputes

```
POST   /disputes              Open dispute
GET    /disputes/:id          Get dispute details
POST   /disputes/:id/evidence Submit evidence
```

### Ratings

```
POST   /trades/:id/rating     Rate a completed trade
GET    /traders/:id/ratings   Get trader ratings
```

### Chat (CyxChat-Trade)

```
GET    /trades/:id/messages         Get chat messages for trade
POST   /trades/:id/messages         Send message
POST   /trades/:id/messages/image   Upload image (payment screenshot)
PUT    /trades/:id/messages/read    Mark messages as read
POST   /trades/:id/typing           Send typing indicator (WebSocket preferred)
```

### Admin (Founders)

```
GET    /admin/traders/pending     List pending applications
PUT    /admin/traders/:id/approve Approve trader
PUT    /admin/traders/:id/reject  Reject trader
GET    /admin/disputes            List open disputes
PUT    /admin/disputes/:id/resolve Resolve dispute
GET    /admin/bonds               Bond management
POST   /admin/bonds/:id/confirm   Confirm bond deposit
```

---

## UI Specifications

### Mobile App Screens (User)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER APP SCREENS                                    │
│                                                                             │
│  1. ONBOARDING                                                              │
│     ├── Splash screen                                                       │
│     ├── Phone entry                                                         │
│     ├── OTP verification                                                    │
│     └── Profile setup                                                       │
│                                                                             │
│  2. HOME (Main Tab)                                                         │
│     ├── Quick send section                                                  │
│     ├── Recent transfers                                                    │
│     └── Favorite traders                                                    │
│                                                                             │
│  3. SEND MONEY                                                              │
│     ├── Amount entry                                                        │
│     ├── Recipient details                                                   │
│     ├── Trader selection                                                    │
│     ├── Confirmation                                                        │
│     └── Payment instructions                                                │
│                                                                             │
│  4. TRADE DETAIL                                                            │
│     ├── Status timeline                                                     │
│     ├── Payment details                                                     │
│     ├── Chat with trader                                                    │
│     └── Actions (confirm, dispute)                                          │
│                                                                             │
│  5. HISTORY (Tab)                                                           │
│     ├── All transfers list                                                  │
│     ├── Filter by status                                                    │
│     └── Search                                                              │
│                                                                             │
│  6. PROFILE (Tab)                                                           │
│     ├── My info                                                             │
│     ├── Payment methods                                                     │
│     ├── Become a trader                                                     │
│     ├── Settings                                                            │
│     └── Help & support                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile App Screens (Trader)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TRADER APP SCREENS                                   │
│                                                                             │
│  1. DASHBOARD (Main Tab)                                                    │
│     ├── Online/offline toggle                                               │
│     ├── Bond status card                                                    │
│     ├── Today's stats                                                       │
│     └── Incoming requests                                                   │
│                                                                             │
│  2. REQUESTS                                                                │
│     ├── Pending requests list                                               │
│     ├── Request detail                                                      │
│     └── Accept/decline actions                                              │
│                                                                             │
│  3. ACTIVE TRADES                                                           │
│     ├── Current trades list                                                 │
│     ├── Trade detail + timeline                                             │
│     ├── Mark delivered action                                               │
│     └── Chat with user                                                      │
│                                                                             │
│  4. RATES (Tab)                                                             │
│     ├── My corridors list                                                   │
│     ├── Edit rates                                                          │
│     └── Add new corridor                                                    │
│                                                                             │
│  5. EARNINGS (Tab)                                                          │
│     ├── Today / week / month stats                                          │
│     ├── Trade history                                                       │
│     └── Analytics charts                                                    │
│                                                                             │
│  6. PROFILE (Tab)                                                           │
│     ├── Bond management                                                     │
│     ├── My ratings                                                          │
│     ├── Settings                                                            │
│     └── Help & support                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Screen Wireframes

#### Home Screen (User)

```
┌─────────────────────────────────┐
│ ≡  CyxTrade            🔔      │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │      SEND MONEY           │  │
│  │                           │  │
│  │  [🇦🇪 AED ▼]  →  [🇨🇲 XAF ▼] │  │
│  │                           │  │
│  │  [      Enter amount     ]│  │
│  │                           │  │
│  │  [    Continue    ]       │  │
│  └───────────────────────────┘  │
│                                 │
│  Recent Transfers               │
│  ┌───────────────────────────┐  │
│  │ ↗ Marie (Cameroon)        │  │
│  │   300 AED · Feb 14        │  │
│  │   Completed ✓             │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ ↗ Papa (Senegal)          │  │
│  │   500 AED · Feb 10        │  │
│  │   Completed ✓             │  │
│  └───────────────────────────┘  │
│                                 │
│                                 │
├─────────────────────────────────┤
│  🏠      📋       👤            │
│  Home   History  Profile        │
└─────────────────────────────────┘
```

#### Trader Selection (User)

```
┌─────────────────────────────────┐
│ ←  Select Trader               │
├─────────────────────────────────┤
│                                 │
│  Sending: 300 AED → Cameroon   │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 👤 Mamadou          ⭐ 4.9 │  │
│  │                           │  │
│  │ 1,234 trades              │  │
│  │ Bonded: $1,000 ✓          │  │
│  │                           │  │
│  │ Rate: 1 AED = 163 XAF     │  │
│  │ Recipient gets: 48,900 XAF│  │
│  │ Delivery: ~30 min         │  │
│  │                           │  │
│  │        [ Select ]         │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 👤 Fatou            ⭐ 4.7 │  │
│  │                           │  │
│  │ 567 trades                │  │
│  │ Bonded: $500 ✓            │  │
│  │                           │  │
│  │ Rate: 1 AED = 161 XAF     │  │
│  │ Recipient gets: 48,300 XAF│  │
│  │ Delivery: ~1 hour         │  │
│  │                           │  │
│  │        [ Select ]         │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

#### Trader Dashboard

```
┌─────────────────────────────────┐
│ ≡  Trader Dashboard    ● Online│
├─────────────────────────────────┤
│                                 │
│  ┌─────────────┬─────────────┐  │
│  │ BOND        │ TODAY       │  │
│  │             │             │  │
│  │ $1,000      │ 8 trades    │  │
│  │ total       │ $2,400 vol  │  │
│  │             │             │  │
│  │ $600        │ ~$36        │  │
│  │ available   │ earned      │  │
│  └─────────────┴─────────────┘  │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Incoming Requests (2)          │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 🆕 Ali · 300 AED → XAF    │  │
│  │    12 trades · 100%       │  │
│  │                           │  │
│  │  [Accept]    [Decline]    │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 🆕 Yusuf · 150 AED → XAF  │  │
│  │    5 trades · 100%        │  │
│  │                           │  │
│  │  [Accept]    [Decline]    │  │
│  └───────────────────────────┘  │
│                                 │
│  Active Trades (3)     [View →]│
│                                 │
├─────────────────────────────────┤
│  📊      💵      📈      👤    │
│  Dash   Trades  Rates  Profile │
└─────────────────────────────────┘
```

---

## Real-Time Features

### WebSocket Events

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WEBSOCKET EVENTS                                    │
│                                                                             │
│  USER EVENTS:                                                               │
│  ├── trade.accepted      Trader accepted your request                      │
│  ├── trade.declined      Trader declined your request                      │
│  ├── trade.delivered     Trader marked delivery done                       │
│  ├── dispute.update      Dispute status changed                            │
│  ├── chat.message        New chat message                                  │
│  ├── chat.typing         Trader is typing                                  │
│  └── chat.read           Trader read your message                          │
│                                                                             │
│  TRADER EVENTS:                                                             │
│  ├── request.new         New trade request                                 │
│  ├── trade.paid          User marked payment sent                          │
│  ├── trade.confirmed     User confirmed receipt                            │
│  ├── dispute.opened      User opened dispute                               │
│  ├── chat.message        New chat message                                  │
│  ├── chat.typing         User is typing                                    │
│  └── chat.read           User read your message                            │
│                                                                             │
│  ADMIN EVENTS:                                                              │
│  ├── trader.applied      New trader application                            │
│  ├── dispute.opened      New dispute to review                             │
│  └── bond.deposited      Trader deposited bond                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT (MVP)                                     │
│                                                                             │
│                         ┌─────────────────┐                                 │
│                         │   CLOUDFLARE    │                                 │
│                         │      CDN        │                                 │
│                         └────────┬────────┘                                 │
│                                  │                                          │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         RAILWAY / RENDER                             │   │
│  │                                                                      │   │
│  │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │   │
│  │   │   API        │    │  Postgres    │    │    Redis     │         │   │
│  │   │   Server     │    │   Database   │    │    Cache     │         │   │
│  │   │   (Node.js)  │    │              │    │              │         │   │
│  │   └──────────────┘    └──────────────┘    └──────────────┘         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  EXTERNAL SERVICES:                                                         │
│  ├── Twilio (SMS)                                                          │
│  ├── Firebase (Push notifications)                                         │
│  ├── AWS S3 (File storage)                                                 │
│  └── Sentry (Error tracking)                                               │
│                                                                             │
│  MOBILE APPS:                                                               │
│  ├── iOS: App Store                                                        │
│  └── Android: Play Store                                                   │
│                                                                             │
│  WEB APP:                                                                   │
│  └── Vercel / Netlify                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Measures

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY                                          │
│                                                                             │
│  AUTHENTICATION:                                                            │
│  ├── Phone OTP verification                                                │
│  ├── JWT tokens (short-lived access + long-lived refresh)                  │
│  ├── Device fingerprinting                                                 │
│  └── Session management in Redis                                           │
│                                                                             │
│  DATA PROTECTION:                                                           │
│  ├── HTTPS everywhere                                                       │
│  ├── Database encryption at rest                                           │
│  ├── PII encryption (phone numbers, etc.)                                  │
│  └── Secure file uploads (signed URLs)                                     │
│                                                                             │
│  API SECURITY:                                                              │
│  ├── Rate limiting                                                          │
│  ├── Input validation                                                       │
│  ├── SQL injection prevention (parameterized queries)                      │
│  └── CORS configuration                                                    │
│                                                                             │
│  MONITORING:                                                                │
│  ├── Error tracking (Sentry)                                               │
│  ├── Request logging                                                        │
│  ├── Anomaly detection                                                     │
│  └── Admin audit logs                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack Summary

| Layer | Technology | Reasoning |
|-------|------------|-----------|
| **Smart Contracts** | Solidity (EVM) | Industry standard, auditable |
| **Chains** | Tron, Ethereum, Polygon | USDT liquidity, low fees |
| **Mobile App** | Flutter | One codebase for iOS + Android |
| **Web App** | React | Large ecosystem, fast development |
| **Coordination API** | Node.js + Express | Fast to build (NO CUSTODY) |
| **Database** | PostgreSQL | Profiles, chat (NOT funds) |
| **Cache** | Redis | Sessions, real-time |
| **Evidence Storage** | IPFS | Decentralized, permanent |
| **Push** | Firebase | Notifications |
| **Protocol Layer** | C (CyxWiz) | Future: mesh networking, privacy |

**Key distinction:** Funds are ONLY in smart contracts. Backend is coordination only.

---

## CyxWiz Integration Path

CyxTrade uses smart contracts for custody. CyxWiz adds privacy and decentralization:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CYXWIZ INTEGRATION ROADMAP                             │
│                                                                             │
│  PHASE 1: MVP (Current)                                                     │
│  ├── Smart contract escrow (Tron/Ethereum/Polygon)                         │
│  ├── Backend for coordination (no custody)                                 │
│  ├── PostgreSQL for profiles/chat                                          │
│  ├── Community arbitrators (on-chain voting)                               │
│  └── Already non-custodial - team can't steal                              │
│                                                                             │
│  PHASE 2: Privacy Layer                                                     │
│  ├── E2E encrypted chat (CyxWiz X25519)                                    │
│  ├── Server can't read messages                                            │
│  ├── Trade details encrypted                                               │
│  └── Only parties + arbitrators can see evidence                           │
│                                                                             │
│  PHASE 3: Decentralized Coordination                                        │
│  ├── DHT for trader discovery                                              │
│  ├── P2P trade matching (no central server)                                │
│  ├── Onion routing for anonymity                                           │
│  └── Backend becomes optional, not required                                │
│                                                                             │
│  PHASE 4: Full Protocol                                                     │
│  ├── Works without any central infrastructure                              │
│  ├── Mesh networking for censored regions                                  │
│  ├── LoRa/Bluetooth for offline areas                                      │
│  └── Truly unstoppable P2P exchange                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What CyxWiz Provides:**

| CyxWiz Feature | Phase | Purpose |
|----------------|-------|---------|
| X25519 key exchange | 2 | E2E encrypted chat |
| Onion routing | 3 | Anonymous trade discovery |
| DHT | 3 | Decentralized peer/trader lookup |
| Mesh networking | 4 | Direct P2P, bypass internet |
| MPC crypto | Future | Alternative to smart contracts |

**Note:** Phase 1 is already non-custodial via smart contracts. CyxWiz adds privacy and resilience.

---

## Next Steps

1. [ ] Finalize tech stack decisions
2. [ ] Set up project repositories
3. [ ] Clone CyxChat and create CyxChat-Trade fork
4. [ ] Design database schema in detail
5. [ ] Build API server
6. [ ] Build mobile app (with chat integration)
7. [ ] Build web app
8. [ ] Build admin panel
9. [ ] Testing
10. [ ] Deploy MVP
