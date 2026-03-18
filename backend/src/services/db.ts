import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/cyxtrade',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL');
});

pool.on('error', (err: Error) => {
  console.error('❌ PostgreSQL error:', err);
});

// Query helper
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('📝 Query:', { text: text.substring(0, 50), duration: `${duration}ms`, rows: result.rowCount });
  }

  return result.rows as T[];
}

// Single row helper
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

// Transaction helper
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  console.log('🔧 Initializing database schema...');

  try {
    // UUID helpers used by default values.
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create tables if they don't exist
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) UNIQUE,
        phone_verified BOOLEAN DEFAULT FALSE,
        public_key VARCHAR(64) UNIQUE,
        public_key_fingerprint VARCHAR(16),
        key_registered_at TIMESTAMP,
        display_name VARCHAR(100),
        avatar_url VARCHAR(500),
        is_trader BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Ensure keypair-auth columns exist on older databases.
    await query(`ALTER TABLE users ALTER COLUMN phone DROP NOT NULL`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key VARCHAR(64)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key_fingerprint VARCHAR(16)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS key_registered_at TIMESTAMP`);
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_public_key_unique ON users(public_key)`);

    await query(`
      CREATE TABLE IF NOT EXISTS traders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        wallet_address VARCHAR(42),
        status VARCHAR(20) DEFAULT 'pending',
        bond_amount DECIMAL(12,2) DEFAULT 0,
        bond_locked DECIMAL(12,2) DEFAULT 0,
        corridors JSONB DEFAULT '[]',
        rating DECIMAL(3,2) DEFAULT 0,
        total_trades INTEGER DEFAULT 0,
        is_online BOOLEAN DEFAULT FALSE,
        approved_at TIMESTAMP,
        approved_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`ALTER TABLE traders ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42)`);

    // Trader payment methods
    await query(`
      CREATE TABLE IF NOT EXISTS trader_payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
        method_type VARCHAR(20) NOT NULL,
        provider VARCHAR(50),
        account_holder_name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(20),
        phone_country_code VARCHAR(5),
        bank_name VARCHAR(100),
        account_number VARCHAR(50),
        iban VARCHAR(34),
        swift_code VARCHAR(11),
        currency VARCHAR(3),
        is_primary BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        verification_status VARCHAR(20) DEFAULT 'unverified',
        verification_code VARCHAR(10),
        verification_sent_at TIMESTAMP,
        verified_at TIMESTAMP,
        verification_attempts INTEGER DEFAULT 0,
        verification_expires_at TIMESTAMP,
        verification_proof_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        trader_id UUID REFERENCES traders(id),
        send_currency VARCHAR(3) NOT NULL,
        send_amount DECIMAL(12,2) NOT NULL,
        receive_currency VARCHAR(3) NOT NULL,
        receive_amount DECIMAL(12,2) NOT NULL,
        rate DECIMAL(12,6) NOT NULL,
        recipient_name VARCHAR(100),
        recipient_phone VARCHAR(20),
        recipient_method VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending',
        bond_locked DECIMAL(12,2),
        created_at TIMESTAMP DEFAULT NOW(),
        accepted_at TIMESTAMP,
        paid_at TIMESTAMP,
        delivered_at TIMESTAMP,
        completed_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        payment_reference VARCHAR(100),
        payment_proof_url VARCHAR(500)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id),
        message_type VARCHAR(20) DEFAULT 'text',
        content TEXT,
        image_url VARCHAR(500),
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS disputes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trade_id UUID REFERENCES trades(id),
        opened_by UUID REFERENCES users(id),
        reason TEXT,
        status VARCHAR(20) DEFAULT 'open',
        resolution VARCHAR(20),
        resolution_notes TEXT,
        resolved_by UUID REFERENCES users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS dispute_evidence (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE,
        submitted_by UUID REFERENCES users(id),
        evidence_type VARCHAR(20),
        content TEXT,
        file_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trade_id UUID REFERENCES trades(id),
        from_user_id UUID REFERENCES users(id),
        to_trader_id UUID REFERENCES traders(id),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(trade_id, from_user_id)
      )
    `);

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_public_key ON users(public_key)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_fingerprint ON users(public_key_fingerprint)`);
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_traders_wallet_address ON traders(wallet_address)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_trades_trader_id ON trades(trader_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_chat_trade_id ON chat_messages(trade_id)`);

    // ============================================
    // CyxTrade Pro Tables
    // ============================================

    // Ads table
    await query(`
      CREATE TABLE IF NOT EXISTS ads (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trader_id           UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
        type                VARCHAR(4) NOT NULL CHECK (type IN ('buy', 'sell')),
        asset               VARCHAR(10) NOT NULL DEFAULT 'USDT',
        fiat_currency       VARCHAR(3) NOT NULL,
        price_type          VARCHAR(10) NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'floating')),
        price               DECIMAL(12,6) NOT NULL,
        floating_margin     DECIMAL(5,2),
        total_amount        DECIMAL(18,8) NOT NULL,
        available_amount    DECIMAL(18,8) NOT NULL,
        min_limit           DECIMAL(12,2) NOT NULL,
        max_limit           DECIMAL(12,2) NOT NULL,
        payment_time_limit  INTEGER NOT NULL DEFAULT 15,
        terms_tags          TEXT[],
        terms               TEXT,
        auto_reply          TEXT,
        remarks             TEXT,
        status              VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'closed')),
        is_promoted         BOOLEAN DEFAULT FALSE,
        promoted_until      TIMESTAMP,
        region_restrictions TEXT[],
        counterparty_conditions JSONB,
        created_at          TIMESTAMP DEFAULT NOW(),
        updated_at          TIMESTAMP DEFAULT NOW(),
        closed_at           TIMESTAMP
      )
    `);

    // Ad payment methods
    await query(`
      CREATE TABLE IF NOT EXISTS ad_payment_methods (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ad_id               UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
        payment_method_id   UUID NOT NULL REFERENCES trader_payment_methods(id) ON DELETE CASCADE,
        is_recommended      BOOLEAN DEFAULT FALSE,
        UNIQUE(ad_id, payment_method_id)
      )
    `);

    // P2P Orders
    await query(`
      CREATE TABLE IF NOT EXISTS p2p_orders (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number        VARCHAR(20) UNIQUE NOT NULL,
        ad_id               UUID NOT NULL REFERENCES ads(id),
        user_id             UUID NOT NULL REFERENCES users(id),
        trader_id           UUID NOT NULL REFERENCES traders(id),
        type                VARCHAR(4) NOT NULL CHECK (type IN ('buy', 'sell')),
        asset               VARCHAR(10) NOT NULL DEFAULT 'USDT',
        fiat_currency       VARCHAR(3) NOT NULL,
        amount              DECIMAL(18,8) NOT NULL,
        price               DECIMAL(12,6) NOT NULL,
        total_fiat          DECIMAL(12,2) NOT NULL,
        payment_method_id   UUID REFERENCES trader_payment_methods(id),
        status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'paid', 'releasing', 'released', 'completed', 'canceled', 'disputed', 'expired')),
        payment_reference   VARCHAR(100),
        payment_proof_url   VARCHAR(500),
        auto_reply_sent     BOOLEAN DEFAULT FALSE,
        expires_at          TIMESTAMP,
        created_at          TIMESTAMP DEFAULT NOW(),
        paid_at             TIMESTAMP,
        released_at         TIMESTAMP,
        completed_at        TIMESTAMP,
        canceled_at         TIMESTAMP,
        canceled_by         UUID REFERENCES users(id),
        cancel_reason       TEXT
      )
    `);

    // P2P Messages
    await query(`
      CREATE TABLE IF NOT EXISTS p2p_messages (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id            UUID NOT NULL REFERENCES p2p_orders(id) ON DELETE CASCADE,
        sender_id           UUID NOT NULL REFERENCES users(id),
        message_type        VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system', 'payment_proof')),
        content             TEXT,
        image_url           VARCHAR(500),
        read_at             TIMESTAMP,
        created_at          TIMESTAMP DEFAULT NOW()
      )
    `);

    // Trader follows
    await query(`
      CREATE TABLE IF NOT EXISTS trader_follows (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trader_id           UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
        created_at          TIMESTAMP DEFAULT NOW(),
        UNIQUE(follower_id, trader_id)
      )
    `);

    // P2P blocked users
    await query(`
      CREATE TABLE IF NOT EXISTS p2p_blocked_users (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        blocker_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason              TEXT,
        created_at          TIMESTAMP DEFAULT NOW(),
        UNIQUE(blocker_id, blocked_id)
      )
    `);

    // P2P feedback
    await query(`
      CREATE TABLE IF NOT EXISTS p2p_feedback (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id            UUID NOT NULL REFERENCES p2p_orders(id),
        from_user_id        UUID NOT NULL REFERENCES users(id),
        to_trader_id        UUID NOT NULL REFERENCES traders(id),
        rating              VARCHAR(10) NOT NULL CHECK (rating IN ('positive', 'negative')),
        comment             TEXT,
        created_at          TIMESTAMP DEFAULT NOW(),
        UNIQUE(order_id, from_user_id)
      )
    `);

    // Pro indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_ads_trader_id ON ads(trader_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ads_type_fiat_status ON ads(type, fiat_currency, status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ad_payment_methods_ad_id ON ad_payment_methods(ad_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_p2p_orders_user_id ON p2p_orders(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_p2p_orders_trader_id ON p2p_orders(trader_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_p2p_orders_status ON p2p_orders(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_p2p_messages_order_id ON p2p_messages(order_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_p2p_feedback_to_trader ON p2p_feedback(to_trader_id)`);

    // Trader stats columns
    await query(`ALTER TABLE traders ADD COLUMN IF NOT EXISTS avg_release_time_minutes DECIMAL(6,2) DEFAULT 0`);
    await query(`ALTER TABLE traders ADD COLUMN IF NOT EXISTS avg_pay_time_minutes DECIMAL(6,2) DEFAULT 0`);
    await query(`ALTER TABLE traders ADD COLUMN IF NOT EXISTS positive_feedback_count INTEGER DEFAULT 0`);
    await query(`ALTER TABLE traders ADD COLUMN IF NOT EXISTS negative_feedback_count INTEGER DEFAULT 0`);
    await query(`ALTER TABLE traders ADD COLUMN IF NOT EXISTS trades_30d INTEGER DEFAULT 0`);
    await query(`ALTER TABLE traders ADD COLUMN IF NOT EXISTS completion_rate_30d DECIMAL(5,2) DEFAULT 100`);

    // Order number generation function
    await query(`
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
      $$ LANGUAGE plpgsql
    `);

    // Order number trigger function
    await query(`
      CREATE OR REPLACE FUNCTION set_p2p_order_number()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
          NEW.order_number := generate_p2p_order_number();
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Create trigger for order number
    await query(`DROP TRIGGER IF EXISTS trigger_set_p2p_order_number ON p2p_orders`);
    await query(`
      CREATE TRIGGER trigger_set_p2p_order_number
        BEFORE INSERT ON p2p_orders
        FOR EACH ROW
        EXECUTE FUNCTION set_p2p_order_number()
    `);

    // Ad available amount update function
    await query(`
      CREATE OR REPLACE FUNCTION update_ad_available_amount()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE ads
          SET available_amount = available_amount - NEW.amount,
              updated_at = NOW()
          WHERE id = NEW.ad_id;
        ELSIF TG_OP = 'UPDATE' THEN
          IF NEW.status IN ('canceled', 'expired') AND OLD.status NOT IN ('canceled', 'expired') THEN
            UPDATE ads
            SET available_amount = available_amount + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.ad_id;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Create trigger for ad available amount
    await query(`DROP TRIGGER IF EXISTS trigger_update_ad_available ON p2p_orders`);
    await query(`
      CREATE TRIGGER trigger_update_ad_available
        AFTER INSERT OR UPDATE ON p2p_orders
        FOR EACH ROW
        EXECUTE FUNCTION update_ad_available_amount()
    `);

    // ============================================
    // CyxTrade Pro Wallet System
    // ============================================

    // Supported assets
    await query(`
      CREATE TABLE IF NOT EXISTS supported_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        network VARCHAR(20) NOT NULL DEFAULT 'TRC20',
        contract_address VARCHAR(64),
        decimals INTEGER NOT NULL DEFAULT 6,
        min_deposit DECIMAL(18,8) DEFAULT 0,
        min_withdrawal DECIMAL(18,8) DEFAULT 0,
        withdrawal_fee DECIMAL(18,8) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        is_fiat BOOLEAN DEFAULT FALSE,
        icon_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert default assets if not exists
    await query(`
      INSERT INTO supported_assets (symbol, name, network, decimals, is_active)
      VALUES
        ('USDT', 'Tether USD', 'TRC20', 6, TRUE),
        ('USDC', 'USD Coin', 'TRC20', 6, TRUE),
        ('BTC', 'Bitcoin', 'BTC', 8, TRUE),
        ('ETH', 'Ethereum', 'ERC20', 18, TRUE),
        ('TRX', 'TRON', 'TRC20', 6, TRUE)
      ON CONFLICT (symbol) DO NOTHING
    `);

    // User wallets (balance per user per asset)
    await query(`
      CREATE TABLE IF NOT EXISTS user_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        asset VARCHAR(10) NOT NULL,
        available_balance DECIMAL(18,8) NOT NULL DEFAULT 0,
        locked_balance DECIMAL(18,8) NOT NULL DEFAULT 0,
        total_deposited DECIMAL(18,8) NOT NULL DEFAULT 0,
        total_withdrawn DECIMAL(18,8) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, asset)
      )
    `);

    // Deposit addresses (per user per asset)
    await query(`
      CREATE TABLE IF NOT EXISTS deposit_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        asset VARCHAR(10) NOT NULL,
        network VARCHAR(20) NOT NULL,
        address VARCHAR(100) NOT NULL,
        memo VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, asset, network)
      )
    `);

    // Wallet transactions
    await query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        asset VARCHAR(10) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'escrow_lock', 'escrow_release', 'escrow_transfer', 'trade_fee')),
        amount DECIMAL(18,8) NOT NULL,
        fee DECIMAL(18,8) DEFAULT 0,
        balance_before DECIMAL(18,8) NOT NULL,
        balance_after DECIMAL(18,8) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
        reference_type VARCHAR(20),
        reference_id UUID,
        tx_hash VARCHAR(100),
        from_address VARCHAR(100),
        to_address VARCHAR(100),
        network VARCHAR(20),
        confirmations INTEGER DEFAULT 0,
        required_confirmations INTEGER DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);

    // Add escrow columns to p2p_orders
    await query(`ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS escrow_asset VARCHAR(10)`);
    await query(`ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS escrow_amount DECIMAL(18,8)`);
    await query(`ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS escrow_locked_at TIMESTAMP`);
    await query(`ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMP`);
    await query(`ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS escrow_tx_id UUID`);

    // Wallet indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_user_wallets_asset ON user_wallets(asset)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_deposit_addresses_user_id ON deposit_addresses(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_deposit_addresses_address ON deposit_addresses(address)`);

    console.log('✅ Database schema initialized (including CyxTrade Pro + Wallets)');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    // Don't throw - allow app to run without DB for development
  }
}

export default pool;
