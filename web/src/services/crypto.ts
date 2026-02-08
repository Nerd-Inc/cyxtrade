import * as ed from '@noble/ed25519';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// Configure sha512 for ed25519 using Web Crypto API
// @ts-expect-error - noble/ed25519 needs sha512 configured
ed.etc.sha512Async = async (...messages: Uint8Array[]): Promise<Uint8Array> => {
  const data = ed.etc.concatBytes(...messages);
  // Create a new ArrayBuffer from the data to satisfy TypeScript
  const buffer = new ArrayBuffer(data.length);
  new Uint8Array(buffer).set(data);
  const hash = await crypto.subtle.digest('SHA-512', buffer);
  return new Uint8Array(hash);
};

interface CyxTradeKeyDB extends DBSchema {
  keys: {
    key: string;
    value: {
      privateKey: Uint8Array;
      publicKey: Uint8Array;
      createdAt: number;
    };
  };
}

export interface Identity {
  publicKey: string;
  fingerprint: string;
  createdAt: Date;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

class CryptoService {
  private db: IDBPDatabase<CyxTradeKeyDB> | null = null;
  private privateKey: Uint8Array | null = null;
  private publicKey: Uint8Array | null = null;

  private async getDB(): Promise<IDBPDatabase<CyxTradeKeyDB>> {
    if (!this.db) {
      this.db = await openDB<CyxTradeKeyDB>('cyxtrade-keys', 1, {
        upgrade(db) {
          db.createObjectStore('keys');
        },
      });
    }
    return this.db;
  }

  async getOrCreateIdentity(): Promise<Identity> {
    // Try to load from IndexedDB
    const stored = await this.loadFromStorage();
    if (stored) {
      this.privateKey = stored.privateKey;
      this.publicKey = stored.publicKey;
      return this.getIdentity(stored.createdAt);
    }

    // Generate new keypair
    return await this.generateNewIdentity();
  }

  private async generateNewIdentity(): Promise<Identity> {
    // Generate random private key (32 bytes)
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    this.privateKey = randomBytes;

    // Derive public key
    this.publicKey = await ed.getPublicKeyAsync(this.privateKey!);

    const createdAt = Date.now();
    await this.saveToStorage(createdAt);

    return this.getIdentity(createdAt);
  }

  private getIdentity(createdAt: number): Identity {
    if (!this.publicKey) {
      throw new Error('No identity loaded');
    }

    const publicKeyHex = bytesToHex(this.publicKey);
    const fingerprint = publicKeyHex.substring(0, 16);

    return {
      publicKey: publicKeyHex,
      fingerprint,
      createdAt: new Date(createdAt),
    };
  }

  async signChallenge(challenge: string): Promise<string> {
    if (!this.privateKey) {
      throw new Error('No private key loaded. Call getOrCreateIdentity first.');
    }

    const message = hexToBytes(challenge);
    const signature = await ed.signAsync(message, this.privateKey);
    return bytesToHex(signature);
  }

  private async loadFromStorage(): Promise<{
    privateKey: Uint8Array;
    publicKey: Uint8Array;
    createdAt: number;
  } | null> {
    try {
      const db = await this.getDB();
      const stored = await db.get('keys', 'identity');
      if (stored) {
        return {
          privateKey: stored.privateKey,
          publicKey: stored.publicKey,
          createdAt: stored.createdAt,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private async saveToStorage(createdAt: number): Promise<void> {
    if (!this.privateKey || !this.publicKey) {
      throw new Error('No keys to save');
    }

    const db = await this.getDB();
    await db.put('keys', {
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      createdAt,
    }, 'identity');
  }

  async hasIdentity(): Promise<boolean> {
    const stored = await this.loadFromStorage();
    return stored !== null;
  }

  async clearIdentity(): Promise<void> {
    const db = await this.getDB();
    await db.delete('keys', 'identity');
    this.privateKey = null;
    this.publicKey = null;
  }

  // Export private key as hex (for backup display)
  async exportPrivateKey(): Promise<string | null> {
    if (!this.privateKey) {
      const stored = await this.loadFromStorage();
      if (!stored) return null;
      return bytesToHex(stored.privateKey);
    }
    return bytesToHex(this.privateKey);
  }

  // Import from private key hex
  async importFromPrivateKey(privateKeyHex: string): Promise<Identity> {
    if (privateKeyHex.length !== 64) {
      throw new Error('Invalid private key format. Expected 64 hex characters.');
    }

    this.privateKey = hexToBytes(privateKeyHex);
    this.publicKey = await ed.getPublicKeyAsync(this.privateKey);

    const createdAt = Date.now();
    await this.saveToStorage(createdAt);

    return this.getIdentity(createdAt);
  }
}

// Singleton instance
export const cryptoService = new CryptoService();
