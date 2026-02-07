# CyxTrade Technical Design

> Data structures, message formats, protocols, and escrow system specification.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   CLI/TUI   │  │  Mobile App │  │   Web UI    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
├─────────────────────────────────────────────────────────────────┤
│                       CYXTRADE DAEMON                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Trade   │  │  Order   │  │  Escrow  │  │Reputation│        │
│  │  Engine  │  │   Book   │  │  Manager │  │  System  │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       └─────────────┴─────────────┴─────────────┘              │
│                          │                                      │
├──────────────────────────┼──────────────────────────────────────┤
│                     CYXWIZ PROTOCOL                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   DHT    │  │  Onion   │  │   MPC    │  │ Storage  │        │
│  │          │  │ Routing  │  │  Crypto  │  │          │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       └─────────────┴─────────────┴─────────────┘              │
│                          │                                      │
├──────────────────────────┼──────────────────────────────────────┤
│                     TRANSPORT LAYER                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │   UDP    │  │Bluetooth │  │   LoRa   │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Data Structures

### Identity

```c
// 32-byte public key as identity
typedef struct {
    uint8_t bytes[32];
} cyxtrade_pubkey_t;

// User identity with metadata
typedef struct {
    cyxtrade_pubkey_t pubkey;           // Public key (identity)
    uint8_t           signature[64];     // Ed25519 signature of pubkey
    uint32_t          created_at;        // Unix timestamp
} cyxtrade_identity_t;
```

### Network

```c
// Network identifier (hash of founder pubkeys)
typedef struct {
    uint8_t bytes[16];
} cyxtrade_network_id_t;

// Network configuration
typedef struct {
    cyxtrade_network_id_t id;
    char                  name[64];
    uint16_t              max_members;
    uint8_t               vouch_stake_percent;    // 5-25
    uint16_t              dispute_timeout_hours;  // 24-72
    uint16_t              trade_timeout_minutes;  // 60-240
    uint8_t               expulsion_threshold;    // 50-75 (percent)
    uint32_t              new_member_limit_usdt;  // 50-500
    uint8_t               cascade_depth;          // 1-3
    uint32_t              created_at;
    cyxtrade_pubkey_t     founders[3];
    uint8_t               founder_count;
} cyxtrade_network_t;

// Network membership
typedef struct {
    cyxtrade_network_id_t network_id;
    cyxtrade_pubkey_t     member_pubkey;
    cyxtrade_pubkey_t     voucher_pubkey;
    uint32_t              joined_at;
    uint8_t               role;           // FOUNDER, SENIOR, TRADER, MEMBER
    uint32_t              reputation;     // Fixed-point: actual = value / 100
    uint8_t               status;         // ACTIVE, SUSPENDED, EXPELLED
} cyxtrade_membership_t;
```

### Vouching

```c
// Vouch record
typedef struct {
    cyxtrade_pubkey_t voucher;
    cyxtrade_pubkey_t vouched;
    cyxtrade_network_id_t network_id;
    uint32_t          timestamp;
    uint32_t          stake;              // Rep points staked (fixed-point)
    uint8_t           status;             // ACTIVE, WITHDRAWN, PENALIZED
    uint8_t           signature[64];      // Voucher's signature
} cyxtrade_vouch_t;

// Vouch chain (for tracing back to founder)
typedef struct {
    cyxtrade_vouch_t  vouches[10];        // Max depth 10
    uint8_t           depth;
} cyxtrade_vouch_chain_t;
```

### Orders

```c
// Currency codes (ISO 4217 + crypto)
typedef enum {
    // Fiat
    CYX_CURRENCY_USD = 840,
    CYX_CURRENCY_EUR = 978,
    CYX_CURRENCY_AED = 784,
    CYX_CURRENCY_NGN = 566,
    CYX_CURRENCY_XAF = 950,   // Central African CFA
    CYX_CURRENCY_XOF = 952,   // West African CFA
    CYX_CURRENCY_GHS = 936,
    CYX_CURRENCY_KES = 404,
    CYX_CURRENCY_ZAR = 710,
    CYX_CURRENCY_INR = 356,
    CYX_CURRENCY_PKR = 586,
    CYX_CURRENCY_PHP = 608,
    // Crypto (use high numbers)
    CYX_CURRENCY_USDT = 10001,
    CYX_CURRENCY_USDC = 10002,
    CYX_CURRENCY_DAI  = 10003,
    CYX_CURRENCY_BTC  = 10010,
} cyxtrade_currency_t;

// Payment method
typedef enum {
    CYX_PAYMENT_BANK_TRANSFER = 1,
    CYX_PAYMENT_MOBILE_MONEY  = 2,
    CYX_PAYMENT_CASH_DEPOSIT  = 3,
    CYX_PAYMENT_CASH_IN_PERSON = 4,
    CYX_PAYMENT_PAYPAL        = 5,
    CYX_PAYMENT_WISE          = 6,
    CYX_PAYMENT_CRYPTO_ONCHAIN = 10,
} cyxtrade_payment_method_t;

// Order ID (random 8 bytes)
typedef struct {
    uint8_t bytes[8];
} cyxtrade_order_id_t;

// Order side
typedef enum {
    CYX_ORDER_BUY  = 1,   // Buying crypto with fiat
    CYX_ORDER_SELL = 2,   // Selling crypto for fiat
} cyxtrade_order_side_t;

// Order status
typedef enum {
    CYX_ORDER_OPEN      = 1,
    CYX_ORDER_MATCHED   = 2,
    CYX_ORDER_CANCELLED = 3,
    CYX_ORDER_EXPIRED   = 4,
} cyxtrade_order_status_t;

// Order
typedef struct {
    cyxtrade_order_id_t   id;
    cyxtrade_network_id_t network_id;
    cyxtrade_pubkey_t     maker;              // Order creator
    uint8_t               side;               // BUY or SELL

    // What they're trading
    uint16_t              crypto_currency;    // USDT, USDC, etc.
    uint64_t              crypto_amount;      // In smallest unit (satoshi equiv)

    // What they want
    uint16_t              fiat_currency;      // AED, XAF, etc.
    uint64_t              fiat_amount;        // In smallest unit (cents)

    // Constraints
    uint64_t              min_amount;         // Minimum trade (crypto)
    uint64_t              max_amount;         // Maximum trade (crypto)
    uint8_t               payment_methods[8]; // Accepted payment methods
    uint8_t               payment_method_count;

    // Payment details (encrypted, only revealed to counterparty)
    uint8_t               payment_details_encrypted[256];
    uint16_t              payment_details_len;

    // Metadata
    uint8_t               status;
    uint32_t              created_at;
    uint32_t              expires_at;
    uint8_t               signature[64];
} cyxtrade_order_t;
```

### Trades

```c
// Trade ID (hash of order IDs + timestamp)
typedef struct {
    uint8_t bytes[16];
} cyxtrade_trade_id_t;

// Trade state machine
typedef enum {
    CYX_TRADE_CREATED           = 1,   // Trade initiated
    CYX_TRADE_ESCROW_PENDING    = 2,   // Waiting for crypto deposit
    CYX_TRADE_ESCROW_LOCKED     = 3,   // Crypto in escrow
    CYX_TRADE_FIAT_PENDING      = 4,   // Waiting for fiat payment
    CYX_TRADE_FIAT_SENT         = 5,   // Buyer claims fiat sent
    CYX_TRADE_CONFIRMING        = 6,   // Seller checking payment
    CYX_TRADE_COMPLETED         = 7,   // Both confirmed, escrow released
    CYX_TRADE_DISPUTED          = 8,   // Dispute raised
    CYX_TRADE_CANCELLED         = 9,   // Cancelled before escrow
    CYX_TRADE_EXPIRED           = 10,  // Timeout
} cyxtrade_trade_state_t;

// Trade
typedef struct {
    cyxtrade_trade_id_t   id;
    cyxtrade_network_id_t network_id;
    cyxtrade_order_id_t   order_id;           // Original order

    // Parties
    cyxtrade_pubkey_t     buyer;              // Buying crypto
    cyxtrade_pubkey_t     seller;             // Selling crypto

    // Amounts (final, may differ from order if partial fill)
    uint16_t              crypto_currency;
    uint64_t              crypto_amount;
    uint16_t              fiat_currency;
    uint64_t              fiat_amount;

    // Payment
    uint8_t               payment_method;
    uint8_t               payment_details[256]; // Decrypted for counterparty
    uint16_t              payment_details_len;

    // Escrow
    cyxtrade_escrow_id_t  escrow_id;

    // State
    uint8_t               state;
    uint32_t              created_at;
    uint32_t              escrow_locked_at;
    uint32_t              fiat_sent_at;
    uint32_t              completed_at;
    uint32_t              timeout_at;         // When current phase expires

    // Signatures
    uint8_t               buyer_signature[64];
    uint8_t               seller_signature[64];
} cyxtrade_trade_t;
```

### Escrow

```c
// Escrow ID
typedef struct {
    uint8_t bytes[16];
} cyxtrade_escrow_id_t;

// Escrow state
typedef enum {
    CYX_ESCROW_PENDING   = 1,   // Waiting for deposit
    CYX_ESCROW_LOCKED    = 2,   // Funds locked
    CYX_ESCROW_RELEASING = 3,   // Release in progress
    CYX_ESCROW_RELEASED  = 4,   // Funds released to recipient
    CYX_ESCROW_REFUNDED  = 5,   // Funds returned to depositor
    CYX_ESCROW_DISPUTED  = 6,   // Under dispute
} cyxtrade_escrow_state_t;

// Simple escrow (2-of-2: buyer + seller)
typedef struct {
    cyxtrade_escrow_id_t  id;
    cyxtrade_trade_id_t   trade_id;

    // Parties
    cyxtrade_pubkey_t     depositor;          // Who deposited (seller)
    cyxtrade_pubkey_t     recipient;          // Who receives (buyer)

    // Funds
    uint16_t              currency;           // USDT, USDC, etc.
    uint64_t              amount;

    // State
    uint8_t               state;
    uint32_t              locked_at;
    uint32_t              timeout_at;

    // Release requires both signatures
    uint8_t               depositor_release_sig[64];
    uint8_t               recipient_release_sig[64];
    bool                  depositor_signed;
    bool                  recipient_signed;
} cyxtrade_escrow_simple_t;

// Multi-party escrow (3-of-5 network nodes)
typedef struct {
    cyxtrade_escrow_id_t  id;
    cyxtrade_trade_id_t   trade_id;

    // Parties
    cyxtrade_pubkey_t     depositor;
    cyxtrade_pubkey_t     recipient;

    // Escrow holders (5 network nodes)
    cyxtrade_pubkey_t     holders[5];
    uint8_t               holder_count;

    // Funds (split via MPC)
    uint16_t              currency;
    uint64_t              amount;
    uint8_t               shares[5][64];      // MPC shares per holder

    // State
    uint8_t               state;
    uint32_t              locked_at;
    uint32_t              timeout_at;

    // Release signatures (need 3 of 5)
    uint8_t               release_sigs[5][64];
    bool                  sig_received[5];
    uint8_t               sig_count;
    cyxtrade_pubkey_t     release_to;         // Who gets funds
} cyxtrade_escrow_multi_t;
```

### Reputation

```c
// Reputation record
typedef struct {
    cyxtrade_pubkey_t     user;
    cyxtrade_network_id_t network_id;

    // Score components (all fixed-point, divide by 100)
    uint32_t              total_reputation;
    uint32_t              trade_score;
    uint32_t              vouch_bonus;
    uint32_t              time_bonus;
    uint32_t              penalties;

    // Stats
    uint32_t              trades_completed;
    uint32_t              trades_as_buyer;
    uint32_t              trades_as_seller;
    uint64_t              volume_total;       // In USDT equivalent
    uint32_t              disputes_won;
    uint32_t              disputes_lost;
    uint32_t              vouches_given;
    uint32_t              vouches_active;

    // Timestamps
    uint32_t              first_trade_at;
    uint32_t              last_trade_at;
    uint32_t              last_updated_at;
} cyxtrade_reputation_t;

// Trade history entry
typedef struct {
    cyxtrade_trade_id_t   trade_id;
    cyxtrade_pubkey_t     counterparty;
    uint8_t               role;               // BUYER or SELLER
    uint64_t              amount;
    uint16_t              crypto_currency;
    uint16_t              fiat_currency;
    uint32_t              completed_at;
    uint16_t              duration_seconds;
    uint8_t               outcome;            // COMPLETED, DISPUTED_WON, DISPUTED_LOST
} cyxtrade_trade_history_t;
```

### Disputes

```c
// Dispute ID
typedef struct {
    uint8_t bytes[16];
} cyxtrade_dispute_id_t;

// Dispute reason
typedef enum {
    CYX_DISPUTE_NO_PAYMENT     = 1,   // Fiat not received
    CYX_DISPUTE_WRONG_AMOUNT   = 2,   // Wrong fiat amount
    CYX_DISPUTE_WRONG_ACCOUNT  = 3,   // Paid to wrong account
    CYX_DISPUTE_FRAUD          = 4,   // General fraud claim
    CYX_DISPUTE_OTHER          = 99,
} cyxtrade_dispute_reason_t;

// Dispute vote
typedef enum {
    CYX_VOTE_FAVOR_BUYER      = 1,
    CYX_VOTE_FAVOR_SELLER     = 2,
    CYX_VOTE_INCONCLUSIVE     = 3,
} cyxtrade_dispute_vote_t;

// Evidence
typedef struct {
    uint8_t               type;               // SCREENSHOT, TX_REF, CHAT_LOG, OTHER
    uint8_t               data[1024];         // Encrypted evidence
    uint16_t              data_len;
    uint32_t              submitted_at;
    uint8_t               signature[64];
} cyxtrade_evidence_t;

// Voter record
typedef struct {
    cyxtrade_pubkey_t     voter;
    uint8_t               vote;               // FAVOR_BUYER, FAVOR_SELLER, INCONCLUSIVE
    uint32_t              voted_at;
    uint8_t               signature[64];
} cyxtrade_voter_t;

// Dispute
typedef struct {
    cyxtrade_dispute_id_t id;
    cyxtrade_trade_id_t   trade_id;
    cyxtrade_network_id_t network_id;

    // Parties
    cyxtrade_pubkey_t     initiator;          // Who raised dispute
    cyxtrade_pubkey_t     respondent;         // Other party

    // Details
    uint8_t               reason;
    char                  description[512];

    // Evidence
    cyxtrade_evidence_t   initiator_evidence[5];
    uint8_t               initiator_evidence_count;
    cyxtrade_evidence_t   respondent_evidence[5];
    uint8_t               respondent_evidence_count;

    // Voters (selected randomly)
    cyxtrade_pubkey_t     selected_voters[5];
    cyxtrade_voter_t      votes[5];
    uint8_t               vote_count;

    // Timeline
    uint32_t              created_at;
    uint32_t              evidence_deadline;  // 24h from creation
    uint32_t              vote_deadline;      // 48h from evidence deadline

    // Outcome
    uint8_t               outcome;            // PENDING, FAVOR_BUYER, FAVOR_SELLER, INCONCLUSIVE
    uint32_t              resolved_at;
} cyxtrade_dispute_t;
```

---

## Message Formats

### Message Header

All CyxTrade messages share a common header:

```c
typedef struct {
    uint8_t  magic[2];        // "CT" (0x43 0x54)
    uint8_t  version;         // Protocol version (1)
    uint8_t  type;            // Message type
    uint16_t length;          // Payload length
    uint8_t  network_id[16];  // Network identifier
    uint8_t  sender[32];      // Sender pubkey
    uint8_t  signature[64];   // Ed25519 signature of payload
} cyxtrade_msg_header_t;
// Total: 117 bytes
```

### Message Types

```c
typedef enum {
    // Network (0x01-0x0F)
    CYX_MSG_NETWORK_JOIN_REQ    = 0x01,
    CYX_MSG_NETWORK_JOIN_RESP   = 0x02,
    CYX_MSG_NETWORK_LEAVE       = 0x03,
    CYX_MSG_NETWORK_INFO_REQ    = 0x04,
    CYX_MSG_NETWORK_INFO_RESP   = 0x05,

    // Vouching (0x10-0x1F)
    CYX_MSG_VOUCH_REQUEST       = 0x10,
    CYX_MSG_VOUCH_GRANT         = 0x11,
    CYX_MSG_VOUCH_DENY          = 0x12,
    CYX_MSG_VOUCH_WITHDRAW      = 0x13,
    CYX_MSG_VOUCH_CHAIN_REQ     = 0x14,
    CYX_MSG_VOUCH_CHAIN_RESP    = 0x15,

    // Orders (0x20-0x2F)
    CYX_MSG_ORDER_CREATE        = 0x20,
    CYX_MSG_ORDER_CANCEL        = 0x21,
    CYX_MSG_ORDER_LIST_REQ      = 0x22,
    CYX_MSG_ORDER_LIST_RESP     = 0x23,
    CYX_MSG_ORDER_DETAIL_REQ    = 0x24,
    CYX_MSG_ORDER_DETAIL_RESP   = 0x25,

    // Trades (0x30-0x3F)
    CYX_MSG_TRADE_INITIATE      = 0x30,
    CYX_MSG_TRADE_ACCEPT        = 0x31,
    CYX_MSG_TRADE_REJECT        = 0x32,
    CYX_MSG_TRADE_ESCROW_CONF   = 0x33,
    CYX_MSG_TRADE_FIAT_SENT     = 0x34,
    CYX_MSG_TRADE_FIAT_CONFIRM  = 0x35,
    CYX_MSG_TRADE_COMPLETE      = 0x36,
    CYX_MSG_TRADE_CANCEL        = 0x37,
    CYX_MSG_TRADE_STATUS_REQ    = 0x38,
    CYX_MSG_TRADE_STATUS_RESP   = 0x39,

    // Escrow (0x40-0x4F)
    CYX_MSG_ESCROW_LOCK         = 0x40,
    CYX_MSG_ESCROW_LOCK_CONF    = 0x41,
    CYX_MSG_ESCROW_RELEASE_REQ  = 0x42,
    CYX_MSG_ESCROW_RELEASE_SIG  = 0x43,
    CYX_MSG_ESCROW_RELEASED     = 0x44,
    CYX_MSG_ESCROW_REFUND_REQ   = 0x45,
    CYX_MSG_ESCROW_REFUNDED     = 0x46,

    // Disputes (0x50-0x5F)
    CYX_MSG_DISPUTE_RAISE       = 0x50,
    CYX_MSG_DISPUTE_EVIDENCE    = 0x51,
    CYX_MSG_DISPUTE_VOTE_REQ    = 0x52,
    CYX_MSG_DISPUTE_VOTE        = 0x53,
    CYX_MSG_DISPUTE_RESULT      = 0x54,

    // Reputation (0x60-0x6F)
    CYX_MSG_REP_QUERY           = 0x60,
    CYX_MSG_REP_RESPONSE        = 0x61,
    CYX_MSG_REP_HISTORY_REQ     = 0x62,
    CYX_MSG_REP_HISTORY_RESP    = 0x63,

    // Chat (0x70-0x7F)
    CYX_MSG_CHAT_MESSAGE        = 0x70,
    CYX_MSG_CHAT_READ_RECEIPT   = 0x71,

} cyxtrade_msg_type_t;
```

### Key Message Payloads

**Order Create (0x20)**
```c
typedef struct {
    uint8_t               side;               // BUY or SELL
    uint16_t              crypto_currency;
    uint64_t              crypto_amount;
    uint16_t              fiat_currency;
    uint64_t              fiat_amount;
    uint64_t              min_amount;
    uint64_t              max_amount;
    uint8_t               payment_methods[8];
    uint8_t               payment_method_count;
    uint8_t               payment_details_encrypted[256];
    uint16_t              payment_details_len;
    uint32_t              expires_in_seconds;
} cyxtrade_msg_order_create_t;
// ~300 bytes
```

**Trade Initiate (0x30)**
```c
typedef struct {
    uint8_t               order_id[8];
    uint64_t              amount;             // How much to trade
    uint8_t               payment_method;     // Which payment method
} cyxtrade_msg_trade_initiate_t;
// 17 bytes
```

**Trade Fiat Sent (0x34)**
```c
typedef struct {
    uint8_t               trade_id[16];
    char                  tx_reference[64];   // Bank reference, etc.
    uint32_t              sent_at;            // Timestamp
} cyxtrade_msg_trade_fiat_sent_t;
// 84 bytes
```

**Escrow Lock (0x40)**
```c
typedef struct {
    uint8_t               trade_id[16];
    uint16_t              currency;
    uint64_t              amount;
    uint8_t               recipient[32];
    uint8_t               timeout_hours;
} cyxtrade_msg_escrow_lock_t;
// 59 bytes
```

**Dispute Raise (0x50)**
```c
typedef struct {
    uint8_t               trade_id[16];
    uint8_t               reason;
    char                  description[256];
} cyxtrade_msg_dispute_raise_t;
// 273 bytes
```

---

## Protocols

### Trade Protocol

```
┌─────────────────────────────────────────────────────────────────┐
│                     TRADE STATE MACHINE                         │
│                                                                 │
│   ┌──────────┐                                                 │
│   │  START   │                                                 │
│   └────┬─────┘                                                 │
│        │ Buyer sends TRADE_INITIATE                            │
│        ▼                                                       │
│   ┌──────────┐     TRADE_REJECT    ┌──────────┐               │
│   │ CREATED  │ ──────────────────► │ CANCELLED│               │
│   └────┬─────┘                     └──────────┘               │
│        │ Seller sends TRADE_ACCEPT                             │
│        ▼                                                       │
│   ┌──────────────┐                                             │
│   │ESCROW_PENDING│                                             │
│   └────┬─────────┘                                             │
│        │ Seller deposits crypto                                │
│        │ System sends ESCROW_LOCK_CONF                         │
│        ▼                                                       │
│   ┌─────────────┐    Timeout      ┌──────────┐                │
│   │ESCROW_LOCKED│ ──────────────► │ REFUNDED │                │
│   └────┬────────┘                 └──────────┘                │
│        │ Buyer sends TRADE_FIAT_SENT                           │
│        ▼                                                       │
│   ┌────────────┐                                               │
│   │ FIAT_SENT  │                                               │
│   └────┬───────┘                                               │
│        │ Seller sends TRADE_FIAT_CONFIRM                       │
│        ▼                                                       │
│   ┌────────────┐                                               │
│   │ CONFIRMING │                                               │
│   └────┬───────┘                                               │
│        │                                                       │
│        ├─► Seller confirms ──► ESCROW_RELEASE ──► COMPLETED   │
│        │                                                       │
│        └─► Seller disputes ──► DISPUTED ──► Resolution        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Trade Timeline

```
Time=0:    Trade initiated
           Timeout: 15 min for seller to accept

Time=T1:   Seller accepts
           Timeout: 30 min for seller to deposit escrow

Time=T2:   Escrow locked
           Timeout: 2 hours for buyer to send fiat

Time=T3:   Buyer marks fiat sent
           Timeout: 2 hours for seller to confirm

Time=T4:   Seller confirms OR disputes

If confirmed: Escrow released, trade complete
If disputed:  Dispute resolution process (24h evidence + 48h voting)
If timeout:   Auto-dispute raised
```

### Escrow Protocol (Simple 2-of-2)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIMPLE ESCROW FLOW                           │
│                                                                 │
│   Seller                    Escrow                    Buyer     │
│     │                         │                         │       │
│     │   ESCROW_LOCK           │                         │       │
│     │ ──────────────────────► │                         │       │
│     │   (amount, recipient,   │                         │       │
│     │    timeout)             │                         │       │
│     │                         │                         │       │
│     │   ESCROW_LOCK_CONF      │   ESCROW_LOCK_CONF     │       │
│     │ ◄────────────────────── │ ──────────────────────► │       │
│     │                         │                         │       │
│     │         ... fiat payment happens ...              │       │
│     │                         │                         │       │
│     │   ESCROW_RELEASE_SIG    │                         │       │
│     │ ──────────────────────► │                         │       │
│     │   (seller's signature)  │                         │       │
│     │                         │                         │       │
│     │                         │   ESCROW_RELEASE_SIG    │       │
│     │                         │ ◄────────────────────── │       │
│     │                         │   (buyer's signature)   │       │
│     │                         │                         │       │
│     │                         │   [2-of-2 complete]     │       │
│     │                         │                         │       │
│     │   ESCROW_RELEASED       │   ESCROW_RELEASED      │       │
│     │ ◄────────────────────── │ ──────────────────────► │       │
│     │                         │   (funds to buyer)      │       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Escrow Protocol (Multi-Party 3-of-5)

```
┌─────────────────────────────────────────────────────────────────┐
│                 MULTI-PARTY ESCROW FLOW                         │
│                                                                 │
│   Seller        Escrow Nodes (5)        Buyer                  │
│     │           N1  N2  N3  N4  N5        │                    │
│     │            │   │   │   │   │        │                    │
│     │  ESCROW_LOCK (with MPC shares)      │                    │
│     │ ─────────► │   │   │   │   │        │                    │
│     │            │   │   │   │   │        │                    │
│     │  Each node stores their share       │                    │
│     │            │   │   │   │   │        │                    │
│     │                                     │                    │
│     │         ... trade happens ...       │                    │
│     │                                     │                    │
│     │  ESCROW_RELEASE_REQ (to: buyer)     │                    │
│     │ ─────────► │   │   │   │   │ ◄───── │                    │
│     │            │   │   │   │   │        │                    │
│     │  Nodes verify trade completed       │                    │
│     │  3 of 5 sign release                │                    │
│     │            │   │   │   │   │        │                    │
│     │       RELEASE_SIG  RELEASE_SIG      │                    │
│     │ ◄───────── │   │   │   ────────────►│                    │
│     │            │       │                │                    │
│     │                    │                │                    │
│     │  Combined signature releases funds  │                    │
│     │            └───────┴───────────────►│                    │
│     │                                     │                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Dispute Protocol

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISPUTE FLOW                                 │
│                                                                 │
│  Hour 0:   Party raises DISPUTE_RAISE                          │
│            └─► Trade frozen, escrow locked                      │
│            └─► Both parties notified                            │
│            └─► 5 voters randomly selected (rep > 200)           │
│                                                                 │
│  Hour 0-24: Evidence submission                                 │
│            └─► Both parties submit DISPUTE_EVIDENCE             │
│            └─► Screenshots, tx refs, chat logs                  │
│            └─► Evidence encrypted, only voters can see          │
│                                                                 │
│  Hour 24:  Evidence deadline                                    │
│            └─► No more evidence accepted                        │
│            └─► Voters sent DISPUTE_VOTE_REQ                     │
│                                                                 │
│  Hour 24-72: Voting period                                      │
│            └─► Voters review evidence                           │
│            └─► Voters submit DISPUTE_VOTE                       │
│            └─► Options: FAVOR_BUYER, FAVOR_SELLER, INCONCLUSIVE │
│                                                                 │
│  Hour 72:  Resolution                                           │
│            └─► Majority (3 of 5) determines outcome             │
│            └─► DISPUTE_RESULT broadcast                         │
│            └─► Escrow released to winner                        │
│            └─► Loser penalized (-20 rep)                        │
│            └─► Voters rewarded (+1 if majority, -2 if abstain)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Storage

### DHT Keys

Data is stored in CyxWiz DHT with structured keys:

```
Key format: <type>:<network_id>:<identifier>

Types:
- order:<network_id>:<order_id>      → Order data
- trade:<network_id>:<trade_id>      → Trade data
- user:<network_id>:<pubkey>         → User profile + reputation
- vouch:<network_id>:<vouched_key>   → Vouch record
- escrow:<network_id>:<escrow_id>    → Escrow state
- dispute:<network_id>:<dispute_id>  → Dispute data

Index keys (for listing):
- orders:<network_id>:buy:<currency>   → List of buy order IDs
- orders:<network_id>:sell:<currency>  → List of sell order IDs
- trades:<network_id>:<pubkey>         → User's trade history
```

### Local Storage

Each node maintains local SQLite database:

```sql
-- My networks
CREATE TABLE networks (
    id BLOB PRIMARY KEY,
    name TEXT,
    config BLOB,
    joined_at INTEGER
);

-- My orders
CREATE TABLE my_orders (
    id BLOB PRIMARY KEY,
    network_id BLOB,
    data BLOB,
    status INTEGER,
    created_at INTEGER
);

-- My trades
CREATE TABLE my_trades (
    id BLOB PRIMARY KEY,
    network_id BLOB,
    order_id BLOB,
    counterparty BLOB,
    role INTEGER,
    data BLOB,
    state INTEGER,
    created_at INTEGER,
    updated_at INTEGER
);

-- Cached reputation
CREATE TABLE reputation_cache (
    pubkey BLOB,
    network_id BLOB,
    reputation INTEGER,
    data BLOB,
    cached_at INTEGER,
    PRIMARY KEY (pubkey, network_id)
);

-- Chat messages
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    trade_id BLOB,
    sender BLOB,
    content BLOB,  -- Encrypted
    sent_at INTEGER,
    read INTEGER
);
```

---

## Security Considerations

### Encryption

| Data | Encryption |
|------|------------|
| Messages in transit | CyxWiz onion routing (XChaCha20-Poly1305) |
| Payment details | X25519 ECDH + XChaCha20-Poly1305 to counterparty |
| Dispute evidence | Encrypted to voter pubkeys only |
| Local storage | Optional full-disk encryption |

### Key Management

```
Identity keypair: Ed25519 (signing)
Encryption keypair: X25519 (ECDH)

Key derivation:
- Master seed (256 bits, user-generated or random)
- Identity key = Ed25519_keygen(HKDF(seed, "identity"))
- Encryption key = X25519_keygen(HKDF(seed, "encryption"))

Backup: BIP39 mnemonic of master seed
```

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Man-in-the-middle | All messages signed, onion routing |
| Replay attacks | Nonces, timestamps, signatures |
| Sybil attacks | Vouching cost, vouch chain analysis |
| Escrow theft | 3-of-5 MPC, no single point of failure |
| Deanonymization | Onion routing, no IP logging |
| Key compromise | Key rotation, forward secrecy |

---

## API (Daemon Commands)

### Network Commands

```bash
/network create <name>              # Create new network
/network join <invite_code>         # Request to join
/network leave                      # Leave current network
/network info                       # Show network details
/network members                    # List members
```

### Trading Commands

```bash
/order buy <amount> <crypto> for <amount> <fiat>   # Create buy order
/order sell <amount> <crypto> for <amount> <fiat>  # Create sell order
/order list [currency]                              # List orders
/order cancel <order_id>                            # Cancel order

/trade <order_id> [amount]          # Initiate trade
/trade status <trade_id>            # Check trade status
/trade fiat-sent <trade_id>         # Mark fiat as sent
/trade confirm <trade_id>           # Confirm fiat received
/trade cancel <trade_id>            # Cancel (before escrow)
/trade dispute <trade_id> <reason>  # Raise dispute
```

### Reputation Commands

```bash
/rep [pubkey]                       # Show reputation
/rep history [pubkey]               # Trade history
/vouch <pubkey>                     # Vouch for user
/vouch withdraw <pubkey>            # Withdraw vouch
/vouch chain <pubkey>               # Show vouch chain
```

### Wallet Commands

```bash
/wallet                             # Show balances
/wallet deposit <currency>          # Get deposit address
/wallet withdraw <amount> <address> # Withdraw funds
```

---

## Next Steps

1. [ ] Implement core data structures in C
2. [ ] Implement message serialization/deserialization
3. [ ] Implement trade state machine
4. [ ] Implement simple escrow (2-of-2)
5. [ ] Integrate with CyxWiz DHT for storage
6. [ ] Implement reputation calculation
7. [ ] Build CLI daemon
8. [ ] Test with simulated trades
