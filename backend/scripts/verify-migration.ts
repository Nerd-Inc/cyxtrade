import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  try {
    // Check tables
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('admin_roles', 'admin_audit_log', 'trader_tier_history', 'trader_restrictions')
      ORDER BY table_name
    `);

    console.log('Tables created:');
    tables.rows.forEach(r => console.log('  ✓', r.table_name));

    // Check roles
    const roles = await pool.query('SELECT id, name FROM admin_roles ORDER BY id');
    console.log('\nAdmin roles:');
    roles.rows.forEach(r => console.log('  -', r.id, ':', r.name));

    // Check if users have admin_role column
    const col = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'admin_role'
    `);
    console.log('\nusers.admin_role column:', col.rows.length > 0 ? '✓ exists' : '✗ missing');

    // Check existing admins
    const admins = await pool.query(`
      SELECT id, phone, display_name, is_admin, admin_role
      FROM users WHERE is_admin = true
    `);
    console.log('\nExisting admins:', admins.rows.length);
    admins.rows.forEach(a => console.log('  -', a.phone, '| role:', a.admin_role || 'none'));

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

verify();
