import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdmin() {
  const phone = process.argv[2] || '+1000000000';
  const name = process.argv[3] || 'Admin User';
  const role = process.argv[4] || 'owner';

  try {
    const result = await pool.query(`
      INSERT INTO users (phone, display_name, is_admin, admin_role, created_at, updated_at)
      VALUES ($1, $2, true, $3, NOW(), NOW())
      ON CONFLICT (phone) DO UPDATE
      SET is_admin = true, admin_role = $3, display_name = COALESCE(users.display_name, $2), updated_at = NOW()
      RETURNING id, phone, display_name, is_admin, admin_role
    `, [phone, name, role]);

    console.log('');
    console.log('✓ Admin user created/updated:');
    console.log('  ID:    ', result.rows[0].id);
    console.log('  Phone: ', result.rows[0].phone);
    console.log('  Name:  ', result.rows[0].display_name);
    console.log('  Role:  ', result.rows[0].admin_role);
    console.log('');
    console.log('Login to admin panel with:', result.rows[0].phone);
    console.log('');
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
