-- Migration: Add smart contract integration fields
-- Date: 2026-02-08
-- Description: Adds fields for blockchain/smart contract integration

-- ============================================
-- TRADERS TABLE
-- ============================================

-- Add wallet address for traders (Tron address)
ALTER TABLE traders ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42);

-- Add timestamp for last bond sync with contract
ALTER TABLE traders ADD COLUMN IF NOT EXISTS bond_synced_at TIMESTAMP;

-- Create index for wallet address lookups
CREATE INDEX IF NOT EXISTS idx_traders_wallet_address ON traders(wallet_address);

-- ============================================
-- TRADES TABLE
-- ============================================

-- Add contract trade ID (bytes32 hash)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS contract_trade_id VARCHAR(66);

-- Add transaction hash for trade creation
ALTER TABLE trades ADD COLUMN IF NOT EXISTS contract_tx_hash VARCHAR(66);

-- Add confirmation status
ALTER TABLE trades ADD COLUMN IF NOT EXISTS contract_confirmed BOOLEAN DEFAULT false;

-- Add contract state for sync verification
ALTER TABLE trades ADD COLUMN IF NOT EXISTS contract_state INTEGER;

-- Create index for contract trade lookups
CREATE INDEX IF NOT EXISTS idx_trades_contract_trade_id ON trades(contract_trade_id);

-- ============================================
-- DISPUTES TABLE (new or update)
-- ============================================

-- Add contract dispute ID
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS contract_dispute_id VARCHAR(66);

-- Add dispute phases
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS phase VARCHAR(20) DEFAULT 'evidence';
-- Phases: evidence, commit, reveal, resolved

-- Add deadline timestamps
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS evidence_deadline TIMESTAMP;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS commit_deadline TIMESTAMP;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS reveal_deadline TIMESTAMP;

-- Add IPFS evidence hashes
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS user_evidence_ipfs VARCHAR(100);
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS trader_evidence_ipfs VARCHAR(100);

-- Add resolution info
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolution VARCHAR(20);
-- Resolutions: favor_user, favor_trader

ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

-- ============================================
-- ARBITRATORS TABLE (new)
-- ============================================

CREATE TABLE IF NOT EXISTS arbitrators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    wallet_address VARCHAR(42) NOT NULL,
    stake_amount DECIMAL(20, 6) DEFAULT 0,
    reputation INTEGER DEFAULT 0,
    disputes_handled INTEGER DEFAULT 0,
    disputes_active INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    registered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uk_arbitrators_wallet UNIQUE (wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_arbitrators_active ON arbitrators(is_active);

-- ============================================
-- DISPUTE_VOTES TABLE (new)
-- ============================================

CREATE TABLE IF NOT EXISTS dispute_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id),
    arbitrator_id UUID NOT NULL REFERENCES arbitrators(id),
    commitment_hash VARCHAR(66),
    vote VARCHAR(20),
    -- Votes: favor_user, favor_trader
    revealed BOOLEAN DEFAULT false,
    committed_at TIMESTAMP,
    revealed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uk_dispute_votes UNIQUE (dispute_id, arbitrator_id)
);

CREATE INDEX IF NOT EXISTS idx_dispute_votes_dispute ON dispute_votes(dispute_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN traders.wallet_address IS 'Tron wallet address for bond deposits';
COMMENT ON COLUMN traders.bond_synced_at IS 'Last sync timestamp with smart contract';

COMMENT ON COLUMN trades.contract_trade_id IS 'Trade ID on smart contract (bytes32)';
COMMENT ON COLUMN trades.contract_tx_hash IS 'Transaction hash of trade creation';
COMMENT ON COLUMN trades.contract_confirmed IS 'Whether contract transaction is confirmed';
COMMENT ON COLUMN trades.contract_state IS 'Trade state from contract (for sync verification)';

COMMENT ON TABLE arbitrators IS 'Registered arbitrators for dispute resolution';
COMMENT ON TABLE dispute_votes IS 'Votes from arbitrators on disputes';
