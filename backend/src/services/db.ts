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
    // Create tables if they don't exist
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) UNIQUE NOT NULL,
        phone_verified BOOLEAN DEFAULT TRUE,
        display_name VARCHAR(100),
        avatar_url VARCHAR(500),
        is_trader BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS traders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
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
    await query(`CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_trades_trader_id ON trades(trader_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_chat_trade_id ON chat_messages(trade_id)`);

    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    // Don't throw - allow app to run without DB for development
  }
}

export default pool;
