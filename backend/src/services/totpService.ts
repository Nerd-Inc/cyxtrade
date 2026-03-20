/**
 * TOTP Service
 * Google Authenticator / TOTP support for two-factor authentication
 */

import * as otplib from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { query, queryOne } from './db';

// Master encryption key from environment (reuse same key as encryption service)
const MASTER_KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : null;

const APP_NAME = 'CyxTrade';

/**
 * Derive a per-user key for TOTP secret encryption
 */
function deriveUserKey(userId: string): Uint8Array {
  if (!MASTER_KEY) {
    throw new Error('Encryption not configured (ENCRYPTION_KEY)');
  }
  const hmac = crypto.createHmac('sha256', MASTER_KEY);
  hmac.update(`totp:${userId}`);
  return new Uint8Array(hmac.digest());
}

/**
 * Encrypt TOTP secret before storing
 */
export function encryptTotpSecret(secret: string, userId: string): string {
  if (!MASTER_KEY) {
    // Development mode - store as-is (not recommended for production)
    return secret;
  }

  const key = deriveUserKey(userId);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageUint8 = new TextEncoder().encode(secret);

  const encrypted = nacl.secretbox(messageUint8, nonce, key);

  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);

  return encodeBase64(combined);
}

/**
 * Decrypt TOTP secret for verification
 */
export function decryptTotpSecret(encrypted: string, userId: string): string {
  if (!MASTER_KEY) {
    return encrypted;
  }

  try {
    const key = deriveUserKey(userId);
    const combined = decodeBase64(encrypted);

    const nonce = combined.slice(0, nacl.secretbox.nonceLength);
    const ciphertext = combined.slice(nacl.secretbox.nonceLength);

    const decrypted = nacl.secretbox.open(ciphertext, nonce, key);

    if (!decrypted) {
      throw new Error('Decryption failed');
    }

    return new TextDecoder().decode(decrypted);
  } catch {
    // Fallback for unencrypted data
    return encrypted;
  }
}

/**
 * Generate a new TOTP secret
 */
export function generateSecret(): string {
  return otplib.generateSecret();
}

/**
 * Generate QR code data URL for Google Authenticator
 */
export async function generateQRCode(
  secret: string,
  username: string
): Promise<string> {
  const otpauth = otplib.generateURI({
    secret,
    label: username,
    issuer: APP_NAME,
  });
  return await QRCode.toDataURL(otpauth);
}

/**
 * Verify a TOTP token
 */
export function verifyToken(secret: string, token: string): boolean {
  try {
    const result = otplib.verifySync({ secret, token });
    return result?.valid === true;
  } catch {
    return false;
  }
}

// ============================================
// BACKUP CODES
// ============================================

const BACKUP_CODE_COUNT = 8;
const BACKUP_CODE_LENGTH = 8;

// Characters that are easy to read (no 0/O, 1/l/I confusion)
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate readable backup codes
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    let code = '';
    for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
      code += SAFE_CHARS[crypto.randomInt(SAFE_CHARS.length)];
    }
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a backup code for storage
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

/**
 * Save backup codes to database (hashed)
 */
export async function saveBackupCodes(
  userId: string,
  codes: string[]
): Promise<void> {
  // Delete existing unused codes
  await query('DELETE FROM user_backup_codes WHERE user_id = $1', [userId]);

  // Insert new codes
  for (const code of codes) {
    const hash = hashBackupCode(code);
    await query(
      'INSERT INTO user_backup_codes (user_id, code_hash) VALUES ($1, $2)',
      [userId, hash]
    );
  }
}

/**
 * Verify and consume a backup code
 */
export async function verifyBackupCode(
  userId: string,
  code: string
): Promise<boolean> {
  const hash = hashBackupCode(code);

  const result = await queryOne<{ id: string }>(
    `UPDATE user_backup_codes
     SET used_at = NOW()
     WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL
     RETURNING id`,
    [userId, hash]
  );

  return result !== null;
}

/**
 * Get count of remaining backup codes
 */
export async function getBackupCodeCount(userId: string): Promise<number> {
  const result = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int as count
     FROM user_backup_codes
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
  return result?.count || 0;
}

// ============================================
// TOTP VERIFICATIONS (for sensitive operations)
// ============================================

const VERIFICATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Record a TOTP verification for sensitive operations
 */
export async function recordVerification(
  userId: string,
  operation: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + VERIFICATION_WINDOW_MS);

  await query(
    `INSERT INTO totp_verifications (user_id, operation, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, operation, expiresAt, ipAddress || null, userAgent || null]
  );
}

/**
 * Check if user has a valid recent verification for an operation
 */
export async function hasValidVerification(
  userId: string,
  operation: string
): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    `SELECT id FROM totp_verifications
     WHERE user_id = $1 AND operation = $2 AND expires_at > NOW()
     ORDER BY verified_at DESC
     LIMIT 1`,
    [userId, operation]
  );
  return result !== null;
}

/**
 * Clean up expired verifications
 */
export async function cleanupExpiredVerifications(): Promise<void> {
  await query('DELETE FROM totp_verifications WHERE expires_at < NOW()');
}
