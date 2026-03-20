import { Pool, PoolClient } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/cyxtrade',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection on startup
pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL')
})

pool.on('error', (err: Error) => {
  console.error('❌ PostgreSQL error:', err)
})

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Execute a query and return all rows
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now()
  const result = await pool.query(text, params)
  const duration = Date.now() - start

  if (process.env.NODE_ENV === 'development' && process.env.LOG_QUERIES === 'true') {
    console.log('📝 Query:', { text: text.substring(0, 80), duration: `${duration}ms`, rows: result.rowCount })
  }

  return result.rows as T[]
}

/**
 * Execute a query and return single row or null
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] || null
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

/**
 * Execute a query within a transaction client
 */
export async function clientQuery<T = any>(client: PoolClient, text: string, params?: any[]): Promise<T[]> {
  const result = await client.query(text, params)
  return result.rows as T[]
}

/**
 * Execute a query within a transaction client and return single row
 */
export async function clientQueryOne<T = any>(client: PoolClient, text: string, params?: any[]): Promise<T | null> {
  const rows = await clientQuery<T>(client, text, params)
  return rows[0] || null
}

// ============================================================================
// Database Initialization
// ============================================================================

/**
 * Check if schema is initialized by checking for users table
 */
async function isSchemaInitialized(): Promise<boolean> {
  try {
    const result = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      )
    `)
    return result?.exists || false
  } catch {
    return false
  }
}

/**
 * Check if we're using unified schema (has 'orders' table instead of 'trades')
 */
async function isUnifiedSchema(): Promise<boolean> {
  try {
    const result = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'orders'
      )
    `)
    return result?.exists || false
  } catch {
    return false
  }
}

/**
 * Run migration from file
 */
async function runMigration(migrationPath: string): Promise<void> {
  console.log(`🔄 Running migration: ${path.basename(migrationPath)}`)
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  // Split by semicolons but preserve function bodies
  const statements = sql
    .split(/;(?=(?:[^']*'[^']*')*[^']*$)/g)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await query(statement)
      } catch (err: any) {
        // Ignore "already exists" errors
        if (!err.message?.includes('already exists') &&
            !err.message?.includes('duplicate key')) {
          console.error(`Migration error: ${err.message}`)
          console.error(`Statement: ${statement.substring(0, 100)}...`)
        }
      }
    }
  }
}

/**
 * Initialize database - runs migrations if needed
 */
export async function initializeDatabase(): Promise<void> {
  console.log('🔧 Initializing database...')

  try {
    // Enable required extensions
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`)
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)

    const schemaExists = await isSchemaInitialized()
    const isUnified = await isUnifiedSchema()

    if (!schemaExists) {
      // Fresh install - run unified schema migration
      console.log('📦 Fresh database detected, running unified schema migration...')

      const migrationPath = path.join(__dirname, '../../migrations/001_unified_schema.sql')
      if (fs.existsSync(migrationPath)) {
        await runMigration(migrationPath)
        console.log('✅ Unified schema migration complete')
      } else {
        console.log('⚠️ Migration file not found, running inline schema...')
        await runInlineSchema()
      }
    } else if (!isUnified) {
      // Legacy schema exists - need to migrate
      console.log('⚠️ Legacy schema detected. Run migration to upgrade.')
      console.log('   For now, running in compatibility mode...')
      // TODO: Add migration from old schema to unified schema
    } else {
      console.log('✅ Unified schema already initialized')
    }

  } catch (error) {
    console.error('❌ Failed to initialize database:', error)
    // Don't throw - allow app to run without DB for development
  }
}

/**
 * Inline schema for when migration file is not available
 * This is a subset of the full migration - enough to get started
 */
async function runInlineSchema(): Promise<void> {
  // Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      phone VARCHAR(20) UNIQUE,
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
    )
  `)

  // Traders table
  await query(`
    CREATE TABLE IF NOT EXISTS traders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      wallet_address VARCHAR(42) UNIQUE,
      status VARCHAR(20) DEFAULT 'pending',
      tier VARCHAR(20) DEFAULT 'starter',
      bond_amount DECIMAL(18,8) DEFAULT 0,
      bond_locked DECIMAL(18,8) DEFAULT 0,
      bond_currency VARCHAR(10) DEFAULT 'USDT',
      name VARCHAR(100),
      bio TEXT,
      rating DECIMAL(3,2) DEFAULT 5.00,
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
    )
  `)

  // Payment methods
  await query(`
    CREATE TABLE IF NOT EXISTS trader_payment_methods (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
      method_type VARCHAR(20) NOT NULL,
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
      verification_status VARCHAR(20) DEFAULT 'unverified',
      verification_code VARCHAR(10),
      verification_sent_at TIMESTAMP,
      verified_at TIMESTAMP,
      verification_proof_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)

  // Unified ads table
  await query(`
    CREATE TABLE IF NOT EXISTS ads (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
      mode VARCHAR(10) NOT NULL DEFAULT 'lite',
      type VARCHAR(4) NOT NULL,
      from_currency VARCHAR(10) NOT NULL,
      to_currency VARCHAR(10) NOT NULL,
      asset VARCHAR(10),
      price_type VARCHAR(10) DEFAULT 'fixed',
      price DECIMAL(18,8) NOT NULL,
      floating_margin DECIMAL(5,2),
      total_amount DECIMAL(18,8),
      available_amount DECIMAL(18,8),
      min_limit DECIMAL(18,2) NOT NULL,
      max_limit DECIMAL(18,2) NOT NULL,
      payment_time_limit INTEGER DEFAULT 15,
      terms TEXT,
      terms_tags TEXT[],
      auto_reply TEXT,
      remarks TEXT,
      status VARCHAR(20) DEFAULT 'online',
      is_promoted BOOLEAN DEFAULT false,
      promoted_until TIMESTAMP,
      region_restrictions TEXT[],
      counterparty_conditions JSONB,
      order_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      closed_at TIMESTAMP
    )
  `)

  // Unified orders table
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_number VARCHAR(20) UNIQUE NOT NULL,
      mode VARCHAR(10) NOT NULL DEFAULT 'lite',
      type VARCHAR(4),
      user_id UUID NOT NULL REFERENCES users(id),
      trader_id UUID NOT NULL REFERENCES traders(id),
      ad_id UUID REFERENCES ads(id),
      payment_method_id UUID REFERENCES trader_payment_methods(id),
      send_currency VARCHAR(10) NOT NULL,
      send_amount DECIMAL(18,8) NOT NULL,
      receive_currency VARCHAR(10) NOT NULL,
      receive_amount DECIMAL(18,8) NOT NULL,
      rate DECIMAL(18,8) NOT NULL,
      fee_amount DECIMAL(18,8) DEFAULT 0,
      fee_currency VARCHAR(10),
      asset VARCHAR(10),
      crypto_amount DECIMAL(18,8),
      recipient_name VARCHAR(100),
      recipient_phone VARCHAR(20),
      recipient_bank VARCHAR(100),
      recipient_account VARCHAR(50),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
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
      payment_reference VARCHAR(100),
      payment_proof_url VARCHAR(500),
      escrow_amount DECIMAL(18,8),
      escrow_asset VARCHAR(10),
      escrow_locked_at TIMESTAMP,
      escrow_released_at TIMESTAMP,
      escrow_tx_id VARCHAR(100),
      bond_locked DECIMAL(18,8),
      auto_reply_sent BOOLEAN DEFAULT false,
      notes TEXT
    )
  `)

  // Messages table
  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES users(id),
      message_type VARCHAR(20) DEFAULT 'text',
      content TEXT,
      image_url VARCHAR(500),
      metadata JSONB,
      is_read BOOLEAN DEFAULT false,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  // Feedback table
  await query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      from_user_id UUID NOT NULL REFERENCES users(id),
      to_trader_id UUID NOT NULL REFERENCES traders(id),
      rating_type VARCHAR(10) NOT NULL,
      rating_value INTEGER NOT NULL,
      comment TEXT,
      is_anonymous BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(order_id, from_user_id)
    )
  `)

  // Disputes table
  await query(`
    CREATE TABLE IF NOT EXISTS disputes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      opened_by UUID NOT NULL REFERENCES users(id),
      reason TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'open',
      resolution VARCHAR(20),
      resolution_notes TEXT,
      resolved_by UUID REFERENCES users(id),
      resolved_at TIMESTAMP,
      evidence_deadline TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)

  // Order number generator function
  await query(`
    CREATE OR REPLACE FUNCTION generate_order_number()
    RETURNS VARCHAR(20) AS $$
    BEGIN
      RETURN CONCAT(TO_CHAR(NOW(), 'YYYYMMDD'), LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0'));
    END;
    $$ LANGUAGE plpgsql
  `)

  // Auto-set order number trigger
  await query(`
    CREATE OR REPLACE FUNCTION set_order_number()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `)

  await query(`DROP TRIGGER IF EXISTS trigger_set_order_number ON orders`)
  await query(`
    CREATE TRIGGER trigger_set_order_number
      BEFORE INSERT ON orders
      FOR EACH ROW
      EXECUTE FUNCTION set_order_number()
  `)

  // Create indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_users_public_key ON users(public_key)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_traders_user_id ON traders(user_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_trader_id ON orders(trader_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_mode ON orders(mode)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_ads_trader_id ON ads(trader_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_ads_mode ON ads(mode)`)

  console.log('✅ Inline schema initialized')
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check database connectivity
 */
export async function checkHealth(): Promise<{ connected: boolean; latency: number }> {
  const start = Date.now()
  try {
    await queryOne('SELECT 1')
    return { connected: true, latency: Date.now() - start }
  } catch {
    return { connected: false, latency: Date.now() - start }
  }
}

export default pool
