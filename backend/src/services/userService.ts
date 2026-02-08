import { query, queryOne } from './db';

export interface User {
  id: string;
  phone: string | null;
  phone_verified: boolean;
  public_key: string | null;
  public_key_fingerprint: string | null;
  key_registered_at: Date | null;
  display_name: string | null;
  avatar_url: string | null;
  is_trader: boolean;
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function findUserByPhone(phone: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT * FROM users WHERE phone = $1',
    [phone]
  );
}

export async function findUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
}

export async function createUser(phone: string, isAdmin: boolean = false): Promise<User> {
  const rows = await query<User>(
    `INSERT INTO users (phone, is_admin)
     VALUES ($1, $2)
     RETURNING *`,
    [phone, isAdmin]
  );
  return rows[0];
}

export async function getOrCreateUser(phone: string, isAdmin: boolean = false): Promise<User> {
  let user = await findUserByPhone(phone);
  if (!user) {
    user = await createUser(phone, isAdmin);
  }
  return user;
}

export async function updateUser(
  id: string,
  data: { display_name?: string; avatar_url?: string }
): Promise<User | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.display_name !== undefined) {
    fields.push(`display_name = $${paramIndex++}`);
    values.push(data.display_name);
  }
  if (data.avatar_url !== undefined) {
    fields.push(`avatar_url = $${paramIndex++}`);
    values.push(data.avatar_url);
  }

  if (fields.length === 0) return findUserById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const rows = await query<User>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function setUserAsTrader(id: string): Promise<User | null> {
  const rows = await query<User>(
    `UPDATE users SET is_trader = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

// ============================================
// PUBLIC KEY AUTHENTICATION
// ============================================

export async function findUserByPublicKey(publicKey: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT * FROM users WHERE public_key = $1',
    [publicKey.toLowerCase()]
  );
}

export async function createUserWithPublicKey(
  publicKey: string,
  fingerprint: string
): Promise<User> {
  const rows = await query<User>(
    `INSERT INTO users (public_key, public_key_fingerprint, key_registered_at)
     VALUES ($1, $2, NOW())
     RETURNING *`,
    [publicKey.toLowerCase(), fingerprint]
  );
  return rows[0];
}

export async function linkPhoneToPublicKey(
  userId: string,
  phone: string
): Promise<User | null> {
  const rows = await query<User>(
    `UPDATE users
     SET phone = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [phone, userId]
  );
  return rows[0] || null;
}

export async function linkPublicKeyToUser(
  userId: string,
  publicKey: string,
  fingerprint: string
): Promise<User | null> {
  const rows = await query<User>(
    `UPDATE users
     SET public_key = $1, public_key_fingerprint = $2, key_registered_at = NOW(), updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [publicKey.toLowerCase(), fingerprint, userId]
  );
  return rows[0] || null;
}
