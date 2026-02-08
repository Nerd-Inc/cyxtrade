-- Migration: Keypair Authentication + Payment Verification
-- Date: 2026-02-08
-- Description: Add public key auth, payment method verification, and blacklist

-- ============================================
-- 1. Users table: Add keypair authentication
-- ============================================

-- Add public key columns (make phone optional)
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key VARCHAR(64) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key_fingerprint VARCHAR(16);
ALTER TABLE users ADD COLUMN IF NOT EXISTS key_registered_at TIMESTAMP;

-- Make phone optional (no longer required for keypair auth)
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Create indexes for public key lookup
CREATE INDEX IF NOT EXISTS idx_users_public_key ON users(public_key);
CREATE INDEX IF NOT EXISTS idx_users_fingerprint ON users(public_key_fingerprint);

-- ============================================
-- 2. Payment methods: Add verification fields
-- ============================================

ALTER TABLE trader_payment_methods ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified';
-- Values: unverified, pending, verified, rejected, expired

ALTER TABLE trader_payment_methods ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10);
ALTER TABLE trader_payment_methods ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMP;
ALTER TABLE trader_payment_methods ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE trader_payment_methods ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;
ALTER TABLE trader_payment_methods ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP;
ALTER TABLE trader_payment_methods ADD COLUMN IF NOT EXISTS verification_proof_url VARCHAR(500);

-- Index for verification status lookups
CREATE INDEX IF NOT EXISTS idx_payment_methods_verification ON trader_payment_methods(trader_id, verification_status);

-- ============================================
-- 3. Blacklist table for scammer payment methods
-- ============================================

CREATE TABLE IF NOT EXISTS payment_method_blacklist (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    method_type     VARCHAR(20) NOT NULL,  -- 'bank', 'mobile_money'
    identifier      VARCHAR(100) NOT NULL, -- phone number or account number
    reason          VARCHAR(500),
    evidence_url    VARCHAR(500),          -- Screenshot or proof
    reported_by     UUID REFERENCES users(id),
    trade_id        UUID REFERENCES trades(id),  -- Related trade if any
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(method_type, identifier)
);

CREATE INDEX IF NOT EXISTS idx_blacklist_identifier ON payment_method_blacklist(identifier);
CREATE INDEX IF NOT EXISTS idx_blacklist_method_type ON payment_method_blacklist(method_type);

-- ============================================
-- 4. Trades table: Add payment sender info
-- ============================================

ALTER TABLE trades ADD COLUMN IF NOT EXISTS payment_sender_name VARCHAR(100);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS payment_sender_account VARCHAR(100);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS payment_method_used VARCHAR(50);

-- ============================================
-- 5. Mark existing payment methods as legacy verified
-- ============================================

-- For existing traders, mark their current payment methods as verified
-- so they don't lose access during migration
UPDATE trader_payment_methods
SET verification_status = 'verified',
    verified_at = created_at
WHERE verification_status = 'unverified'
  AND is_active = TRUE;

-- Done!
