import { Pool } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ...(process.env.DATABASE_CA_CERT ? { ca: fs.readFileSync(process.env.DATABASE_CA_CERT, 'utf-8') } : {})
  } : false
});

// Test connection
pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
