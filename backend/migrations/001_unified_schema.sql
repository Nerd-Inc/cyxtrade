-- ============================================================================
-- CyxTrade Unified Database Schema
-- Migration 001: Initial Schema
-- ============================================================================
-- This creates the unified schema for both Lite and Pro modes
-- Run with: psql -d cyxtrade -f 001_unified_schema.sql
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    phone_verified BOOLEAN DEFAULT false,
    phone_verified_at TIMESTAMP,
    public_key VARCHAR(64) UNIQUE,
    public_key_fingerprint VARCHAR(16),
    key_registered_at TIMESTAMP,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    email VARCHAR(255) UNIQUE,
    country_code VARCHAR(3),
    preferred_currency VARCHAR(3) DEFAULT 'USD',
    is_trader BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    suspended_reason TEXT,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_public_key ON users(public_key);
CREATE INDEX idx_users_fingerprint ON users(public_key_fingerprint);

-- ============================================================================
-- 2. TRADERS
-- ============================================================================
CREATE TABLE traders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
    tier VARCHAR(20) DEFAULT 'starter' CHECK (tier IN ('observer', 'starter', 'verified', 'trusted', 'anchor')),
    bond_amount DECIMAL(18,8) DEFAULT 0,
    bond_locked DECIMAL(18,8) DEFAULT 0,
    bond_currency VARCHAR(10) DEFAULT 'USDT',
    name VARCHAR(100),
    bio TEXT,
    rating DECIMAL(3,2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
    total_trades INTEGER DEFAULT 0,
    completed_trades INTEGER DEFAULT 0,
    total_volume DECIMAL(18,2) DEFAULT 0,
    is_online BOOLEAN DEFAULT false,
    last_online_at TIMESTAMP,
    avg_release_time_mins DECIMAL(6,2),
    avg_pay_time_mins DECIMAL(6,2),
    positive_feedback INTEGER DEFAULT 0,
    negative_feedback INTEGER DEFAULT 0,
    trades_30d INTEGER DEFAULT 0,
    completion_rate_30d DECIMAL(5,2),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_traders_user_id ON traders(user_id);
CREATE INDEX idx_traders_wallet_address ON traders(wallet_address);
CREATE INDEX idx_traders_status ON traders(status);
CREATE INDEX idx_traders_is_online ON traders(is_online);

-- ============================================================================
-- 3. TRADER PAYMENT METHODS
-- ============================================================================
CREATE TABLE trader_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    method_type VARCHAR(20) NOT NULL CHECK (method_type IN ('bank', 'mobile_money', 'cash')),
    provider VARCHAR(50),
    currency VARCHAR(3) NOT NULL,
    account_holder_name VARCHAR(100),
    phone_number VARCHAR(20),
    phone_country_code VARCHAR(5),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    iban VARCHAR(34),
    swift_code VARCHAR(11),
    routing_number VARCHAR(20),
    branch_code VARCHAR(20),
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'failed')),
    verification_code VARCHAR(10),
    verification_sent_at TIMESTAMP,
    verified_at TIMESTAMP,
    verification_proof_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_trader_id ON trader_payment_methods(trader_id);
CREATE INDEX idx_payment_methods_currency ON trader_payment_methods(currency);

-- ============================================================================
-- 4. ADS (Unified - Lite corridors + Pro P2P ads)
-- ============================================================================
CREATE TABLE ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    mode VARCHAR(10) NOT NULL CHECK (mode IN ('lite', 'pro')),
    type VARCHAR(4) NOT NULL CHECK (type IN ('buy', 'sell')),
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    asset VARCHAR(10),  -- Pro only: USDT, BTC, etc.
    price_type VARCHAR(10) DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'floating')),
    price DECIMAL(18,8) NOT NULL,
    floating_margin DECIMAL(5,2),  -- Pro only
    total_amount DECIMAL(18,8),    -- Pro only
    available_amount DECIMAL(18,8), -- Pro only
    min_limit DECIMAL(18,2) NOT NULL,
    max_limit DECIMAL(18,2) NOT NULL,
    payment_time_limit INTEGER DEFAULT 15,
    terms TEXT,
    terms_tags TEXT[],
    auto_reply TEXT,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'closed')),
    is_promoted BOOLEAN DEFAULT false,
    promoted_until TIMESTAMP,
    region_restrictions TEXT[],
    counterparty_conditions JSONB,
    order_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

CREATE INDEX idx_ads_trader_id ON ads(trader_id);
CREATE INDEX idx_ads_mode ON ads(mode);
CREATE INDEX idx_ads_status ON ads(status);
CREATE INDEX idx_ads_currencies ON ads(from_currency, to_currency);
CREATE INDEX idx_ads_mode_status ON ads(mode, status) WHERE status = 'online';

-- ============================================================================
-- 5. AD PAYMENT METHODS (Junction table)
-- ============================================================================
CREATE TABLE ad_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    payment_method_id UUID NOT NULL REFERENCES trader_payment_methods(id) ON DELETE CASCADE,
    is_recommended BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(ad_id, payment_method_id)
);

-- ============================================================================
-- 6. ORDERS (Unified - Lite trades + Pro P2P orders)
-- ============================================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    mode VARCHAR(10) NOT NULL CHECK (mode IN ('lite', 'pro')),
    type VARCHAR(4) CHECK (type IN ('buy', 'sell')),  -- Pro only
    user_id UUID NOT NULL REFERENCES users(id),
    trader_id UUID NOT NULL REFERENCES traders(id),
    ad_id UUID REFERENCES ads(id),  -- Pro only
    payment_method_id UUID REFERENCES trader_payment_methods(id),

    -- Amounts
    send_currency VARCHAR(10) NOT NULL,
    send_amount DECIMAL(18,8) NOT NULL,
    receive_currency VARCHAR(10) NOT NULL,
    receive_amount DECIMAL(18,8) NOT NULL,
    rate DECIMAL(18,8) NOT NULL,
    fee_amount DECIMAL(18,8) DEFAULT 0,
    fee_currency VARCHAR(10),

    -- Pro: Crypto details
    asset VARCHAR(10),
    crypto_amount DECIMAL(18,8),

    -- Lite: Recipient details
    recipient_name VARCHAR(100),
    recipient_phone VARCHAR(20),
    recipient_bank VARCHAR(100),
    recipient_account VARCHAR(50),

    -- Status & Lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'paid', 'delivering', 'releasing',
        'released', 'completed', 'cancelled', 'disputed', 'expired'
    )),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    paid_at TIMESTAMP,
    delivered_at TIMESTAMP,
    released_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(id),
    cancel_reason TEXT,

    -- Payment proof
    payment_reference VARCHAR(100),
    payment_proof_url VARCHAR(500),

    -- Escrow (Pro)
    escrow_amount DECIMAL(18,8),
    escrow_asset VARCHAR(10),
    escrow_locked_at TIMESTAMP,
    escrow_released_at TIMESTAMP,
    escrow_tx_id VARCHAR(100),

    -- Bond (Lite)
    bond_locked DECIMAL(18,8),

    -- Metadata
    auto_reply_sent BOOLEAN DEFAULT false,
    notes TEXT
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_trader_id ON orders(trader_id);
CREATE INDEX idx_orders_ad_id ON orders(ad_id);
CREATE INDEX idx_orders_mode ON orders(mode);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_mode_status ON orders(mode, status);

-- ============================================================================
-- 7. MESSAGES (Unified chat)
-- ============================================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system', 'payment_proof')),
    content TEXT,
    image_url VARCHAR(500),
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_order_id ON messages(order_id);
CREATE INDEX idx_messages_created_at ON messages(order_id, created_at);

-- ============================================================================
-- 8. FEEDBACK (Unified ratings)
-- ============================================================================
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_trader_id UUID NOT NULL REFERENCES traders(id),
    rating_type VARCHAR(10) NOT NULL CHECK (rating_type IN ('numeric', 'binary')),
    rating_value INTEGER NOT NULL,
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(order_id, from_user_id),
    CONSTRAINT valid_rating CHECK (
        (rating_type = 'numeric' AND rating_value BETWEEN 1 AND 5) OR
        (rating_type = 'binary' AND rating_value IN (0, 1))
    )
);

CREATE INDEX idx_feedback_order_id ON feedback(order_id);
CREATE INDEX idx_feedback_to_trader ON feedback(to_trader_id);

-- ============================================================================
-- 9. DISPUTES
-- ============================================================================
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'evidence', 'arbitration', 'resolved')),
    resolution VARCHAR(20) CHECK (resolution IN ('buyer_wins', 'seller_wins', 'split', 'cancelled')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    evidence_deadline TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_disputes_order_id ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ============================================================================
-- 10. DISPUTE EVIDENCE
-- ============================================================================
CREATE TABLE dispute_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES users(id),
    evidence_type VARCHAR(20) NOT NULL CHECK (evidence_type IN ('screenshot', 'document', 'message', 'other')),
    title VARCHAR(200),
    description TEXT,
    file_url VARCHAR(500),
    file_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_evidence_dispute_id ON dispute_evidence(dispute_id);

-- ============================================================================
-- 11. SUPPORTED ASSETS (Pro)
-- ============================================================================
CREATE TABLE supported_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('crypto', 'fiat')),
    network VARCHAR(20),
    contract_address VARCHAR(64),
    decimals INTEGER DEFAULT 8,
    min_deposit DECIMAL(18,8),
    min_withdrawal DECIMAL(18,8),
    withdrawal_fee DECIMAL(18,8),
    is_active BOOLEAN DEFAULT true,
    icon_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default assets
INSERT INTO supported_assets (symbol, name, type, network, decimals, min_deposit, min_withdrawal, withdrawal_fee, is_active) VALUES
('USDT', 'Tether USD', 'crypto', 'TRC20', 6, 10, 10, 1, true),
('USDC', 'USD Coin', 'crypto', 'TRC20', 6, 10, 10, 1, true),
('BTC', 'Bitcoin', 'crypto', 'BTC', 8, 0.0001, 0.0001, 0.00005, true),
('TRX', 'Tron', 'crypto', 'TRC20', 6, 10, 10, 1, true),
('USD', 'US Dollar', 'fiat', NULL, 2, NULL, NULL, NULL, true),
('EUR', 'Euro', 'fiat', NULL, 2, NULL, NULL, NULL, true),
('AED', 'UAE Dirham', 'fiat', NULL, 2, NULL, NULL, NULL, true),
('XAF', 'CFA Franc', 'fiat', NULL, 0, NULL, NULL, NULL, true);

-- ============================================================================
-- 12. USER WALLETS (Pro)
-- ============================================================================
CREATE TABLE user_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset VARCHAR(10) NOT NULL,
    available_balance DECIMAL(18,8) DEFAULT 0 CHECK (available_balance >= 0),
    locked_balance DECIMAL(18,8) DEFAULT 0 CHECK (locked_balance >= 0),
    total_deposited DECIMAL(18,8) DEFAULT 0,
    total_withdrawn DECIMAL(18,8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, asset)
);

CREATE INDEX idx_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_wallets_user_asset ON user_wallets(user_id, asset);

-- ============================================================================
-- 13. WALLET TRANSACTIONS (Pro)
-- ============================================================================
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    asset VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN (
        'deposit', 'withdrawal', 'escrow_lock', 'escrow_release',
        'escrow_refund', 'trade_fee', 'transfer'
    )),
    amount DECIMAL(18,8) NOT NULL,
    fee DECIMAL(18,8) DEFAULT 0,
    balance_before DECIMAL(18,8),
    balance_after DECIMAL(18,8),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    reference_type VARCHAR(20),
    reference_id UUID,
    tx_hash VARCHAR(100),
    from_address VARCHAR(100),
    to_address VARCHAR(100),
    network VARCHAR(20),
    confirmations INTEGER DEFAULT 0,
    required_confirmations INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX idx_wallet_tx_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_tx_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_tx_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_tx_reference ON wallet_transactions(reference_type, reference_id);

-- ============================================================================
-- 14. DEPOSIT ADDRESSES (Pro)
-- ============================================================================
CREATE TABLE deposit_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset VARCHAR(10) NOT NULL,
    network VARCHAR(20) NOT NULL,
    address VARCHAR(100) NOT NULL,
    memo VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, asset, network)
);

-- ============================================================================
-- 15. BLOCKED USERS (Pro)
-- ============================================================================
CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id),
    CHECK(blocker_id != blocked_id)
);

-- ============================================================================
-- 16. TRADER FOLLOWS (Pro)
-- ============================================================================
CREATE TABLE trader_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(follower_id, trader_id)
);

-- ============================================================================
-- 17. OTP CODES
-- ============================================================================
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) DEFAULT 'login' CHECK (purpose IN ('login', 'verify', 'reset')),
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_codes(phone);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);

-- ============================================================================
-- 18. NOTIFICATIONS
-- ============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Order number generator
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

-- Auto-set order number
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

-- Update ad available amount (Pro)
CREATE OR REPLACE FUNCTION update_ad_available_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.ad_id IS NOT NULL AND NEW.mode = 'pro' THEN
        UPDATE ads
        SET available_amount = available_amount - COALESCE(NEW.crypto_amount, 0),
            order_count = order_count + 1,
            updated_at = NOW()
        WHERE id = NEW.ad_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.ad_id IS NOT NULL AND NEW.mode = 'pro' THEN
        UPDATE ads
        SET available_amount = available_amount + COALESCE(NEW.crypto_amount, 0),
            updated_at = NOW()
        WHERE id = NEW.ad_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ad_available
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_ad_available_amount();

-- Update trader stats on order completion
CREATE OR REPLACE FUNCTION update_trader_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE traders
        SET completed_trades = completed_trades + 1,
            total_trades = total_trades + 1,
            total_volume = total_volume + COALESCE(NEW.send_amount, 0),
            updated_at = NOW()
        WHERE id = NEW.trader_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trader_stats
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_trader_stats();

-- Update trader rating on feedback
CREATE OR REPLACE FUNCTION update_trader_rating()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
BEGIN
    -- Calculate weighted average
    SELECT AVG(
        CASE
            WHEN rating_type = 'numeric' THEN rating_value::DECIMAL
            WHEN rating_type = 'binary' AND rating_value = 1 THEN 5.0
            WHEN rating_type = 'binary' AND rating_value = 0 THEN 1.0
        END
    ) INTO avg_rating
    FROM feedback
    WHERE to_trader_id = NEW.to_trader_id;

    UPDATE traders
    SET rating = COALESCE(avg_rating, 5.00),
        updated_at = NOW()
    WHERE id = NEW.to_trader_id;

    -- Update Pro binary feedback counts
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

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_traders_updated_at BEFORE UPDATE ON traders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_payment_methods_updated_at BEFORE UPDATE ON trader_payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_ads_updated_at BEFORE UPDATE ON ads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_wallets_updated_at BEFORE UPDATE ON user_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- DONE
-- ============================================================================
-- Schema version: 1.0.0
-- Tables: 18
-- Triggers: 10
-- Functions: 6
-- ============================================================================
