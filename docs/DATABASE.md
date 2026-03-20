# CyxTrade Unified Database Schema

> Unified schema for CyxTrade Lite (fiat-to-fiat remittance) and Pro (P2P crypto exchange)

---

## Design Principles

1. **No Redundancy** - Single tables serve both modes where possible
2. **Mode Column** - `mode: 'lite' | 'pro'` distinguishes behavior
3. **Nullable Fields** - Mode-specific fields are nullable
4. **Shared Infrastructure** - Users, traders, payment methods are universal
5. **Scalable** - Indexes on high-query fields, proper foreign keys

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE ENTITIES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐         ┌──────────┐         ┌─────────────────────────┐     │
│  │  users   │────────▶│ traders  │────────▶│ trader_payment_methods  │     │
│  └──────────┘  1:1    └──────────┘  1:N    └─────────────────────────┘     │
│       │                    │                           │                    │
│       │                    │                           │                    │
│       │               ┌────┴────┐                      │                    │
│       │               │         │                      │                    │
│       │               ▼         ▼                      ▼                    │
│       │          ┌────────┐ ┌─────────────────────────────┐                │
│       │          │  ads   │ │    ad_payment_methods       │                │
│       │          └────────┘ └─────────────────────────────┘                │
│       │               │                                                     │
│       │               │ 1:N                                                 │
│       │               ▼                                                     │
│       │          ┌──────────┐                                              │
│       └─────────▶│  orders  │◀─────────────────────────────────────────┐   │
│            1:N   └──────────┘                                          │   │
│                       │                                                │   │
│         ┌─────────────┼─────────────┬─────────────┐                   │   │
│         │             │             │             │                   │   │
│         ▼             ▼             ▼             ▼                   │   │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │   │
│    │ messages │ │ feedback │ │ disputes │ │ evidence │               │   │
│    └──────────┘ └──────────┘ └──────────┘ └──────────┘               │   │
│                                                                       │   │
├───────────────────────────────────────────────────────────────────────┼───┤
│                         PRO-ONLY ENTITIES                             │   │
├───────────────────────────────────────────────────────────────────────┼───┤
│                                                                       │   │
│  ┌──────────────────┐     ┌──────────────────┐                       │   │
│  │ supported_assets │     │  user_wallets    │───────────────────────┘   │
│  └──────────────────┘     └──────────────────┘                           │
│                                   │                                       │
│                                   │ 1:N                                   │
│                                   ▼                                       │
│                          ┌────────────────────┐                          │
│                          │ wallet_transactions │                          │
│                          └────────────────────┘                          │
│                                                                           │
│  ┌───────────────────┐    ┌──────────────────┐                           │
│  │ deposit_addresses │    │  blocked_users   │                           │
│  └───────────────────┘    └──────────────────┘                           │
│                                                                           │
│  ┌───────────────────┐                                                    │
│  │  trader_follows   │                                                    │
│  └───────────────────┘                                                    │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Table Definitions

### 1. users

Core user table for all CyxTrade users (both Lite and Pro).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| `phone` | VARCHAR(20) | UNIQUE, NOT NULL | Phone number (E.164 format) |
| `phone_verified` | BOOLEAN | DEFAULT false | Phone verification status |
| `phone_verified_at` | TIMESTAMP | | When phone was verified |
| `public_key` | VARCHAR(64) | UNIQUE | Ed25519 public key (hex) |
| `public_key_fingerprint` | VARCHAR(16) | | Key fingerprint for display |
| `key_registered_at` | TIMESTAMP | | When keypair was registered |
| `display_name` | VARCHAR(100) | | User's display name |
| `avatar_url` | VARCHAR(500) | | Profile picture URL |
| `email` | VARCHAR(255) | UNIQUE | Optional email |
| `country_code` | VARCHAR(3) | | ISO country code |
| `preferred_currency` | VARCHAR(3) | DEFAULT 'USD' | Preferred fiat currency |
| `is_trader` | BOOLEAN | DEFAULT false | Is registered trader |
| `is_admin` | BOOLEAN | DEFAULT false | Admin privileges |
| `is_suspended` | BOOLEAN | DEFAULT false | Account suspended |
| `suspended_reason` | TEXT | | Suspension reason |
| `last_seen_at` | TIMESTAMP | | Last activity timestamp |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Account creation |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:**
- `idx_users_phone` ON (phone)
- `idx_users_public_key` ON (public_key)
- `idx_users_fingerprint` ON (public_key_fingerprint)

---

### 2. traders

Registered traders who can accept trades (Lite) or post ads (Pro).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `user_id` | UUID | FK → users, UNIQUE, NOT NULL | One trader per user |
| `wallet_address` | VARCHAR(42) | UNIQUE | Tron TRC20 wallet address |
| `status` | VARCHAR(20) | DEFAULT 'pending' | pending/active/suspended/rejected |
| `tier` | VARCHAR(20) | DEFAULT 'starter' | observer/starter/verified/trusted/anchor |
| `bond_amount` | DECIMAL(18,8) | DEFAULT 0 | Total bond deposited (USDT) |
| `bond_locked` | DECIMAL(18,8) | DEFAULT 0 | Bond locked in active trades |
| `bond_currency` | VARCHAR(10) | DEFAULT 'USDT' | Bond denomination |
| `name` | VARCHAR(100) | | Business/display name |
| `bio` | TEXT | | Trader description |
| `rating` | DECIMAL(3,2) | DEFAULT 5.00 | Average rating (0-5) |
| `total_trades` | INTEGER | DEFAULT 0 | Lifetime trade count |
| `completed_trades` | INTEGER | DEFAULT 0 | Successfully completed |
| `total_volume` | DECIMAL(18,2) | DEFAULT 0 | Lifetime volume (USD) |
| `is_online` | BOOLEAN | DEFAULT false | Currently online |
| `last_online_at` | TIMESTAMP | | Last online timestamp |
| `avg_release_time_mins` | DECIMAL(6,2) | | Avg time to release (Pro) |
| `avg_pay_time_mins` | DECIMAL(6,2) | | Avg time to pay (Pro) |
| `positive_feedback` | INTEGER | DEFAULT 0 | Positive reviews (Pro) |
| `negative_feedback` | INTEGER | DEFAULT 0 | Negative reviews (Pro) |
| `trades_30d` | INTEGER | DEFAULT 0 | Trades in last 30 days |
| `completion_rate_30d` | DECIMAL(5,2) | | Completion rate last 30d |
| `approved_at` | TIMESTAMP | | When approved |
| `approved_by` | UUID | FK → users | Admin who approved |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Application date |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:**
- `idx_traders_user_id` ON (user_id)
- `idx_traders_wallet_address` ON (wallet_address)
- `idx_traders_status` ON (status)
- `idx_traders_is_online` ON (is_online)

---

### 3. trader_payment_methods

Payment methods configured by traders (bank, mobile money, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `trader_id` | UUID | FK → traders, NOT NULL | Owner trader |
| `method_type` | VARCHAR(20) | NOT NULL | bank/mobile_money/cash |
| `provider` | VARCHAR(50) | | Provider name (Orange, MTN, etc.) |
| `currency` | VARCHAR(3) | NOT NULL | Currency (XAF, AED, USD) |
| `account_holder_name` | VARCHAR(100) | | Name on account |
| `phone_number` | VARCHAR(20) | | Mobile money number |
| `phone_country_code` | VARCHAR(5) | | Country code (+237) |
| `bank_name` | VARCHAR(100) | | Bank name |
| `account_number` | VARCHAR(50) | | Bank account number |
| `iban` | VARCHAR(34) | | IBAN (international) |
| `swift_code` | VARCHAR(11) | | SWIFT/BIC code |
| `routing_number` | VARCHAR(20) | | US routing number |
| `branch_code` | VARCHAR(20) | | Branch code |
| `is_primary` | BOOLEAN | DEFAULT false | Default method |
| `is_active` | BOOLEAN | DEFAULT true | Active/disabled |
| `verification_status` | VARCHAR(20) | DEFAULT 'unverified' | unverified/pending/verified/failed |
| `verification_code` | VARCHAR(10) | | Verification code sent |
| `verification_sent_at` | TIMESTAMP | | When code sent |
| `verified_at` | TIMESTAMP | | When verified |
| `verification_proof_url` | VARCHAR(500) | | Screenshot proof |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | |

**Indexes:**
- `idx_payment_methods_trader_id` ON (trader_id)
- `idx_payment_methods_currency` ON (currency)

---

### 4. ads

Unified ads table for both Lite (fiat corridors) and Pro (crypto P2P).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `trader_id` | UUID | FK → traders, NOT NULL | Ad publisher |
| `mode` | VARCHAR(10) | NOT NULL | **'lite' or 'pro'** |
| `type` | VARCHAR(4) | NOT NULL | 'buy' or 'sell' |
| `from_currency` | VARCHAR(10) | NOT NULL | Source currency (AED, USDT) |
| `to_currency` | VARCHAR(10) | NOT NULL | Target currency (XAF, USD) |
| `asset` | VARCHAR(10) | | Pro: crypto asset (USDT, BTC) |
| `price_type` | VARCHAR(10) | DEFAULT 'fixed' | fixed/floating |
| `price` | DECIMAL(18,8) | NOT NULL | Exchange rate or price |
| `floating_margin` | DECIMAL(5,2) | | Pro: margin % for floating |
| `total_amount` | DECIMAL(18,8) | | Pro: total crypto available |
| `available_amount` | DECIMAL(18,8) | | Pro: current available |
| `min_limit` | DECIMAL(18,2) | NOT NULL | Minimum order size |
| `max_limit` | DECIMAL(18,2) | NOT NULL | Maximum order size |
| `payment_time_limit` | INTEGER | DEFAULT 15 | Minutes to complete payment |
| `terms` | TEXT | | Trading terms |
| `terms_tags` | TEXT[] | | Quick tags (KYC, Verified) |
| `auto_reply` | TEXT | | Auto-response message |
| `remarks` | TEXT | | Trader notes |
| `status` | VARCHAR(20) | DEFAULT 'online' | online/offline/closed |
| `is_promoted` | BOOLEAN | DEFAULT false | Featured ad |
| `promoted_until` | TIMESTAMP | | Promotion expiry |
| `region_restrictions` | TEXT[] | | Excluded countries |
| `counterparty_conditions` | JSONB | | {minTrades, minCompletionRate, kycRequired} |
| `order_count` | INTEGER | DEFAULT 0 | Orders from this ad |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | |
| `closed_at` | TIMESTAMP | | When closed |

**Indexes:**
- `idx_ads_trader_id` ON (trader_id)
- `idx_ads_mode` ON (mode)
- `idx_ads_status` ON (status)
- `idx_ads_currencies` ON (from_currency, to_currency)
- `idx_ads_mode_status` ON (mode, status) WHERE status = 'online'

---

### 5. ad_payment_methods

Junction table linking ads to accepted payment methods.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `ad_id` | UUID | FK → ads, NOT NULL | Which ad |
| `payment_method_id` | UUID | FK → trader_payment_methods, NOT NULL | Which method |
| `is_recommended` | BOOLEAN | DEFAULT false | Preferred method |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(ad_id, payment_method_id)

---

### 6. orders

**Unified orders table** - replaces both `trades` (Lite) and `p2p_orders` (Pro).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `order_number` | VARCHAR(20) | UNIQUE, NOT NULL | Human-readable order ID |
| `mode` | VARCHAR(10) | NOT NULL | **'lite' or 'pro'** |
| `type` | VARCHAR(4) | | 'buy' or 'sell' (Pro only) |
| `user_id` | UUID | FK → users, NOT NULL | Customer/buyer |
| `trader_id` | UUID | FK → traders, NOT NULL | Trader/seller |
| `ad_id` | UUID | FK → ads | Pro: linked ad |
| `payment_method_id` | UUID | FK → trader_payment_methods | Selected payment method |
| **Amounts** |
| `send_currency` | VARCHAR(10) | NOT NULL | Currency user sends |
| `send_amount` | DECIMAL(18,8) | NOT NULL | Amount user sends |
| `receive_currency` | VARCHAR(10) | NOT NULL | Currency user receives |
| `receive_amount` | DECIMAL(18,8) | NOT NULL | Amount user receives |
| `rate` | DECIMAL(18,8) | NOT NULL | Exchange rate used |
| `fee_amount` | DECIMAL(18,8) | DEFAULT 0 | Platform fee |
| `fee_currency` | VARCHAR(10) | | Fee currency |
| **Pro: Crypto Details** |
| `asset` | VARCHAR(10) | | Crypto asset (USDT, BTC) |
| `crypto_amount` | DECIMAL(18,8) | | Crypto amount traded |
| **Lite: Recipient Details** |
| `recipient_name` | VARCHAR(100) | | Beneficiary name |
| `recipient_phone` | VARCHAR(20) | | Beneficiary phone |
| `recipient_bank` | VARCHAR(100) | | Beneficiary bank |
| `recipient_account` | VARCHAR(50) | | Beneficiary account |
| **Status & Lifecycle** |
| `status` | VARCHAR(20) | NOT NULL | See status enum below |
| `expires_at` | TIMESTAMP | | Order expiration |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |
| `accepted_at` | TIMESTAMP | | When trader accepted |
| `paid_at` | TIMESTAMP | | When user marked paid |
| `delivered_at` | TIMESTAMP | | When trader delivered |
| `released_at` | TIMESTAMP | | Pro: crypto released |
| `completed_at` | TIMESTAMP | | Final completion |
| `cancelled_at` | TIMESTAMP | | Cancellation time |
| `cancelled_by` | UUID | FK → users | Who cancelled |
| `cancel_reason` | TEXT | | Cancellation reason |
| **Payment Proof** |
| `payment_reference` | VARCHAR(100) | | Payment reference/receipt |
| `payment_proof_url` | VARCHAR(500) | | Screenshot URL |
| **Escrow (Pro)** |
| `escrow_amount` | DECIMAL(18,8) | | Crypto locked |
| `escrow_asset` | VARCHAR(10) | | Asset locked |
| `escrow_locked_at` | TIMESTAMP | | When locked |
| `escrow_released_at` | TIMESTAMP | | When released |
| `escrow_tx_id` | VARCHAR(100) | | Blockchain TX |
| **Bond (Lite)** |
| `bond_locked` | DECIMAL(18,8) | | Trader bond locked |
| **Metadata** |
| `auto_reply_sent` | BOOLEAN | DEFAULT false | Auto-reply sent |
| `notes` | TEXT | | Internal notes |

**Order Status Enum:**
```
'pending'      - Created, awaiting trader acceptance (Lite) or payment (Pro)
'accepted'     - Trader accepted (Lite only)
'paid'         - User marked payment sent
'delivering'   - Trader delivering funds
'releasing'    - Pro: releasing crypto
'released'     - Pro: crypto released
'completed'    - Trade fully completed
'cancelled'    - Cancelled by either party
'disputed'     - Dispute opened
'expired'      - Timed out
```

**Indexes:**
- `idx_orders_user_id` ON (user_id)
- `idx_orders_trader_id` ON (trader_id)
- `idx_orders_ad_id` ON (ad_id)
- `idx_orders_mode` ON (mode)
- `idx_orders_status` ON (status)
- `idx_orders_created_at` ON (created_at DESC)
- `idx_orders_mode_status` ON (mode, status)

---

### 7. messages

**Unified chat messages** - replaces `chat_messages` and `p2p_messages`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `order_id` | UUID | FK → orders, NOT NULL | Parent order |
| `sender_id` | UUID | FK → users, NOT NULL | Message sender |
| `message_type` | VARCHAR(20) | DEFAULT 'text' | text/image/system/payment_proof |
| `content` | TEXT | | Message content |
| `image_url` | VARCHAR(500) | | Image attachment URL |
| `metadata` | JSONB | | Additional data |
| `is_read` | BOOLEAN | DEFAULT false | Read status |
| `read_at` | TIMESTAMP | | When read |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

**Indexes:**
- `idx_messages_order_id` ON (order_id)
- `idx_messages_created_at` ON (order_id, created_at)

---

### 8. feedback

**Unified ratings/feedback** - replaces `ratings` and `p2p_feedback`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `order_id` | UUID | FK → orders, NOT NULL | Related order |
| `from_user_id` | UUID | FK → users, NOT NULL | Who rates |
| `to_trader_id` | UUID | FK → traders, NOT NULL | Who is rated |
| `rating_type` | VARCHAR(10) | NOT NULL | 'numeric' (Lite) or 'binary' (Pro) |
| `rating_value` | INTEGER | NOT NULL | 1-5 for numeric, 0-1 for binary |
| `comment` | TEXT | | Review text |
| `is_anonymous` | BOOLEAN | DEFAULT false | Hide reviewer name |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(order_id, from_user_id)
- CHECK (rating_type = 'numeric' AND rating_value BETWEEN 1 AND 5) OR (rating_type = 'binary' AND rating_value IN (0, 1))

**Indexes:**
- `idx_feedback_order_id` ON (order_id)
- `idx_feedback_to_trader` ON (to_trader_id)

---

### 9. disputes

**Unified disputes table**.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `order_id` | UUID | FK → orders, UNIQUE, NOT NULL | Disputed order |
| `opened_by` | UUID | FK → users, NOT NULL | Who opened |
| `reason` | TEXT | NOT NULL | Dispute reason |
| `status` | VARCHAR(20) | DEFAULT 'open' | open/evidence/arbitration/resolved |
| `resolution` | VARCHAR(20) | | buyer_wins/seller_wins/split/cancelled |
| `resolution_notes` | TEXT | | Resolution explanation |
| `resolved_by` | UUID | FK → users | Arbitrator/admin |
| `resolved_at` | TIMESTAMP | | Resolution time |
| `evidence_deadline` | TIMESTAMP | | Evidence submission deadline |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | |

**Indexes:**
- `idx_disputes_order_id` ON (order_id)
- `idx_disputes_status` ON (status)

---

### 10. dispute_evidence

Evidence submitted for disputes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `dispute_id` | UUID | FK → disputes, NOT NULL | Parent dispute |
| `submitted_by` | UUID | FK → users, NOT NULL | Submitter |
| `evidence_type` | VARCHAR(20) | NOT NULL | screenshot/document/message/other |
| `title` | VARCHAR(200) | | Evidence title |
| `description` | TEXT | | Evidence description |
| `file_url` | VARCHAR(500) | | File URL |
| `file_hash` | VARCHAR(64) | | SHA-256 hash for integrity |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

**Indexes:**
- `idx_evidence_dispute_id` ON (dispute_id)

---

## Pro-Only Tables

### 11. supported_assets

Supported cryptocurrencies and fiat currencies.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `symbol` | VARCHAR(10) | UNIQUE, NOT NULL | USDT, BTC, USD |
| `name` | VARCHAR(50) | NOT NULL | Full name |
| `type` | VARCHAR(10) | NOT NULL | 'crypto' or 'fiat' |
| `network` | VARCHAR(20) | | TRC20, ERC20, BTC |
| `contract_address` | VARCHAR(64) | | Smart contract address |
| `decimals` | INTEGER | DEFAULT 8 | Token decimals |
| `min_deposit` | DECIMAL(18,8) | | Minimum deposit |
| `min_withdrawal` | DECIMAL(18,8) | | Minimum withdrawal |
| `withdrawal_fee` | DECIMAL(18,8) | | Withdrawal fee |
| `is_active` | BOOLEAN | DEFAULT true | Active for trading |
| `icon_url` | VARCHAR(500) | | Asset icon |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

**Default Assets:**
- USDT (TRC20, 6 decimals)
- USDC (TRC20, 6 decimals)
- BTC (8 decimals)
- TRX (6 decimals)
- USD, EUR, XAF, AED (fiat)

---

### 12. user_wallets

User wallet balances (Pro only).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `user_id` | UUID | FK → users, NOT NULL | Wallet owner |
| `asset` | VARCHAR(10) | NOT NULL | Asset symbol |
| `available_balance` | DECIMAL(18,8) | DEFAULT 0 | Spendable balance |
| `locked_balance` | DECIMAL(18,8) | DEFAULT 0 | Locked in escrow |
| `total_deposited` | DECIMAL(18,8) | DEFAULT 0 | Lifetime deposits |
| `total_withdrawn` | DECIMAL(18,8) | DEFAULT 0 | Lifetime withdrawals |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(user_id, asset)
- CHECK(available_balance >= 0)
- CHECK(locked_balance >= 0)

**Indexes:**
- `idx_wallets_user_id` ON (user_id)
- `idx_wallets_user_asset` ON (user_id, asset)

---

### 13. wallet_transactions

Complete audit trail of wallet operations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `user_id` | UUID | FK → users, NOT NULL | Wallet owner |
| `asset` | VARCHAR(10) | NOT NULL | Asset symbol |
| `type` | VARCHAR(20) | NOT NULL | See types below |
| `amount` | DECIMAL(18,8) | NOT NULL | Transaction amount |
| `fee` | DECIMAL(18,8) | DEFAULT 0 | Transaction fee |
| `balance_before` | DECIMAL(18,8) | | Balance before TX |
| `balance_after` | DECIMAL(18,8) | | Balance after TX |
| `status` | VARCHAR(20) | DEFAULT 'pending' | pending/processing/completed/failed/cancelled |
| `reference_type` | VARCHAR(20) | | order/withdrawal/deposit |
| `reference_id` | UUID | | Related order/withdrawal ID |
| `tx_hash` | VARCHAR(100) | | Blockchain TX hash |
| `from_address` | VARCHAR(100) | | Source address |
| `to_address` | VARCHAR(100) | | Destination address |
| `network` | VARCHAR(20) | | Blockchain network |
| `confirmations` | INTEGER | DEFAULT 0 | Current confirmations |
| `required_confirmations` | INTEGER | | Target confirmations |
| `notes` | TEXT | | Internal notes |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |
| `completed_at` | TIMESTAMP | | Completion time |

**Transaction Types:**
- `deposit` - Incoming crypto
- `withdrawal` - Outgoing crypto
- `escrow_lock` - Locked for order
- `escrow_release` - Released to buyer
- `escrow_refund` - Refunded to seller
- `trade_fee` - Platform fee deduction
- `transfer` - Internal transfer

**Indexes:**
- `idx_wallet_tx_user_id` ON (user_id)
- `idx_wallet_tx_type` ON (type)
- `idx_wallet_tx_status` ON (status)
- `idx_wallet_tx_reference` ON (reference_type, reference_id)

---

### 14. deposit_addresses

User deposit addresses per asset.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `user_id` | UUID | FK → users, NOT NULL | Address owner |
| `asset` | VARCHAR(10) | NOT NULL | Asset symbol |
| `network` | VARCHAR(20) | NOT NULL | Network (TRC20, ERC20) |
| `address` | VARCHAR(100) | NOT NULL | Deposit address |
| `memo` | VARCHAR(100) | | Memo/tag if required |
| `is_active` | BOOLEAN | DEFAULT true | Currently active |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(user_id, asset, network)

---

### 15. blocked_users

User blocking (Pro social feature).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `blocker_id` | UUID | FK → users, NOT NULL | Who blocks |
| `blocked_id` | UUID | FK → users, NOT NULL | Who is blocked |
| `reason` | TEXT | | Block reason |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(blocker_id, blocked_id)
- CHECK(blocker_id != blocked_id)

---

### 16. trader_follows

Follow favorite traders (Pro social feature).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `follower_id` | UUID | FK → users, NOT NULL | Who follows |
| `trader_id` | UUID | FK → traders, NOT NULL | Who is followed |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(follower_id, trader_id)

---

## Shared Configuration Tables

### 17. otp_codes

OTP verification codes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `phone` | VARCHAR(20) | NOT NULL | Phone number |
| `code` | VARCHAR(6) | NOT NULL | OTP code |
| `purpose` | VARCHAR(20) | DEFAULT 'login' | login/verify/reset |
| `attempts` | INTEGER | DEFAULT 0 | Failed attempts |
| `expires_at` | TIMESTAMP | NOT NULL | Expiration time |
| `used_at` | TIMESTAMP | | When used |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

**Indexes:**
- `idx_otp_phone` ON (phone)
- `idx_otp_expires` ON (expires_at)

---

### 18. notifications

Push notifications and alerts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `user_id` | UUID | FK → users, NOT NULL | Recipient |
| `type` | VARCHAR(50) | NOT NULL | Notification type |
| `title` | VARCHAR(200) | NOT NULL | Notification title |
| `body` | TEXT | | Notification body |
| `data` | JSONB | | Additional data |
| `is_read` | BOOLEAN | DEFAULT false | Read status |
| `read_at` | TIMESTAMP | | When read |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

**Indexes:**
- `idx_notifications_user_id` ON (user_id)
- `idx_notifications_unread` ON (user_id) WHERE is_read = false

---

## Database Functions & Triggers

### Order Number Generator

```sql
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    date_part VARCHAR(8);
    random_part VARCHAR(12);
BEGIN
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    random_part := LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0');
    RETURN date_part || random_part;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();
```

### Update Ad Available Amount

```sql
CREATE OR REPLACE FUNCTION update_ad_available_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.ad_id IS NOT NULL THEN
        UPDATE ads
        SET available_amount = available_amount - NEW.crypto_amount,
            order_count = order_count + 1
        WHERE id = NEW.ad_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        UPDATE ads
        SET available_amount = available_amount + NEW.crypto_amount
        WHERE id = NEW.ad_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ad_available
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    WHEN (NEW.mode = 'pro')
    EXECUTE FUNCTION update_ad_available_amount();
```

### Update Trader Stats

```sql
CREATE OR REPLACE FUNCTION update_trader_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE traders
        SET completed_trades = completed_trades + 1,
            total_trades = total_trades + 1,
            total_volume = total_volume + NEW.send_amount
        WHERE id = NEW.trader_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trader_stats
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_trader_stats();
```

### Update Trader Rating

```sql
CREATE OR REPLACE FUNCTION update_trader_rating()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
BEGIN
    SELECT AVG(
        CASE
            WHEN rating_type = 'numeric' THEN rating_value
            WHEN rating_type = 'binary' THEN rating_value * 5  -- 1 = 5 stars, 0 = 0 stars
        END
    ) INTO avg_rating
    FROM feedback
    WHERE to_trader_id = NEW.to_trader_id;

    UPDATE traders SET rating = COALESCE(avg_rating, 5.00) WHERE id = NEW.to_trader_id;

    IF NEW.rating_type = 'binary' THEN
        IF NEW.rating_value = 1 THEN
            UPDATE traders SET positive_feedback = positive_feedback + 1 WHERE id = NEW.to_trader_id;
        ELSE
            UPDATE traders SET negative_feedback = negative_feedback + 1 WHERE id = NEW.to_trader_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trader_rating
    AFTER INSERT ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_trader_rating();
```

---

## Summary

### Table Count

| Category | Tables |
|----------|--------|
| Core (Shared) | 10 |
| Pro-Only | 6 |
| Config | 2 |
| **Total** | **18** |

### Key Unifications

| Unified Table | Replaced |
|---------------|----------|
| `orders` | `trades` + `p2p_orders` |
| `messages` | `chat_messages` + `p2p_messages` |
| `feedback` | `ratings` + `p2p_feedback` |
| `disputes` | Both dispute tables |
| `ads` | `traders.corridors` + `ads` |

### Mode Distinction

All mode-specific behavior is controlled by:
- `ads.mode` = 'lite' | 'pro'
- `orders.mode` = 'lite' | 'pro'
- Nullable columns for mode-specific fields

---

*Last updated: 2026-03*
