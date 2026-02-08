/**
 * Encryption Service
 * Field-level encryption for sensitive payment method data
 *
 * Uses NaCl (TweetNaCl) secretbox for symmetric encryption.
 * Derives per-trader keys from master key using HMAC-SHA256.
 */

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import crypto from 'crypto';

// Master encryption key from environment (32 bytes = 256 bits)
const MASTER_KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : null;

/**
 * Check if encryption is configured
 */
export function isEncryptionEnabled(): boolean {
  return MASTER_KEY !== null && MASTER_KEY.length === 32;
}

/**
 * Derive a per-trader key from master key using HMAC-SHA256
 * This provides key isolation - compromising one trader's data
 * doesn't expose others
 *
 * @param traderId Trader's unique ID
 * @returns 32-byte derived key
 */
export function deriveKey(traderId: string): Uint8Array {
  if (!MASTER_KEY) {
    throw new Error('Encryption not configured');
  }

  const hmac = crypto.createHmac('sha256', MASTER_KEY);
  hmac.update(`trader:${traderId}`);
  return new Uint8Array(hmac.digest());
}

/**
 * Encrypt a string field
 *
 * @param plaintext The value to encrypt
 * @param traderId Trader's unique ID (for key derivation)
 * @returns Base64-encoded ciphertext (nonce + encrypted data)
 */
export function encryptField(plaintext: string, traderId: string): string {
  if (!isEncryptionEnabled()) {
    // Return plaintext if encryption not configured (development mode)
    return plaintext;
  }

  const key = deriveKey(traderId);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageUint8 = new TextEncoder().encode(plaintext);

  const encrypted = nacl.secretbox(messageUint8, nonce, key);

  // Combine nonce + ciphertext
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);

  return encodeBase64(combined);
}

/**
 * Decrypt a string field
 *
 * @param ciphertext Base64-encoded ciphertext (nonce + encrypted data)
 * @param traderId Trader's unique ID (for key derivation)
 * @returns Decrypted plaintext
 */
export function decryptField(ciphertext: string, traderId: string): string {
  if (!isEncryptionEnabled()) {
    // Return as-is if encryption not configured
    return ciphertext;
  }

  try {
    const key = deriveKey(traderId);
    const combined = decodeBase64(ciphertext);

    const nonce = combined.slice(0, nacl.secretbox.nonceLength);
    const encrypted = combined.slice(nacl.secretbox.nonceLength);

    const decrypted = nacl.secretbox.open(encrypted, nonce, key);

    if (!decrypted) {
      throw new Error('Decryption failed');
    }

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    // If decryption fails, the data might be unencrypted (migration scenario)
    // Return as-is and log warning
    console.warn('[Encryption] Decryption failed, data may be unencrypted');
    return ciphertext;
  }
}

/**
 * Sensitive fields that should be encrypted
 */
export const SENSITIVE_FIELDS = [
  'account_number',
  'iban',
  'phone_number',
  'account_holder_name',
] as const;

export type SensitiveField = typeof SENSITIVE_FIELDS[number];

/**
 * Encrypt sensitive fields in a payment method object
 *
 * @param data Payment method data
 * @param traderId Trader's unique ID
 * @returns Data with sensitive fields encrypted
 */
export function encryptPaymentMethod<T extends Record<string, any>>(
  data: T,
  traderId: string
): T {
  if (!isEncryptionEnabled()) {
    return data;
  }

  const result: Record<string, any> = { ...data };

  for (const field of SENSITIVE_FIELDS) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encryptField(result[field], traderId);
    }
  }

  return result as T;
}

/**
 * Decrypt sensitive fields in a payment method object
 *
 * @param data Payment method data (encrypted)
 * @param traderId Trader's unique ID
 * @returns Data with sensitive fields decrypted
 */
export function decryptPaymentMethod<T extends Record<string, any>>(
  data: T,
  traderId: string
): T {
  if (!isEncryptionEnabled()) {
    return data;
  }

  const result: Record<string, any> = { ...data };

  for (const field of SENSITIVE_FIELDS) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = decryptField(result[field], traderId);
    }
  }

  return result as T;
}

/**
 * Generate a new master encryption key
 * Use this to generate ENCRYPTION_KEY for .env
 *
 * @returns 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
