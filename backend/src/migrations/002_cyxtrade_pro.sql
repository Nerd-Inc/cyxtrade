-- Migration: CyxTrade Pro - P2P Trading Platform
-- Date: 2026-03-18
-- Description: Add P2P ads, orders, chat, follows, feedback tables

-- ============================================
-- 1. Ads table (Trader advertisements)
-- ============================================

CREATE TABLE IF NOT EXISTS ads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id           UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    type                VARCHAR(4) NOT NULL CHECK (type IN ('buy', 'sell')),
    asset               VARCHAR(10) NOT NULL DEFAULT 'USDT',
    fiat_currency       VARCHAR(3) NOT NULL,
    price_type          VARCHAR(10) NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'floating')),
    price               DECIMAL(12,6) NOT NULL,
    floating_margin     DECIMAL(5,2),  -- For floating price type (e.g., -2.5% or +1.5%)
    total_amount        DECIMAL(18,8) NOT NULL,
    available_amount    DECIMAL(18,8) NOT NULL,
    min_limit           DECIMAL(12,2) NOT NULL,
    max_limit           DECIMAL(12,2) NOT NULL,
    payment_time_limit  INTEGER NOT NULL DEFAULT 15,  -- minutes
    terms_tags          TEXT[],  -- Array of tags
    terms               TEXT,
    auto_reply          TEXT,
    remarks             TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'closed')),
    is_promoted         BOOLEAN DEFAULT FALSE,
    promoted_until      TIMESTAMP,
    region_restrictions TEXT[],  -- Array of region codes, NULL = all regions
    counterparty_conditions JSONB,  -- { minTrades: 10, minCompletionRate: 95, kycRequired: true }
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    closed_at           TIMESTAMP
);

-- Indexes for ads
CREATE INDEX IF NOT EXISTS idx_ads_trader_id ON ads(trader_id);
CREATE INDEX IF NOT EXISTS idx_ads_type_fiat_status ON ads(type, fiat_currency, status);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_is_promoted ON ads(is_promoted) WHERE is_promoted = TRUE;
CREATE INDEX IF NOT EXISTS idx_ads_available ON ads(available_amount) WHERE status = 'online' AND available_amount > 0;

-- ============================================
-- 2. Ad payment methods (many-to-many)
-- ============================================

CREATE TABLE IF NOT EXISTS ad_payment_methods (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id               UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    payment_method_id   UUID NOT NULL REFERENCES trader_payment_methods(id) ON DELETE CASCADE,
    is_recommended      BOOLEAN DEFAULT FALSE,
    UNIQUE(ad_id, payment_method_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_payment_methods_ad_id ON ad_payment_methods(ad_id);

-- ============================================
-- 3. P2P Orders
-- ============================================

CREATE TABLE IF NOT EXISTS p2p_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number        VARCHAR(20) UNIQUE NOT NULL,
    ad_id               UUID NOT NULL REFERENCES ads(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    trader_id           UUID NOT NULL REFERENCES traders(id),
    type                VARCHAR(4) NOT NULL CHECK (type IN ('buy', 'sell')),
    asset               VARCHAR(10) NOT NULL DEFAULT 'USDT',
    fiat_currency       VARCHAR(3) NOT NULL,
    amount              DECIMAL(18,8) NOT NULL,  -- Crypto amount
    price               DECIMAL(12,6) NOT NULL,
    total_fiat          DECIMAL(12,2) NOT NULL,
    payment_method_id   UUID REFERENCES trader_payment_methods(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid', 'releasing', 'released', 'completed', 'canceled', 'disputed', 'expired')),
    payment_reference   VARCHAR(100),
    payment_proof_url   VARCHAR(500),
    auto_reply_sent     BOOLEAN DEFAULT FALSE,
    expires_at          TIMESTAMP,  -- Order expiration (payment_time_limit from ad)
    created_at          TIMESTAMP DEFAULT NOW(),
    paid_at             TIMESTAMP,
    released_at         TIMESTAMP,
    completed_at        TIMESTAMP,
    canceled_at         TIMESTAMP,
    canceled_by         UUID REFERENCES users(id),
    cancel_reason       TEXT
);

-- Indexes for p2p_orders
CREATE INDEX IF NOT EXISTS idx_p2p_orders_user_id ON p2p_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_trader_id ON p2p_orders(trader_id);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_ad_id ON p2p_orders(ad_id);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_status ON p2p_orders(status);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_created_at ON p2p_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_order_number ON p2p_orders(order_number);

-- ============================================
-- 4. P2P Chat Messages
-- ============================================

CREATE TABLE IF NOT EXISTS p2p_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES p2p_orders(id) ON DELETE CASCADE,
    sender_id           UUID NOT NULL REFERENCES users(id),
    message_type        VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system', 'payment_proof')),
    content             TEXT,
    image_url           VARCHAR(500),
    read_at             TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p2p_messages_order_id ON p2p_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_p2p_messages_created_at ON p2p_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_p2p_messages_unread ON p2p_messages(order_id, read_at) WHERE read_at IS NULL;

-- ============================================
-- 5. Trader Follows
-- ============================================

CREATE TABLE IF NOT EXISTS trader_follows (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trader_id           UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    created_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(follower_id, trader_id)
);

CREATE INDEX IF NOT EXISTS idx_trader_follows_follower ON trader_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_trader_follows_trader ON trader_follows(trader_id);

-- ============================================
-- 6. Blocked Users (P2P)
-- ============================================

CREATE TABLE IF NOT EXISTS p2p_blocked_users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason              TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_p2p_blocked_blocker ON p2p_blocked_users(blocker_id);

-- ============================================
-- 7. P2P Feedback (ratings for orders)
-- ============================================

CREATE TABLE IF NOT EXISTS p2p_feedback (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES p2p_orders(id),
    from_user_id        UUID NOT NULL REFERENCES users(id),
    to_trader_id        UUID NOT NULL REFERENCES traders(id),
    rating              VARCHAR(10) NOT NULL CHECK (rating IN ('positive', 'negative')),
    comment             TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(order_id, from_user_id)
);

CREATE INDEX IF NOT EXISTS idx_p2p_feedback_to_trader ON p2p_feedback(to_trader_id);
CREATE INDEX IF NOT EXISTS idx_p2p_feedback_order ON p2p_feedback(order_id);

-- ============================================
-- 8. Generate order number function
-- ============================================

CREATE OR REPLACE FUNCTION generate_p2p_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    new_number VARCHAR(20);
BEGIN
    new_number := CONCAT(
        TO_CHAR(NOW(), 'YYYYMMDD'),
        LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0')
    );
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. Trigger to auto-generate order number
-- ============================================

CREATE OR REPLACE FUNCTION set_p2p_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_p2p_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_p2p_order_number ON p2p_orders;
CREATE TRIGGER trigger_set_p2p_order_number
    BEFORE INSERT ON p2p_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_p2p_order_number();

-- ============================================
-- 10. Trigger to update ad available_amount
-- ============================================

CREATE OR REPLACE FUNCTION update_ad_available_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Decrease available amount when order is placed
        UPDATE ads
        SET available_amount = available_amount - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.ad_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- If order is canceled or expired, restore the amount
        IF NEW.status IN ('canceled', 'expired') AND OLD.status NOT IN ('canceled', 'expired') THEN
            UPDATE ads
            SET available_amount = available_amount + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.ad_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ad_available ON p2p_orders;
CREATE TRIGGER trigger_update_ad_available
    AFTER INSERT OR UPDATE ON p2p_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_ad_available_amount();

-- ============================================
-- 11. Trigger to update ad status when empty
-- ============================================

CREATE OR REPLACE FUNCTION check_ad_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-close ad when available amount reaches 0
    IF NEW.available_amount <= 0 AND NEW.status = 'online' THEN
        NEW.status := 'offline';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_ad_availability ON ads;
CREATE TRIGGER trigger_check_ad_availability
    BEFORE UPDATE ON ads
    FOR EACH ROW
    EXECUTE FUNCTION check_ad_availability();

-- ============================================
-- 12. Add trader stats columns
-- ============================================

ALTER TABLE traders ADD COLUMN IF NOT EXISTS avg_release_time_minutes DECIMAL(6,2) DEFAULT 0;
ALTER TABLE traders ADD COLUMN IF NOT EXISTS avg_pay_time_minutes DECIMAL(6,2) DEFAULT 0;
ALTER TABLE traders ADD COLUMN IF NOT EXISTS positive_feedback_count INTEGER DEFAULT 0;
ALTER TABLE traders ADD COLUMN IF NOT EXISTS negative_feedback_count INTEGER DEFAULT 0;
ALTER TABLE traders ADD COLUMN IF NOT EXISTS trades_30d INTEGER DEFAULT 0;
ALTER TABLE traders ADD COLUMN IF NOT EXISTS completion_rate_30d DECIMAL(5,2) DEFAULT 100;

-- Done!
