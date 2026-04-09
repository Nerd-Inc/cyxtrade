import { query, queryOne } from './db';

export interface User {
  id: string;
  phone: string | null;
  phone_verified: boolean;
  public_key: string | null;
  public_key_fingerprint: string | null;
  key_registered_at: Date | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_trader: boolean;
  is_admin: boolean;
  totp_enabled: boolean;
  totp_enabled_at: Date | null;
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
  data: { display_name?: string | null; avatar_url?: string | null; username?: string | null }
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
  if (data.username !== undefined) {
    fields.push(`username = $${paramIndex++}`);
    values.push(data.username);
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

// ============================================
// USERNAME MANAGEMENT
// ============================================

// Exact reserved usernames
const RESERVED_USERNAMES = [
  'admin', 'administrator', 'cyxtrade', 'cyxwiz', 'support', 'help',
  'moderator', 'mod', 'system', 'official', 'staff', 'team', 'root',
  'null', 'undefined', 'api', 'bot', 'info', 'contact', 'security',
  'abuse', 'postmaster', 'webmaster', 'noreply', 'no_reply',
  'test', 'demo', 'example', 'anonymous', 'unknown', 'deleted',
  'suspended', 'banned', 'verified', 'unverified',
];

// Prefixes that are not allowed (case-insensitive)
const BLOCKED_PREFIXES = [
  'cyx', 'cyxwiz', 'cyxtrade',
  'binance', 'coinbase', 'kraken', 'bybit', 'okx', 'kucoin',
  'bitfinex', 'gemini', 'huobi', 'bitget', 'mexc', 'gateio',
  'paxful', 'localbitcoins', 'remitano', 'noones', 'hodlhodl',
  'wise', 'westernunion', 'moneygram', 'paypal', 'venmo', 'cashapp',
  'admin_', 'mod_', 'staff_', 'official_', 'support_', 'system_',
];

// Substrings that are not allowed anywhere in the username
const BLOCKED_SUBSTRINGS = [
  'crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft',
  'admin', 'moderator', 'official', 'support', 'helpdesk',
  'scam', 'fraud', 'phishing', 'hack', 'exploit',
  'free_money', 'freemoney', 'freebtc', 'freeusdt', 'airdrop',
  'giveaway', 'promo_code', 'promocode', 'discount',
  'whatsapp', 'telegram', 'signal_app',
  'customer_service', 'customerservice', 'tech_support', 'techsupport',
  'p2p_admin', 'p2padmin', 'exchange_', 'trading_bot',
  'guaranteed', 'profit', 'investment', 'returns',
];

// Patterns that indicate spam/impersonation
const BLOCKED_PATTERNS = [
  /^.+_official$/,     // anything_official
  /^.+_support$/,      // anything_support
  /^.+_admin$/,        // anything_admin
  /^.+_team$/,         // anything_team
  /^.+_help$/,         // anything_help
  /^real_.+/,          // real_anything
  /^the_?real_.+/,     // thereal_anything
  /^not_.+/,           // not_anything (impersonation)
  /^fake_.+/,          // fake_anything
  /(.)\1{4,}/,         // 5+ repeated chars (aaaaaaa)
  /^[a-z]{1,2}\d{6,}/, // short letters + many digits (spam: ab123456)
];

function isUsernameBlocked(username: string): { blocked: boolean; reason?: string } {
  const lower = username.toLowerCase();

  // Check exact reserved
  if (RESERVED_USERNAMES.includes(lower)) {
    return { blocked: true, reason: 'This username is reserved' };
  }

  // Check blocked prefixes
  for (const prefix of BLOCKED_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return { blocked: true, reason: 'This username contains a restricted prefix' };
    }
  }

  // Check blocked substrings
  for (const sub of BLOCKED_SUBSTRINGS) {
    if (lower.includes(sub)) {
      return { blocked: true, reason: 'This username contains a restricted word' };
    }
  }

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(lower)) {
      return { blocked: true, reason: 'This username is not allowed' };
    }
  }

  return { blocked: false };
}

export async function findUserByUsername(username: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
    [username]
  );
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  // Check blocked names
  const check = isUsernameBlocked(username);
  if (check.blocked) {
    return false;
  }

  const existing = await queryOne<{ count: number }>(
    'SELECT COUNT(*)::int as count FROM users WHERE LOWER(username) = LOWER($1)',
    [username]
  );
  return (existing?.count || 0) === 0;
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: 'Username must be at most 30 characters' };
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmed)) {
    return { valid: false, error: 'Username must start with a letter and contain only letters, numbers, and underscores' };
  }

  const check = isUsernameBlocked(trimmed);
  if (check.blocked) {
    return { valid: false, error: check.reason || 'This username is not allowed' };
  }

  return { valid: true };
}

// ============================================
// TOTP MANAGEMENT
// ============================================

export async function setTotpSecret(
  userId: string,
  encryptedSecret: string
): Promise<User | null> {
  const rows = await query<User>(
    `UPDATE users
     SET totp_secret_encrypted = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [encryptedSecret, userId]
  );
  return rows[0] || null;
}

export async function enableTotp(userId: string): Promise<User | null> {
  const rows = await query<User>(
    `UPDATE users
     SET totp_enabled = TRUE, totp_enabled_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId]
  );
  return rows[0] || null;
}

export async function disableTotp(userId: string): Promise<User | null> {
  const rows = await query<User>(
    `UPDATE users
     SET totp_enabled = FALSE, totp_secret_encrypted = NULL, totp_enabled_at = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId]
  );
  return rows[0] || null;
}

export async function getTotpSecret(userId: string): Promise<string | null> {
  const result = await queryOne<{ totp_secret_encrypted: string | null }>(
    'SELECT totp_secret_encrypted FROM users WHERE id = $1',
    [userId]
  );
  return result?.totp_secret_encrypted || null;
}
