-- CyxTrade Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(20) UNIQUE NOT NULL,
    phone_verified  BOOLEAN DEFAULT FALSE,
    display_name    VARCHAR(100),
    avatar_url      VARCHAR(500),
    is_trader       BOOLEAN DEFAULT FALSE,
    is_admin        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Trader profiles
CREATE TABLE traders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended, rejected
    bond_amount     DECIMAL(12,2) DEFAULT 0,
    bond_locked     DECIMAL(12,2) DEFAULT 0,
    corridors       JSONB DEFAULT '[]', -- [{from: 'AED', to: 'XAF', buyRate: 163, sellRate: 160}]
    rating          DECIMAL(3,2) DEFAULT 0,
    total_trades    INTEGER DEFAULT 0,
    is_online       BOOLEAN DEFAULT FALSE,
    approved_at     TIMESTAMP,
    approved_by     UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Trades
CREATE TABLE trades (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id),
    trader_id       UUID REFERENCES traders(id),

    -- Amounts
    send_currency   VARCHAR(3) NOT NULL,
    send_amount     DECIMAL(12,2) NOT NULL,
    receive_currency VARCHAR(3) NOT NULL,
    receive_amount  DECIMAL(12,2) NOT NULL,
    rate            DECIMAL(12,6) NOT NULL,

    -- Recipient
    recipient_name  VARCHAR(100),
    recipient_phone VARCHAR(20),
    recipient_method VARCHAR(50), -- orange_money, mtn_momo, bank, etc.

    -- Status
    status          VARCHAR(20) DEFAULT 'pending', -- pending, accepted, paid, delivering, completed, disputed, cancelled
    bond_locked     DECIMAL(12,2),

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW(),
    accepted_at     TIMESTAMP,
    paid_at         TIMESTAMP,
    delivered_at    TIMESTAMP,
    completed_at    TIMESTAMP,
    cancelled_at    TIMESTAMP,

    -- Payment details
    payment_reference VARCHAR(100),
    payment_proof_url VARCHAR(500)
);

-- Chat messages
CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id        UUID REFERENCES trades(id) ON DELETE CASCADE,
    sender_id       UUID REFERENCES users(id),
    message_type    VARCHAR(20) DEFAULT 'text', -- text, image, system
    content         TEXT,
    image_url       VARCHAR(500),
    read_at         TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Disputes
CREATE TABLE disputes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id        UUID REFERENCES trades(id),
    opened_by       UUID REFERENCES users(id),
    reason          TEXT,
    status          VARCHAR(20) DEFAULT 'open', -- open, reviewing, resolved
    resolution      VARCHAR(20), -- favor_user, favor_trader, split
    resolution_notes TEXT,
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Dispute evidence
CREATE TABLE dispute_evidence (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id      UUID REFERENCES disputes(id) ON DELETE CASCADE,
    submitted_by    UUID REFERENCES users(id),
    evidence_type   VARCHAR(20), -- screenshot, document, text
    content         TEXT,
    file_url        VARCHAR(500),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Ratings
CREATE TABLE ratings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id        UUID REFERENCES trades(id),
    from_user_id    UUID REFERENCES users(id),
    to_trader_id    UUID REFERENCES traders(id),
    rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment         TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(trade_id, from_user_id)
);

-- Bond transactions
CREATE TABLE bond_transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trader_id       UUID REFERENCES traders(id),
    type            VARCHAR(20), -- deposit, withdrawal, lock, unlock, forfeit
    amount          DECIMAL(12,2),
    balance_after   DECIMAL(12,2),
    trade_id        UUID REFERENCES trades(id),
    dispute_id      UUID REFERENCES disputes(id),
    reference       VARCHAR(100),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    created_by      UUID REFERENCES users(id)
);

-- OTP codes (for backup, primarily use Redis)
CREATE TABLE otp_codes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(20) NOT NULL,
    code            VARCHAR(6) NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    verified        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_traders_user_id ON traders(user_id);
CREATE INDEX idx_traders_status ON traders(status);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_trader_id ON trades(trader_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_created_at ON trades(created_at);
CREATE INDEX idx_chat_messages_trade_id ON chat_messages(trade_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_disputes_trade_id ON disputes(trade_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_ratings_to_trader_id ON ratings(to_trader_id);
CREATE INDEX idx_bond_transactions_trader_id ON bond_transactions(trader_id);
