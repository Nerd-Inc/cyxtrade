# CyxTrade Implementation Reference

> Technical documentation for the actual codebase structure.

---

## Project Structure

```
cyxtrade/
├── backend/              # Node.js API server
├── mobile/               # Flutter app (iOS/Android/Desktop/Web)
├── web/                  # React landing page
├── admin/                # React admin panel
├── contracts/            # Solidity smart contracts
├── shared/               # Shared types/utils
├── docs/                 # Documentation
│   ├── ARCHITECTURE.md   # High-level design
│   ├── IMPLEMENTATION.md # This file - code reference
│   └── ...
├── CLAUDE.md             # Project context
└── README.md             # Public readme
```

---

## Backend (`backend/`)

### Directory Structure

```
backend/
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript config
├── src/
│   ├── index.ts              # Entry point - Express + Socket.IO setup
│   │
│   ├── config/               # Configuration
│   │   ├── database.ts       # PostgreSQL connection config
│   │   └── redis.ts          # Redis connection config
│   │
│   ├── routes/               # API endpoints
│   │   ├── auth.ts           # /api/auth - Login, OTP, JWT
│   │   ├── users.ts          # /api/users - User profiles
│   │   ├── traders.ts        # /api/traders - Trader discovery & management
│   │   ├── trades.ts         # /api/trades - Trade lifecycle
│   │   ├── chat.ts           # /api/chat - Real-time messaging
│   │   ├── uploads.ts        # /api/uploads - File uploads (evidence)
│   │   ├── keys.ts           # /api/keys - E2E key exchange
│   │   ├── relay.ts          # /api/relay - Offline message queue
│   │   ├── bootstrap.ts      # /api/bootstrap - P2P peer discovery
│   │   └── admin.ts          # /api/admin - Admin operations
│   │
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts           # JWT validation, user extraction
│   │   ├── errorHandler.ts   # Global error handler + asyncHandler
│   │   └── upload.ts         # Multer file upload config
│   │
│   ├── services/             # Business logic
│   │   ├── db.ts             # PostgreSQL queries + schema init
│   │   ├── userService.ts    # User CRUD operations
│   │   ├── traderService.ts  # Trader management
│   │   ├── tradeService.ts   # Trade state machine
│   │   ├── paymentMethodService.ts  # Payment method CRUD
│   │   ├── uploadService.ts  # File handling
│   │   ├── socket.ts         # Socket.IO event handlers
│   │   ├── crypto.ts         # E2E encryption (TweetNaCl)
│   │   └── blockchainService.ts  # Smart contract interactions
│   │
│   ├── utils/                # Utilities
│   │   ├── errors.ts         # ErrorCode enum + AppError class
│   │   └── response.ts       # sendSuccess/sendAppError helpers
│   │
│   └── scripts/
│       └── seed.ts           # Database seeding
│
└── scripts/
    ├── test-realtime.js      # WebSocket testing
    └── test-realtime-dual.js # Dual client WebSocket testing
```

### Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP server |
| `socket.io` | WebSocket for real-time |
| `pg` | PostgreSQL client |
| `redis` | Redis client |
| `jsonwebtoken` | JWT auth |
| `bcryptjs` | Password hashing |
| `multer` | File uploads |
| `sharp` | Image processing |
| `tweetnacl` | E2E encryption (X25519, XSalsa20) |
| `helmet` | Security headers |
| `cors` | Cross-origin requests |
| `morgan` | Request logging |

### Commands

```bash
cd backend

npm install          # Install dependencies
npm run dev          # Development with hot reload
npm run build        # Compile TypeScript
npm start            # Production server
npm run seed         # Seed database
npm run test:realtime  # Test WebSocket
```

### Environment Variables

```bash
# .env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/cyxtrade
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
CORS_ORIGIN=*
UPLOAD_DIR=./uploads
```

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/request-otp` | - | Send OTP to phone |
| POST | `/api/auth/verify-otp` | - | Verify OTP, get JWT |
| POST | `/api/auth/refresh` | JWT | Refresh access token |
| POST | `/api/auth/logout` | JWT | Invalidate session |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/me` | JWT | Get current user |
| PUT | `/api/users/me` | JWT | Update profile |
| GET | `/api/users/:id` | JWT | Get user by ID |

### Traders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/traders` | - | List traders (filterable) |
| GET | `/api/traders/:id` | - | Get trader details |
| POST | `/api/traders/register` | JWT | Become a trader |
| GET | `/api/traders/me` | JWT | Get own trader profile |
| PUT | `/api/traders/me` | JWT | Update trader profile |
| PUT | `/api/traders/me/status` | JWT | Go online/offline |
| GET | `/api/traders/me/payment-methods` | JWT | List payment methods |
| POST | `/api/traders/me/payment-methods` | JWT | Add payment method |
| PUT | `/api/traders/me/payment-methods/:id` | JWT | Update payment method |
| DELETE | `/api/traders/me/payment-methods/:id` | JWT | Delete payment method |

### Trades

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/trades` | JWT | Create trade |
| GET | `/api/trades` | JWT | List my trades |
| GET | `/api/trades/:id` | JWT | Get trade details |
| PUT | `/api/trades/:id/accept` | JWT | Trader accepts |
| PUT | `/api/trades/:id/decline` | JWT | Trader declines |
| PUT | `/api/trades/:id/user-paid` | JWT | User marks paid |
| PUT | `/api/trades/:id/delivered` | JWT | Trader marks delivered |
| PUT | `/api/trades/:id/complete` | JWT | User confirms receipt |
| PUT | `/api/trades/:id/cancel` | JWT | Cancel trade |
| POST | `/api/trades/:id/dispute` | JWT | Open dispute |
| POST | `/api/trades/:id/rate` | JWT | Rate trade |

### Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/chat/:tradeId/messages` | JWT | Get messages |
| POST | `/api/chat/:tradeId/messages` | JWT | Send message |
| PUT | `/api/chat/:tradeId/read` | JWT | Mark as read |

### Keys (E2E Encryption)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/keys/register` | JWT | Register public key |
| GET | `/api/keys/:userId` | JWT | Get user's public key |
| POST | `/api/keys/trade/:tradeId` | JWT | Generate trade-specific keys |

### Relay (Offline Queue)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/relay/queue` | JWT | Queue encrypted message |
| GET | `/api/relay/pending` | JWT | Get pending messages |
| DELETE | `/api/relay/pending/:messageId` | JWT | Acknowledge delivery |
| GET | `/api/relay/status` | JWT | Queue status |

### Bootstrap (P2P Discovery)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/bootstrap/register` | JWT | Register node ID |
| POST | `/api/bootstrap/heartbeat` | JWT | Keep-alive |
| GET | `/api/bootstrap/peers` | JWT | Get peer list |
| GET | `/api/bootstrap/peer/:userId` | JWT | Lookup specific peer |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/traders/pending` | JWT+Admin | Pending applications |
| PUT | `/api/admin/traders/:id/approve` | JWT+Admin | Approve trader |
| PUT | `/api/admin/traders/:id/reject` | JWT+Admin | Reject trader |
| GET | `/api/admin/disputes` | JWT+Admin | List disputes |
| PUT | `/api/admin/disputes/:id/resolve` | JWT+Admin | Resolve dispute |

### Uploads

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/uploads/image` | JWT | Upload image |
| POST | `/api/uploads/evidence` | JWT | Upload dispute evidence |

---

## Error Codes

Structured error codes for client handling:

| Range | Category | Codes |
|-------|----------|-------|
| 1xxx | Validation | `1001` VALIDATION_ERROR, `1002` INVALID_PHONE, `1003` INVALID_AMOUNT, `1004` MISSING_FIELD, `1005` INVALID_FORMAT, `1006` INVALID_OTP, `1007` OTP_EXPIRED |
| 2xxx | Auth | `2001` INVALID_TOKEN, `2002` EXPIRED_TOKEN, `2003` UNAUTHORIZED, `2004` FORBIDDEN, `2005` NOT_AUTHENTICATED |
| 3xxx | Trade | `3001` TRADE_NOT_FOUND, `3002` INVALID_TRADE_STATE, `3003` INSUFFICIENT_BOND, `3004` TRADE_EXPIRED, `3005` TRADE_ALREADY_ACCEPTED, `3006` TRADE_CANNOT_BE_CANCELLED, `3007` TRADE_ALREADY_RATED |
| 4xxx | Trader | `4001` TRADER_NOT_FOUND, `4002` TRADER_OFFLINE, `4003` NO_PAYMENT_METHOD, `4004` NOT_A_TRADER, `4005` PAYMENT_METHOD_NOT_FOUND, `4006` TRADER_ALREADY_EXISTS |
| 5xxx | Upload | `5001` FILE_TOO_LARGE, `5002` INVALID_FILE_TYPE, `5003` UPLOAD_FAILED, `5004` NO_FILE_PROVIDED |
| 6xxx | User | `6001` USER_NOT_FOUND, `6002` USER_ALREADY_EXISTS, `6003` PROFILE_UPDATE_FAILED |
| 7xxx | Crypto | `7001` KEY_NOT_FOUND, `7002` INVALID_KEY, `7003` DECRYPTION_FAILED, `7004` KEY_EXCHANGE_FAILED |
| 9xxx | Server | `9001` DATABASE_ERROR, `9002` EXTERNAL_SERVICE_ERROR, `9003` RATE_LIMITED, `9999` INTERNAL_ERROR |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": 3001,
    "message": "Trade not found",
    "details": { "tradeId": "abc123" },
    "isRetryable": false
  }
}
```

### Success Response Format

```json
{
  "success": true,
  "data": { ... }
}
```

---

## Database Schema

### Tables

```sql
-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY,
    phone           VARCHAR(20) UNIQUE NOT NULL,
    phone_verified  BOOLEAN DEFAULT TRUE,
    display_name    VARCHAR(100),
    avatar_url      VARCHAR(500),
    is_trader       BOOLEAN DEFAULT FALSE,
    is_admin        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

-- Traders
CREATE TABLE traders (
    id              UUID PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    status          VARCHAR(20),  -- pending, active, suspended
    bond_amount     DECIMAL(12,2),
    bond_locked     DECIMAL(12,2),
    corridors       JSONB,  -- [{from, to, rate}]
    rating          DECIMAL(3,2),
    total_trades    INTEGER,
    is_online       BOOLEAN,
    approved_at     TIMESTAMP,
    approved_by     UUID,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

-- Trades
CREATE TABLE trades (
    id              UUID PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    trader_id       UUID REFERENCES traders(id),
    send_currency   VARCHAR(3),
    send_amount     DECIMAL(12,2),
    receive_currency VARCHAR(3),
    receive_amount  DECIMAL(12,2),
    rate            DECIMAL(12,6),
    recipient_name  VARCHAR(100),
    recipient_phone VARCHAR(20),
    recipient_method VARCHAR(50),
    status          VARCHAR(20),  -- pending, accepted, paid, delivering, completed, disputed, cancelled
    bond_locked     DECIMAL(12,2),
    created_at      TIMESTAMP,
    accepted_at     TIMESTAMP,
    paid_at         TIMESTAMP,
    delivered_at    TIMESTAMP,
    completed_at    TIMESTAMP,
    cancelled_at    TIMESTAMP,
    payment_reference VARCHAR(100),
    payment_proof_url VARCHAR(500)
);

-- Chat Messages
CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY,
    trade_id        UUID REFERENCES trades(id),
    sender_id       UUID REFERENCES users(id),
    message_type    VARCHAR(20),  -- text, image, system
    content         TEXT,
    image_url       VARCHAR(500),
    read_at         TIMESTAMP,
    created_at      TIMESTAMP
);

-- Disputes
CREATE TABLE disputes (
    id              UUID PRIMARY KEY,
    trade_id        UUID REFERENCES trades(id),
    opened_by       UUID REFERENCES users(id),
    reason          TEXT,
    status          VARCHAR(20),  -- open, reviewing, resolved
    resolution      VARCHAR(20),  -- favor_user, favor_trader, split
    resolution_notes TEXT,
    resolved_by     UUID,
    resolved_at     TIMESTAMP,
    created_at      TIMESTAMP
);

-- Ratings
CREATE TABLE ratings (
    id              UUID PRIMARY KEY,
    trade_id        UUID REFERENCES trades(id),
    from_user_id    UUID REFERENCES users(id),
    to_trader_id    UUID REFERENCES traders(id),
    rating          INTEGER CHECK (1-5),
    comment         TEXT,
    created_at      TIMESTAMP,
    UNIQUE(trade_id, from_user_id)
);
```

### Indexes

```sql
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_trader_id ON trades(trader_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_chat_trade_id ON chat_messages(trade_id);
```

---

## Mobile App (`mobile/`)

### Directory Structure

```
mobile/
├── pubspec.yaml              # Dependencies
├── lib/
│   ├── main.dart             # App entry point
│   │
│   ├── config/               # Configuration
│   │   ├── api.dart          # API base URL
│   │   ├── router.dart       # GoRouter navigation (25+ routes)
│   │   └── theme.dart        # Light/dark themes
│   │
│   ├── providers/            # State management (Provider)
│   │   ├── auth_provider.dart
│   │   ├── trade_provider.dart
│   │   └── trader_provider.dart
│   │
│   ├── screens/              # UI screens
│   │   ├── splash_screen.dart
│   │   ├── auth/
│   │   │   ├── login_screen.dart
│   │   │   └── otp_screen.dart
│   │   ├── home/
│   │   │   └── home_screen.dart
│   │   ├── send/
│   │   │   ├── send_screen.dart
│   │   │   ├── trader_selection_screen.dart
│   │   │   └── confirm_screen.dart
│   │   ├── trade/
│   │   │   ├── trade_detail_screen.dart
│   │   │   ├── payment_instructions_screen.dart
│   │   │   ├── trade_success_screen.dart
│   │   │   ├── rate_trade_screen.dart
│   │   │   ├── dispute_screen.dart
│   │   │   └── receipt_screen.dart
│   │   ├── trader/
│   │   │   ├── become_trader_screen.dart
│   │   │   ├── trader_dashboard_screen.dart
│   │   │   ├── payment_methods_screen.dart
│   │   │   └── payment_method_form_screen.dart
│   │   ├── chat/
│   │   │   └── chat_screen.dart
│   │   ├── history/
│   │   │   └── history_screen.dart
│   │   ├── profile/
│   │   │   ├── profile_screen.dart
│   │   │   └── edit_profile_screen.dart
│   │   ├── settings/
│   │   │   └── settings_screen.dart
│   │   ├── notifications/
│   │   │   └── notifications_screen.dart
│   │   └── about/
│   │       └── about_screen.dart
│   │
│   ├── services/             # Business logic
│   │   ├── api_service.dart          # REST API client (Dio)
│   │   ├── api_error.dart            # Error handling
│   │   ├── socket_service.dart       # Socket.IO real-time
│   │   ├── storage_service.dart      # Secure local storage
│   │   ├── connectivity_service.dart # Offline detection
│   │   ├── crypto_service.dart       # E2E encryption
│   │   ├── secure_chat_service.dart  # Encrypted chat
│   │   ├── p2p_service.dart          # CyxWiz P2P layer
│   │   └── p2p_isolate.dart          # Background P2P worker
│   │
│   ├── ffi/                  # Native bindings
│   │   └── cyxwiz_bindings.dart      # Dart FFI to C
│   │
│   ├── utils/
│   │   └── error_utils.dart          # Snackbar helpers
│   │
│   └── widgets/              # Reusable components
│       ├── error_display.dart
│       └── offline_banner.dart
│
├── native/                   # C code for CyxWiz integration
│   └── src/
│       └── cyxwiz_ffi.c      # FFI bridge (800+ lines)
│
├── android/                  # Android platform
├── ios/                      # iOS platform
├── windows/                  # Windows desktop
├── macos/                    # macOS desktop
├── linux/                    # Linux desktop
└── web/                      # Web (PWA)
```

### Dependencies

| Package | Purpose |
|---------|---------|
| `provider` | State management |
| `dio` | HTTP client |
| `socket_io_client` | WebSocket real-time |
| `go_router` | Declarative routing |
| `flutter_secure_storage` | Encrypted local storage |
| `shared_preferences` | Key-value storage |
| `cryptography` | E2E encryption |
| `image_picker` | Evidence uploads |
| `cached_network_image` | Image caching |
| `timeago` | Relative timestamps |

### Commands

```bash
cd mobile

flutter pub get        # Install dependencies
flutter run            # Run on connected device
flutter run -d chrome  # Run in browser
flutter run -d windows # Run on Windows
flutter build apk      # Build Android APK
flutter build ios      # Build iOS app
```

### Navigation Routes

| Path | Screen | Description |
|------|--------|-------------|
| `/` | SplashScreen | App launch |
| `/login` | LoginScreen | Phone entry |
| `/otp` | OtpScreen | OTP verification |
| `/home` | HomeScreen | Main tab - home |
| `/history` | HistoryScreen | Main tab - history |
| `/profile` | ProfileScreen | Main tab - profile |
| `/send` | SendScreen | Enter amount |
| `/traders` | TraderSelectionScreen | Select trader |
| `/confirm` | ConfirmScreen | Confirm trade |
| `/trade/:id` | TradeDetailScreen | Trade details |
| `/payment/:tradeId` | PaymentInstructionsScreen | Payment info |
| `/trade-success` | TradeSuccessScreen | Success page |
| `/rate-trade/:tradeId` | RateTradeScreen | Rate trader |
| `/chat/:tradeId` | ChatScreen | Trade chat |
| `/dispute/:tradeId` | DisputeScreen | Open dispute |
| `/receipt/:tradeId` | ReceiptScreen | Trade receipt |
| `/trader-dashboard` | TraderDashboardScreen | Trader home |
| `/become-trader` | BecomeTraderScreen | Register as trader |
| `/trader/payment-methods` | PaymentMethodsScreen | Manage methods |
| `/trader/payment-methods/add` | PaymentMethodFormScreen | Add method |
| `/trader/payment-methods/:id/edit` | PaymentMethodFormScreen | Edit method |
| `/edit-profile` | EditProfileScreen | Edit profile |
| `/settings` | SettingsScreen | App settings |
| `/notifications` | NotificationsScreen | Notifications |
| `/about` | AboutScreen | About app |

### Architecture Pattern

```
┌─────────────────────────────────────────────────┐
│                    UI (Screens)                  │
│  Stateless/Stateful widgets, GoRouter           │
└─────────────────────┬───────────────────────────┘
                      │ context.read<Provider>()
┌─────────────────────┴───────────────────────────┐
│               Providers (State)                  │
│   AuthProvider │ TradeProvider │ TraderProvider  │
│   ChangeNotifier + notifyListeners()            │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────┐
│                  Services                        │
│  ApiService │ SocketService │ CryptoService     │
│  StorageService │ ConnectivityService │ P2P     │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────┐
│              Native FFI (CyxWiz)                 │
│         cyxwiz_bindings.dart ↔ cyxwiz_ffi.c     │
└─────────────────────────────────────────────────┘
```

---

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_trade` | `{ tradeId }` | Join trade room |
| `leave_trade` | `{ tradeId }` | Leave trade room |
| `send_message` | `{ tradeId, content, type }` | Send chat message |
| `typing` | `{ tradeId }` | Typing indicator |
| `mark_read` | `{ tradeId }` | Mark messages read |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `trade:accepted` | `{ trade }` | Trader accepted |
| `trade:declined` | `{ trade }` | Trader declined |
| `trade:paid` | `{ trade }` | User marked paid |
| `trade:delivered` | `{ trade }` | Trader delivered |
| `trade:completed` | `{ trade }` | Trade completed |
| `trade:disputed` | `{ trade }` | Dispute opened |
| `message:new` | `{ message }` | New chat message |
| `message:read` | `{ tradeId, userId }` | Messages read |
| `typing` | `{ tradeId, userId }` | User typing |

---

## E2E Encryption

### Key Exchange Flow

```
1. User registers X25519 public key
   POST /api/keys/register { publicKey: base64 }

2. For each trade, fetch counterparty's key
   GET /api/keys/:userId → { publicKey }

3. Compute shared secret (ECDH)
   sharedSecret = X25519(myPrivateKey, theirPublicKey)

4. Derive message key
   messageKey = HKDF(sharedSecret, salt, info)

5. Encrypt messages
   ciphertext = XChaCha20-Poly1305(messageKey, nonce, plaintext)
```

### Libraries Used

- **Backend:** `tweetnacl` (TweetNaCl.js)
- **Mobile:** `cryptography` (Dart)
- **Both use:** X25519 for ECDH, XSalsa20-Poly1305 / XChaCha20-Poly1305

---

## Native FFI (CyxWiz)

### Functions Exposed (`cyxwiz_ffi.c`)

```c
// Initialization
void cyxwiz_ffi_init(void);
void cyxwiz_ffi_shutdown(void);

// Transport
void* cyxwiz_ffi_transport_create(const char* bootstrap);
void cyxwiz_ffi_transport_destroy(void* transport);
void cyxwiz_ffi_transport_poll(void* transport, int timeout_ms);
void cyxwiz_ffi_transport_set_local_id(void* transport, const uint8_t* id);

// Peer table
void* cyxwiz_ffi_peer_table_create(void);
int cyxwiz_ffi_peer_table_count(void* table);
void cyxwiz_ffi_peer_table_get(void* table, int index, uint8_t* id_out);

// Discovery
void* cyxwiz_ffi_discovery_create(void* table, void* transport, const uint8_t* id);
void cyxwiz_ffi_discovery_start(void* discovery);
void cyxwiz_ffi_discovery_stop(void* discovery);
void cyxwiz_ffi_discovery_poll(void* discovery, uint64_t now_ms);

// Router
void* cyxwiz_ffi_router_create(void* table, void* transport, const uint8_t* id);
void cyxwiz_ffi_router_send(void* router, const uint8_t* dest, const uint8_t* data, int len);

// DHT
void* cyxwiz_ffi_dht_create(void* router, const uint8_t* id);
void cyxwiz_ffi_dht_find_node(void* dht, const uint8_t* target);

// Onion routing
void* cyxwiz_ffi_onion_create(void* router, const uint8_t* id);
void cyxwiz_ffi_onion_send(void* onion, void* circuit, const uint8_t* data, int len);
```

### Dart Bindings (`cyxwiz_bindings.dart`)

```dart
class CyxWizBindings {
  static void init();
  static void shutdown();

  static Pointer<Void> transportCreate(String bootstrap);
  static void transportDestroy(Pointer<Void> transport);
  static void transportPoll(Pointer<Void> transport, int timeoutMs);

  static Pointer<Void> peerTableCreate();
  static int peerTableCount(Pointer<Void> table);

  static Pointer<Void> discoveryCreate(...);
  static void discoveryStart(Pointer<Void> discovery);
  static void discoveryPoll(Pointer<Void> discovery, int nowMs);

  // ... etc
}
```

---

## Development Workflow

### Setup

```bash
# Clone repo
git clone https://github.com/Nerd-Inc/cyxtrade

# Backend
cd cyxtrade/backend
npm install
cp .env.example .env  # Configure environment
npm run dev

# Mobile (in another terminal)
cd cyxtrade/mobile
flutter pub get
flutter run
```

### Testing

```bash
# Backend
npm test                    # Unit tests
npm run test:realtime       # WebSocket tests

# Mobile
flutter test                # Unit tests
flutter drive               # Integration tests
```

### Building

```bash
# Backend
npm run build               # Compile to dist/

# Mobile
flutter build apk           # Android
flutter build ios           # iOS
flutter build web           # Web
flutter build windows       # Windows
```

---

## Smart Contracts (`contracts/`)

### Directory Structure

```
contracts/
├── CyxTradeEscrow.sol        # Main escrow - holds trader bonds
├── ArbitratorRegistry.sol    # Arbitrator staking & selection
├── DisputeResolution.sol     # Commit-reveal voting
├── interfaces/
│   └── ICyxTradeEscrow.sol   # Escrow interface
├── migrations/
│   └── 1_deploy_contracts.js # Deployment script
├── test/
│   └── CyxTradeEscrow.test.js
├── scripts/                  # Utility scripts
├── tronbox.js                # Tron configuration
├── package.json
└── README.md
```

### Contract Overview

| Contract | Lines | Purpose |
|----------|-------|---------|
| `CyxTradeEscrow.sol` | 406 | Non-custodial escrow, bond locking |
| `ArbitratorRegistry.sol` | 327 | Arbitrator staking, random selection, slashing |
| `DisputeResolution.sol` | 436 | Commit-reveal voting, evidence, resolution |

### CyxTradeEscrow.sol

**Trade State Machine:**

```
CREATED → ACCEPTED → USER_PAID → DELIVERING → COMPLETED
     ↓           ↓
 CANCELLED   DISPUTED → RESOLVED
```

**Key Functions:**

| Function | Caller | Purpose |
|----------|--------|---------|
| `depositBond(amount)` | Trader | Deposit USDT to bond |
| `withdrawBond(amount)` | Trader | Withdraw unlocked bond |
| `getAvailableBond(trader)` | View | Get unlocked bond amount |
| `createTrade(...)` | Backend | Create trade, lock bond |
| `updateTradeState(tradeId, state)` | Backend | Progress trade state |
| `completeTrade(tradeId)` | Backend | Complete, unlock bond |
| `cancelTrade(tradeId)` | Backend | Cancel (before USER_PAID) |
| `openDispute(tradeId)` | Backend | Freeze for arbitration |
| `resolveDispute(...)` | DisputeResolver | Execute resolution |

**Security Properties:**
- No admin functions (immutable)
- Backend can lock bonds but **CANNOT withdraw**
- Only trader's own wallet can withdraw their bond
- Contract address set at deployment (can't change)

### ArbitratorRegistry.sol

**Constants:**

```solidity
MIN_STAKE = 500 USDT           // Minimum to register
ARBITRATORS_PER_DISPUTE = 5    // Selected per dispute
SLASH_PERCENTAGE = 50%         // Penalty for corruption
```

**Key Functions:**

| Function | Caller | Purpose |
|----------|--------|---------|
| `register(stake)` | Anyone | Register as arbitrator (500+ USDT) |
| `addStake(amount)` | Arbitrator | Add more stake |
| `unregister()` | Arbitrator | Withdraw (if no active disputes) |
| `selectArbitrators(tradeId, count)` | DisputeContract | Random selection |
| `slash(arbitrator, reason)` | DisputeContract | Slash 50% stake |
| `reward(arbitrator, points)` | DisputeContract | Add reputation |
| `isArbitrator(address)` | View | Check if registered |
| `getActiveArbitrators()` | View | List all active |

### DisputeResolution.sol

**Dispute Timeline:**

```
Evidence (48h) → Commit (24h) → Reveal (24h) → Resolution
```

**Vote Types:**

```solidity
enum Vote {
    NONE,           // No vote
    FAVOR_USER,     // User wins → bond slashed
    FAVOR_TRADER    // Trader wins → bond returned
}
```

**Key Functions:**

| Function | Caller | Purpose |
|----------|--------|---------|
| `openDispute(tradeId, compensationAddr, arbitrators)` | Backend | Start dispute |
| `submitEvidence(tradeId, isUser, ipfsHash)` | Backend | Submit evidence |
| `commitVote(tradeId, commitment)` | Arbitrator | Hash of vote+nonce |
| `revealVote(tradeId, vote, nonce)` | Arbitrator | Reveal actual vote |
| `finalizeDispute(tradeId)` | Anyone | Force resolution after deadline |
| `getCurrentPhase(tradeId)` | View | Check dispute phase |
| `getEvidence(tradeId)` | View | Get IPFS hashes |

### Contract Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  (Creates trades, updates states, submits evidence)             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ CyxTradeEscrow│ │ArbitratorReg. │ │DisputeResolut.│
│               │ │               │ │               │
│ • Bonds       │ │ • Stakes      │ │ • Evidence    │
│ • Trades      │ │ • Selection   │ │ • Voting      │
│ • States      │ │ • Slashing    │ │ • Resolution  │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        └─────────────────┴─────────────────┘
                    USDT (TRC20)
```

### Security Model

| Actor | Lock Bonds | Withdraw Bonds | Resolve Disputes |
|-------|------------|----------------|------------------|
| **Trader** | - | YES (own only) | - |
| **Backend** | YES | NO | - |
| **Arbitrator** | - | - | Vote only |
| **Contract Owner** | - | NO | - |

### Trade Flow On-Chain

```
1. Trader deposits bond
   depositBond(1000 USDT)

2. User initiates trade (backend)
   createTrade(tradeId, trader, userId, 300, 48900, 300, timeout)
   → Locks 300 USDT from trader's bond

3. Trade progresses
   updateTradeState(tradeId, ACCEPTED)
   updateTradeState(tradeId, USER_PAID)
   updateTradeState(tradeId, DELIVERING)

4. Trade completes
   completeTrade(tradeId)
   → Unlocks 300 USDT back to trader's bond

5. OR Dispute opens
   openDispute(tradeId)
   → Arbitrators vote (commit-reveal)
   → resolveDispute(tradeId, favorUser, compensationAddr)
   → If user wins: bond sent to compensation address
   → If trader wins: bond returned to trader
```

### Deployment

```bash
cd contracts
npm install

# Set environment
export TRON_PRIVATE_KEY=your_private_key
export BACKEND_ADDRESS=your_backend_address

# Testnet (Shasta)
npm run migrate:shasta

# Mainnet
npm run migrate:mainnet

# Test
npm test
```

### Events

**CyxTradeEscrow:**
- `BondDeposited(trader, amount, totalBond)`
- `BondWithdrawn(trader, amount, remaining)`
- `TradeCreated(tradeId, trader, userId, sendAmount, receiveAmount, bondLocked)`
- `TradeStateChanged(tradeId, oldState, newState)`
- `TradeCompleted(tradeId, trader, bondUnlocked)`
- `TradeCancelled(tradeId, trader, bondUnlocked)`
- `DisputeOpened(tradeId, trader)`
- `DisputeResolved(tradeId, favorUser, bondSlashed)`

**ArbitratorRegistry:**
- `ArbitratorRegistered(arbitrator, stake)`
- `ArbitratorUnregistered(arbitrator, stakeReturned)`
- `ArbitratorSlashed(arbitrator, amount, reason)`
- `ArbitratorRewarded(arbitrator, reputation)`

**DisputeResolution:**
- `DisputeCreated(tradeId, arbitrators, evidenceDeadline, commitDeadline, revealDeadline)`
- `EvidenceSubmitted(tradeId, isUser, ipfsHash)`
- `VoteCommitted(tradeId, arbitrator)`
- `VoteRevealed(tradeId, arbitrator, vote)`
- `DisputeResolved(tradeId, outcome, userVotes, traderVotes)`

---

## Web Landing Page (`web/`)

Marketing/landing page with dark mode support.

### Directory Structure

```
web/
├── package.json              # React 19, Vite 7, Tailwind 4
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript config
├── eslint.config.js          # ESLint config
├── src/
│   ├── main.tsx              # Entry point
│   ├── index.css             # Tailwind imports
│   └── App.tsx               # All components (~600 lines)
└── public/
    └── logo.png              # App logo
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 19.2.0 | UI framework |
| `react-dom` | 19.2.0 | React DOM |
| `vite` | 7.2.4 | Build tool |
| `tailwindcss` | 4.1.18 | Utility CSS |
| `typescript` | 5.9.3 | Type safety |

### Components

All components in `App.tsx`:

| Component | Lines | Description |
|-----------|-------|-------------|
| `Header` | 46-142 | Fixed nav, dark mode toggle, mobile hamburger menu |
| `Hero` | 144-194 | Headline, CTAs, stats (2-3% fees, 30 min, 100% protected) |
| `Features` | 196-262 | 6 feature cards with icons |
| `HowItWorks` | 264-380 | 4-step process + savings comparison table |
| `Download` | 382-436 | App Store / Play Store buttons, web link |
| `FAQ` | 438-521 | 8 expandable accordion Q&A items |
| `Footer` | 523-589 | Navigation links, contact, copyright |

### Features

- **Dark Mode**: Toggle with localStorage persistence, respects system preference
- **Responsive**: Mobile menu, responsive grid layouts
- **Savings Comparison**: Side-by-side Traditional vs CyxTrade costs
- **Animated FAQ**: Accordion with rotation animation

### Page Sections

```
┌─────────────────────────────────────────┐
│  Header (fixed)                         │
│  [Logo] [Nav Links] [Dark Toggle] [CTA] │
├─────────────────────────────────────────┤
│  Hero                                   │
│  "Send Money Home, Without the Fees"    │
│  [Download App] [Use Web Version]       │
│  Stats: 2-3% | 30 min | 100% Protected  │
├─────────────────────────────────────────┤
│  Features (6 cards)                     │
│  Low Fees | Fast | Secure | Trusted     │
│  Easy to Use | Underserved Corridors    │
├─────────────────────────────────────────┤
│  How It Works (4 steps)                 │
│  1. Enter Amount → 2. Choose Trader     │
│  3. Pay Locally → 4. Recipient Gets Paid│
│  [Savings Comparison Table]             │
├─────────────────────────────────────────┤
│  Download (teal background)             │
│  [App Store] [Google Play]              │
├─────────────────────────────────────────┤
│  FAQ (8 questions)                      │
│  Expandable accordions                  │
├─────────────────────────────────────────┤
│  Footer                                 │
│  Product | Legal | Contact              │
└─────────────────────────────────────────┘
```

### Commands

```bash
cd web
npm install
npm run dev      # Development server (http://localhost:5173)
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

---

## Admin Panel (`admin/`)

Admin dashboard for managing traders, disputes, and system operations.

### Directory Structure

```
admin/
├── package.json              # React 19, Vite 7
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript config
├── eslint.config.js          # ESLint config
├── src/
│   ├── main.tsx              # Entry point
│   ├── index.css             # Base styles
│   ├── App.css               # Component styles
│   └── App.tsx               # Main component (placeholder)
└── public/
    └── vite.svg              # Vite logo
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 19.2.0 | UI framework |
| `react-dom` | 19.2.0 | React DOM |
| `vite` | 7.2.4 | Build tool |
| `typescript` | 5.9.3 | Type safety |

### Current Status

**Placeholder** - Currently shows Vite + React template.

### Planned Features

Based on `docs/ARCHITECTURE.md`, the admin panel will include:

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Pending Traders | `GET /api/admin/traders/pending` | Review trader applications |
| Approve Trader | `PUT /api/admin/traders/:id/approve` | Approve new traders |
| Reject Trader | `PUT /api/admin/traders/:id/reject` | Reject applications |
| Open Disputes | `GET /api/admin/disputes` | View disputes needing resolution |
| Resolve Dispute | `PUT /api/admin/disputes/:id/resolve` | Render dispute decision |
| Bond Management | `GET /api/admin/bonds` | View trader bonds |
| Confirm Deposit | `POST /api/admin/bonds/:id/confirm` | Confirm bond deposits |

### Planned Screens

```
┌─────────────────────────────────────────┐
│  Admin Dashboard                        │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Pending │ │  Open   │ │  Active │   │
│  │ Traders │ │ Disputes│ │  Bonds  │   │
│  │   12    │ │    3    │ │  $45K   │   │
│  └─────────┘ └─────────┘ └─────────┘   │
│                                         │
│  Trader Applications                    │
│  ┌─────────────────────────────────┐   │
│  │ Mamadou - $1,000 bond           │   │
│  │ Corridors: AED ↔ XAF            │   │
│  │ [Approve] [Reject] [Details]    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Open Disputes                          │
│  ┌─────────────────────────────────┐   │
│  │ Trade #abc123 - $500 AED        │   │
│  │ User: Ali | Trader: Fatou       │   │
│  │ [View Evidence] [Resolve]       │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Access Control

- **Founders Only**: Admin panel requires `is_admin: true` in user record
- **JWT Auth**: Same auth system as main API
- **Audit Log**: All admin actions logged

### Commands

```bash
cd admin
npm install
npm run dev      # Development server (http://localhost:5174)
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

---

## Web Apps Comparison

| Feature | Web (Landing) | Admin (Panel) |
|---------|---------------|---------------|
| **Status** | Complete | Placeholder |
| **Lines** | ~600 | ~35 |
| **Tailwind** | Yes | No |
| **Dark Mode** | Yes | Planned |
| **Components** | 7 | 1 |
| **Purpose** | Marketing | Management |
| **Access** | Public | Founders only |
| **Auth** | None | JWT required |

---

## Git Conventions

### Commit Messages

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: backend, mobile, web, admin, contracts, docs
```

### Branches

- `main` - Production
- `develop` - Development
- `feature/*` - New features
- `fix/*` - Bug fixes
- `release/*` - Release preparation

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - High-level design
- [TRUST_MODEL.md](./TRUST_MODEL.md) - Reputation & arbitration
- [DISPUTE_RESOLUTION.md](./DISPUTE_RESOLUTION.md) - Dispute flow
- [BOND_ESCROW.md](./BOND_ESCROW.md) - Smart contract design
- [SECURITY_MODEL.md](./SECURITY_MODEL.md) - Security measures
- [MVP_USER_STORIES.md](./MVP_USER_STORIES.md) - User flows

---

*Last updated: 2026-02-08*
