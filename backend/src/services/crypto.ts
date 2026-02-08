/**
 * CyxTrade E2E Encryption Service
 *
 * Implements end-to-end encryption using:
 * - X25519 for key exchange (Curve25519 ECDH)
 * - XSalsa20-Poly1305 for authenticated encryption
 *
 * Based on CyxWiz protocol primitives.
 */

import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

// Re-export for convenience
export const KEY_SIZE = 32;
export const NONCE_SIZE = 24;
export const AUTH_TAG_SIZE = 16;
export const CRYPTO_OVERHEAD = NONCE_SIZE + AUTH_TAG_SIZE;

/**
 * Key pair for asymmetric encryption
 */
export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/**
 * Encrypted message format
 */
export interface EncryptedMessage {
  nonce: string;      // Base64 encoded nonce
  ciphertext: string; // Base64 encoded ciphertext
  ephemeralPubKey?: string; // Base64 encoded ephemeral public key (for one-time keys)
}

/**
 * Generate a new X25519 key pair
 */
export function generateKeyPair(): KeyPair {
  return nacl.box.keyPair();
}

/**
 * Generate key pair from seed (deterministic)
 */
export function generateKeyPairFromSeed(seed: Uint8Array): KeyPair {
  if (seed.length !== 32) {
    throw new Error('Seed must be 32 bytes');
  }
  return nacl.box.keyPair.fromSecretKey(seed);
}

/**
 * Compute shared secret from our secret key and their public key
 * Uses X25519 ECDH
 */
export function computeSharedSecret(
  ourSecretKey: Uint8Array,
  theirPublicKey: Uint8Array
): Uint8Array {
  return nacl.box.before(theirPublicKey, ourSecretKey);
}

/**
 * Encrypt a message using a pre-computed shared secret
 * Returns nonce + ciphertext
 */
export function encryptWithSharedSecret(
  message: string | Uint8Array,
  sharedSecret: Uint8Array
): EncryptedMessage {
  const messageBytes = typeof message === 'string'
    ? util.decodeUTF8(message)
    : message;

  const nonce = nacl.randomBytes(NONCE_SIZE);
  const ciphertext = nacl.secretbox(messageBytes, nonce, sharedSecret);

  return {
    nonce: util.encodeBase64(nonce),
    ciphertext: util.encodeBase64(ciphertext),
  };
}

/**
 * Decrypt a message using a pre-computed shared secret
 */
export function decryptWithSharedSecret(
  encrypted: EncryptedMessage,
  sharedSecret: Uint8Array
): string | null {
  try {
    const nonce = util.decodeBase64(encrypted.nonce);
    const ciphertext = util.decodeBase64(encrypted.ciphertext);

    const decrypted = nacl.secretbox.open(ciphertext, nonce, sharedSecret);

    if (!decrypted) {
      return null; // Decryption failed (tampering or wrong key)
    }

    return util.encodeUTF8(decrypted);
  } catch {
    return null;
  }
}

/**
 * Encrypt a message for a recipient using their public key
 * Uses ephemeral key pair for forward secrecy
 */
export function encryptForRecipient(
  message: string | Uint8Array,
  recipientPublicKey: Uint8Array
): EncryptedMessage {
  const messageBytes = typeof message === 'string'
    ? util.decodeUTF8(message)
    : message;

  // Generate ephemeral key pair for this message
  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(NONCE_SIZE);

  // Encrypt using recipient's public key and our ephemeral secret key
  const ciphertext = nacl.box(messageBytes, nonce, recipientPublicKey, ephemeral.secretKey);

  return {
    nonce: util.encodeBase64(nonce),
    ciphertext: util.encodeBase64(ciphertext),
    ephemeralPubKey: util.encodeBase64(ephemeral.publicKey),
  };
}

/**
 * Decrypt a message sent to us using our secret key
 */
export function decryptFromSender(
  encrypted: EncryptedMessage,
  ourSecretKey: Uint8Array
): string | null {
  if (!encrypted.ephemeralPubKey) {
    return null;
  }

  try {
    const nonce = util.decodeBase64(encrypted.nonce);
    const ciphertext = util.decodeBase64(encrypted.ciphertext);
    const senderPubKey = util.decodeBase64(encrypted.ephemeralPubKey);

    const decrypted = nacl.box.open(ciphertext, nonce, senderPubKey, ourSecretKey);

    if (!decrypted) {
      return null;
    }

    return util.encodeUTF8(decrypted);
  } catch {
    return null;
  }
}

/**
 * Encrypt message between two parties (both know each other's keys)
 * More efficient than ephemeral - uses pre-computed shared secret
 */
export function encryptMessage(
  message: string,
  ourSecretKey: Uint8Array,
  theirPublicKey: Uint8Array
): EncryptedMessage {
  const sharedSecret = computeSharedSecret(ourSecretKey, theirPublicKey);
  return encryptWithSharedSecret(message, sharedSecret);
}

/**
 * Decrypt message from known sender
 */
export function decryptMessage(
  encrypted: EncryptedMessage,
  ourSecretKey: Uint8Array,
  theirPublicKey: Uint8Array
): string | null {
  const sharedSecret = computeSharedSecret(ourSecretKey, theirPublicKey);
  return decryptWithSharedSecret(encrypted, sharedSecret);
}

/**
 * Sign a message using Ed25519
 * Returns signature + message combined
 */
export function sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return nacl.sign(message, secretKey);
}

/**
 * Verify and open a signed message
 * Returns the original message if valid, null if tampered
 */
export function signOpen(signedMessage: Uint8Array, publicKey: Uint8Array): Uint8Array | null {
  return nacl.sign.open(signedMessage, publicKey);
}

/**
 * Generate Ed25519 signing key pair
 */
export function generateSigningKeyPair(): nacl.SignKeyPair {
  return nacl.sign.keyPair();
}

/**
 * Hash data using SHA-512 (available in tweetnacl)
 */
export function hash(data: Uint8Array): Uint8Array {
  return nacl.hash(data);
}

/**
 * Generate random bytes
 */
export function randomBytes(length: number): Uint8Array {
  return nacl.randomBytes(length);
}

/**
 * Constant-time comparison of two byte arrays
 */
export function secureCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return nacl.verify(a, b);
}

// Utility functions
export const toBase64 = util.encodeBase64;
export const fromBase64 = util.decodeBase64;
export const toUTF8 = util.encodeUTF8;
export const fromUTF8 = util.decodeUTF8;

/**
 * Convert public key to hex string (for display/storage)
 */
export function keyToHex(key: Uint8Array): string {
  return Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert hex string back to key bytes
 */
export function hexToKey(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Derive a per-trade encryption key from shared secret + trade ID
 * Provides key separation between different trades
 */
export function deriveTradeKey(
  sharedSecret: Uint8Array,
  tradeId: string
): Uint8Array {
  const context = fromUTF8(`cyxtrade:trade:${tradeId}`);
  const combined = new Uint8Array(sharedSecret.length + context.length);
  combined.set(sharedSecret);
  combined.set(context, sharedSecret.length);

  // Use first 32 bytes of hash as derived key
  return hash(combined).slice(0, 32);
}
